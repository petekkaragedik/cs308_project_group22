const express = require('express');
const { generateInvoicePdfBuffer } = require('../services/invoicePdf');
const { sendInvoiceEmail } = require('../services/mailInvoice');
const { resolveBestDiscount } = require('../services/discountCalculator');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function mapCheckoutError(error) {
  if (error.code === 'ER_NO_SUCH_TABLE') {
    return 'Veritabanı tabloları eksik. backend klasöründe çalıştır: node setup.js (ardından gerekirse node seed.js).';
  }
  if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_PARSE_ERROR') {
    return 'Veritabanı şeması güncel değil. node setup.js ve products için node seed.js çalıştırıp tekrar dene.';
  }
  if (error.code === 'ER_FK_INTEG' || error.code === 'ER_NO_REFERENCED_ROW_2') {
    return 'Sipariş kaydı veritabanı kısıtıyla çakıştı. setup.js çalıştırdığından emin ol.';
  }
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return 'MySQL’e bağlanılamadı. Sunucu açık mı ve .env doğru mu?';
  }
  return 'Checkout failed. Backend terminalindeki hataya bak veya setup/seed çalıştır.';
}

function buildPayloadFromRows(orderRow, itemRows) {
  return {
    invoiceNumber: orderRow.invoice_number,
    issuedAt: orderRow.created_at,
    customerEmail: orderRow.customer_email,
    customerName: orderRow.customer_name,
    currency: orderRow.currency || 'TRY',
    total: Number(orderRow.total_amount),
    lines: itemRows.map((i) => ({
      productId: i.product_id,
      productName: i.product_name,
      color: i.color || null,
      size: i.size,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      lineTotal: Number(i.line_total),
    })),
  };
}

const CANCELLABLE_STATUSES = ['processing'];

function checkCancelEligibility(order, userId) {
  if (!order) {
    throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  }
  if (order.user_id !== userId) {
    throw Object.assign(new Error('This order does not belong to your account'), { statusCode: 403 });
  }
  if (order.status === 'cancelled') {
    throw Object.assign(new Error('Order is already cancelled'), { statusCode: 409 });
  }
  if (order.status === 'in_transit') {
    throw Object.assign(new Error('Order cannot be cancelled after shipment'), { statusCode: 409 });
  }
  if (order.status === 'delivered') {
    throw Object.assign(new Error('Order cannot be cancelled after delivery'), { statusCode: 409 });
  }
  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    throw Object.assign(new Error(`Order cannot be cancelled in status: ${order.status}`), { statusCode: 409 });
  }
}

