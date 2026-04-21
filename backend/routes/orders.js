const express = require('express');
const { generateInvoicePdfBuffer } = require('../services/invoicePdf');
const { sendInvoiceEmail } = require('../services/mailInvoice');

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
      productName: i.product_name,
      size: i.size,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      lineTotal: Number(i.line_total),
    })),
  };
}

module.exports = function createOrderRoutes(db) {
  const router = express.Router();

  /**
   * Mock payment success: creates order, decreases stock, builds PDF, emails customer.
   * Body: { customerEmail, customerName?, items: [{ product_id, size, quantity }] }
   */
  router.post('/mock-checkout', async (req, res) => {
    const { customerEmail, customerName, items } = req.body;

    if (!customerEmail || !EMAIL_REGEX.test(String(customerEmail).trim())) {
      return res.status(400).json({ message: 'Valid customer email is required' });
    }
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
        const unit = roundMoney(p.price);
        const lineTotal = roundMoney(unit * line.quantity);
        resolvedLines.push({
          product_id: line.product_id,
          product_name: p.name,
          size: line.size,
          quantity: line.quantity,
          unit_price: unit,
          line_total: lineTotal,
        });
      }

      const total = roundMoney(resolvedLines.reduce((s, l) => s + l.line_total, 0));
      const invoice_number = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const [orderResult] = await conn.query(
        `INSERT INTO orders (invoice_number, customer_email, customer_name, total_amount, currency, status)
         VALUES (?, ?, ?, ?, 'TRY', 'processing')`,
        [invoice_number, email, name, total]
      );
      const orderId = orderResult.insertId;

      for (const line of resolvedLines) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            line.product_id,
            line.product_name,
            line.size,
            line.quantity,
            line.unit_price,
            line.line_total,
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
        'SELECT * FROM order_items WHERE order_id = ? ORDER BY id',
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
        'SELECT * FROM order_items WHERE order_id = ? ORDER BY id',
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
        'SELECT * FROM order_items WHERE order_id = ? ORDER BY id',
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