module.exports = function createOrderRoutes(db, requireAuth) {
  const router = express.Router();

  /**
   * Mock payment success: creates order, decreases stock, builds PDF, emails customer.
   * Requires authentication. Body: { customerName?, items: [{ product_id, size, quantity }] }
   */
  router.post('/mock-checkout', requireAuth, async (req, res) => {
    const { customerName, items, addressId } = req.body;
    const customerEmail = req.user.email;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart must contain at least one item' });
    }

    const normalizedItems = [];
    for (const raw of items) {
      const product_id = raw?.product_id != null ? String(raw.product_id).trim() : '';
      const size = raw?.size != null ? String(raw.size).trim() : '';
      const quantity = Number(raw?.quantity);
      if (!product_id || !size || !Number.isFinite(quantity) || quantity < 1) {
        return res.status(400).json({
          message: 'Each item needs product_id, size, and quantity (at least 1)',
        });
      }
      normalizedItems.push({ product_id, size, quantity: Math.floor(quantity) });
    }

    const email = String(customerEmail).trim().toLowerCase();
    const name =
      customerName && String(customerName).trim() ? String(customerName).trim() : null;

    let conn;
    try {
      conn = await db.getConnection();
    } catch (e) {
      console.error('mock-checkout db connection:', e);
      return res.status(500).json({
        message: 'MySQL’e bağlanılamadı. .env (DB_*) değerlerini ve MySQL’in çalıştığını kontrol et.',
      });
    }

    try {
      await conn.beginTransaction();

      const productIds = normalizedItems.map(item => item.product_id);

      const [productDiscounts] = await conn.query(`
        SELECT
          dc.id,
          dc.name,
          dc.discount_type,
          dc.discount_value,
          dcp.product_id
        FROM discount_campaigns dc
        JOIN discount_campaign_products dcp ON dc.id = dcp.campaign_id
        WHERE dc.is_active = 1
          AND NOW() BETWEEN dc.start_date AND dc.end_date
          AND dcp.product_id IN (?)
      `, [productIds]);

      const [categoryDiscounts] = await conn.query(`
        SELECT
          dc.id,
          dc.name,
          dc.discount_type,
          dc.discount_value,
          p.id as product_id
        FROM discount_campaigns dc
        JOIN discount_campaign_categories dcc ON dc.id = dcc.campaign_id
        JOIN products p ON p.categoryName = dcc.category_name
        WHERE dc.is_active = 1
          AND NOW() BETWEEN dc.start_date AND dc.end_date
          AND p.id IN (?)
      `, [productIds]);

      const allDiscounts = [...productDiscounts, ...categoryDiscounts];
      const discountsByProduct = {};
      for (const disc of allDiscounts) {
        if (!discountsByProduct[disc.product_id]) {
          discountsByProduct[disc.product_id] = [];
        }
        discountsByProduct[disc.product_id].push(disc);
      }

      const resolvedLines = [];
      for (const line of normalizedItems) {
        const [rows] = await conn.query(
          'SELECT id, name, quantityInStock, price FROM products WHERE id = ? FOR UPDATE',
          [line.product_id]
        );
        if (rows.length === 0) {
          await conn.rollback();
          return res.status(400).json({ message: `Product not found: ${line.product_id}` });
        }
        const p = rows[0];
        const stock = Number(p.quantityInStock);
        if (stock < line.quantity) {
          await conn.rollback();
          return res.status(400).json({
            message: `Insufficient stock for ${p.name}. Available: ${stock}`,
          });
        }

        const basePrice = roundMoney(p.price);
        let unit = basePrice;
        let discountInfo = null;

        const applicableDiscounts = discountsByProduct[line.product_id];
        if (applicableDiscounts && applicableDiscounts.length > 0) {
          const bestDiscount = resolveBestDiscount(basePrice, applicableDiscounts);
          if (bestDiscount) {
            unit = roundMoney(bestDiscount.discountedPrice);
            discountInfo = {
              campaign_id: bestDiscount.campaign.id,
              discount_type: bestDiscount.campaign.discount_type,
              discount_value: bestDiscount.campaign.discount_value,
              discount_amount: roundMoney(bestDiscount.savingsAmount),
              original_price: basePrice
            };
          }
        }

        const lineTotal = roundMoney(unit * line.quantity);
        resolvedLines.push({
          product_id: line.product_id,
          product_name: p.name,
          size: line.size,
          quantity: line.quantity,
          unit_price: unit,
          line_total: lineTotal,
          discount: discountInfo
        });
      }

      const total = roundMoney(resolvedLines.reduce((s, l) => s + l.line_total, 0));
      const invoice_number = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const userId = req.user && req.user.id ? req.user.id : null;
      const [orderResult] = await conn.query(
        `INSERT INTO orders (user_id, invoice_number, customer_email, customer_name, total_amount, currency, status, address_id)
         VALUES (?, ?, ?, ?, ?, 'TRY', 'processing', ?)`,
        [userId, invoice_number, email, name, total, addressId || null]
      );
      const orderId = orderResult.insertId;
      

      for (const line of resolvedLines) {
        await conn.query(
          `INSERT INTO order_items (
            order_id, product_id, product_name, size, quantity, unit_price, line_total,
            discount_campaign_id, discount_type, discount_value, discount_amount, original_price
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            line.product_id,
            line.product_name,
            line.size,
            line.quantity,
            line.unit_price,
            line.line_total,
            line.discount?.campaign_id || null,
            line.discount?.discount_type || null,
            line.discount?.discount_value || null,
            line.discount?.discount_amount || null,
            line.discount?.original_price || null
          ]
        );
        await conn.query(
          'UPDATE products SET quantityInStock = quantityInStock - ? WHERE id = ?',
          [line.quantity, line.product_id]
        );
      }

      await conn.commit();

      const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      const [itemRows] = await db.query(
        `SELECT oi.*, p.color FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? ORDER BY oi.id`,
        [orderId]
      );
      const orderRow = orderRows[0];
      const payload = buildPayloadFromRows(orderRow, itemRows);

      let pdfBuffer;
      try {
        pdfBuffer = await generateInvoicePdfBuffer(payload);
      } catch (e) {
        console.error('PDF generation failed:', e);
        return res.status(201).json({
          message: 'Order placed but invoice PDF failed',
          orderId,
          invoiceNumber: invoice_number,
          invoicePdfError: true,
        });
      }

      let emailResult;
      try {
        emailResult = await sendInvoiceEmail({
          to: email,
          invoiceNumber: invoice_number,
          pdfBuffer,
        });
      } catch (e) {
        const detail = String(e.message || e).slice(0, 500);
        console.error('Invoice email failed:', detail);
        return res.status(201).json({
          message: 'Order placed; invoice email failed — see emailDetail.',
          orderId,
          invoiceNumber: invoice_number,
          emailSent: false,
          emailError: true,
          emailDetail: detail,
        });
      }

      const emailSent = emailResult.sent === true;

      let message = 'Payment confirmed.';
      if (emailSent) {
        message = 'Payment confirmed. Invoice sent to your email.';
      } else {
        message =
          'Payment confirmed. Invoice email was not sent — set BREVO_API_KEY and BREVO_SENDER_EMAIL in backend .env.';
      }

      return res.status(201).json({
        message,
        orderId,
        invoiceNumber: invoice_number,
        emailSent,
        emailReason: emailResult.reason || undefined,
      });
    } catch (error) {
      try {
        await conn.rollback();
      } catch (_) {
        /* ignore */
      }
      console.error('mock-checkout error:', error.code, error.sqlMessage || error.message);
      return res.status(500).json({
        message: mapCheckoutError(error),
        code: error.code,
        detail: process.env.NODE_ENV !== 'production' ? error.sqlMessage || error.message : undefined,
      });
    } finally {
      conn.release();
    }
  });

  /**
   * PATCH /api/orders/:orderId/cancel
   * Cancel a processing order. Restocks all ordered items.
   */
  router.patch('/:orderId/cancel', requireAuth, async (req, res) => {
    const orderId = Number(req.params.orderId);
    if (!Number.isFinite(orderId) || orderId < 1) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [[order]] = await conn.query(
        'SELECT id, user_id, status FROM orders WHERE id = ? FOR UPDATE',
        [orderId]
      );

      checkCancelEligibility(order, req.user.id);

      const [items] = await conn.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [orderId]
      );

      for (const item of items) {
        await conn.query(
          'UPDATE products SET quantityInStock = quantityInStock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      await conn.query(
        "UPDATE orders SET status = 'cancelled' WHERE id = ?",
        [orderId]
      );

      await conn.commit();
      return res.json({ message: 'Order cancelled', orderId, status: 'cancelled' });
    } catch (error) {
      try { await conn.rollback(); } catch (_) { /* ignore */ }
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error('cancel order error:', error);
      return res.status(500).json({ message: 'Failed to cancel order' });
    } finally {
      conn.release();
    }
  });

  router.get('/:orderId/invoice/pdf', async (req, res) => {
    const orderId = Number(req.params.orderId);
    if (!Number.isFinite(orderId) || orderId < 1) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    try {
      const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (orderRows.length === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }
      const [itemRows] = await db.query(
        `SELECT oi.*, p.color FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? ORDER BY oi.id`,
        [orderId]
      );
      const payload = buildPayloadFromRows(orderRows[0], itemRows);
      const pdfBuffer = await generateInvoicePdfBuffer(payload);
      const safe = String(payload.invoiceNumber).replace(/[^\w.-]+/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${safe}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('invoice pdf error:', error);
      return res.status(500).json({ message: 'Could not generate invoice PDF' });
    }
  });

  router.get('/:orderId/invoice', async (req, res) => {
    const orderId = Number(req.params.orderId);
    if (!Number.isFinite(orderId) || orderId < 1) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    try {
      const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (orderRows.length === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }
      const [itemRows] = await db.query(
        `SELECT oi.*, p.color FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? ORDER BY oi.id`,
        [orderId]
      );
      const o = orderRows[0];
      const payload = buildPayloadFromRows(o, itemRows);
      return res.json({
        orderId: o.id,
        invoiceNumber: o.invoice_number,
        status: o.status,
        createdAt: o.created_at,
        customerEmail: o.customer_email,
        customerName: o.customer_name,
        currency: o.currency,
        total: Number(o.total_amount),
        lines: payload.lines,
      });
    } catch (error) {
      console.error('invoice json error:', error);
      return res.status(500).json({ message: 'Could not load invoice' });
    }
  });

  return router;
};

module.exports.roundMoney = roundMoney;
module.exports.buildPayloadFromRows = buildPayloadFromRows;
module.exports.mapCheckoutError = mapCheckoutError;
module.exports.checkCancelEligibility = checkCancelEligibility;
