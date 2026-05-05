const express = require('express');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

module.exports = function createReturnRoutes(db, requireAuth, requireRole) {
  const router = express.Router();

  /**
   * POST /api/returns
   * Submit a return request for a delivered order belonging to the authenticated user.
   * Body: { order_id, reason? }
   */
  router.post('/', requireAuth, async (req, res) => {
    const { order_id, reason } = req.body;

    if (!order_id) {
      return res.status(400).json({ message: 'order_id is required' });
    }

    const orderId = Number(order_id);
    if (!Number.isFinite(orderId) || orderId < 1) {
      return res.status(400).json({ message: 'Invalid order_id' });
    }

    try {
      const [orderRows] = await db.query(
        'SELECT id, customer_email, status, created_at FROM orders WHERE id = ?',
        [orderId]
      );

      if (orderRows.length === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const order = orderRows[0];

      if (order.customer_email.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: 'This order does not belong to your account' });
      }

      if (order.status !== 'delivered') {
        return res.status(400).json({
          message: 'Only delivered orders can be returned',
        });
      }

      const ageMs = Date.now() - new Date(order.created_at).getTime();
      if (ageMs > THIRTY_DAYS_MS) {
        return res.status(400).json({
          message: 'Return window has expired. Returns must be requested within 30 days of the order.',
        });
      }

      const [existing] = await db.query(
        'SELECT id FROM return_requests WHERE order_id = ? AND user_id = ?',
        [orderId, req.user.id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: 'A return request for this order already exists' });
      }

      const sanitizedReason = reason && String(reason).trim() ? String(reason).trim() : null;

      const [result] = await db.query(
        `INSERT INTO return_requests (order_id, user_id, reason, status)
         VALUES (?, ?, ?, 'pending')`,
        [orderId, req.user.id, sanitizedReason]
      );

      return res.status(201).json({
        message: 'Return request submitted successfully',
        returnRequestId: result.insertId,
        orderId,
        status: 'pending',
      });
    } catch (error) {
      console.error('Return request error:', error);
      return res.status(500).json({ message: 'Failed to submit return request' });
    }
  });

  /**
   * GET /api/returns
   * - Sales manager: all pending return requests with customer + product info.
   * - Customer: their own return requests.
   */
  router.get('/', requireAuth, async (req, res) => {
    try {
      if (req.user.role === 'sales_manager') {
        const [rows] = await db.query(
          `SELECT rr.id, rr.order_id, rr.reason, rr.status, rr.created_at,
                  rr.refunded_amount, rr.refunded_at,
                  o.customer_name, o.customer_email, o.total_amount, o.currency,
                  GROUP_CONCAT(oi.product_name ORDER BY oi.id SEPARATOR ', ') AS product_names
           FROM return_requests rr
           JOIN orders o ON o.id = rr.order_id
           LEFT JOIN order_items oi ON oi.order_id = rr.order_id
           GROUP BY rr.id, rr.order_id, rr.reason, rr.status, rr.created_at,
                    rr.refunded_amount, rr.refunded_at,
                    o.customer_name, o.customer_email, o.total_amount, o.currency
           ORDER BY rr.created_at DESC`
        );
        return res.json(rows);
      }

      const [rows] = await db.query(
        `SELECT rr.id, rr.order_id, rr.reason, rr.status, rr.created_at,
                o.invoice_number, o.total_amount, o.currency
         FROM return_requests rr
         JOIN orders o ON o.id = rr.order_id
         WHERE rr.user_id = ?
         ORDER BY rr.created_at DESC`,
        [req.user.id]
      );
      return res.json(rows);
    } catch (error) {
      console.error('Return requests fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch return requests' });
    }
  });

  /**
   * PATCH /api/returns/:id/approve
   * Sales manager only — approve a pending return request.
   * Restocks each ordered product and records the refund amount (purchase-time price).
   */
  router.patch('/:id/approve', requireAuth, requireRole('sales_manager'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid return request id' });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [[returnReq]] = await conn.query(
        'SELECT id, status, order_id FROM return_requests WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!returnReq) {
        await conn.rollback();
        return res.status(404).json({ message: 'Return request not found' });
      }
      if (returnReq.status !== 'pending') {
        await conn.rollback();
        return res.status(409).json({ message: 'Return request is no longer pending' });
      }

      const [[order]] = await conn.query(
        'SELECT total_amount FROM orders WHERE id = ?',
        [returnReq.order_id]
      );

      const [items] = await conn.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [returnReq.order_id]
      );

      for (const item of items) {
        await conn.query(
          'UPDATE products SET quantityInStock = quantityInStock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      await conn.query(
        `UPDATE return_requests
         SET status = 'approved', refunded_amount = ?, refunded_at = NOW()
         WHERE id = ?`,
        [order.total_amount, id]
      );

      await conn.commit();
      return res.json({
        message: 'Return request approved',
        id,
        status: 'approved',
        refunded_amount: order.total_amount,
      });
    } catch (error) {
      await conn.rollback();
      console.error('Return approve error:', error);
      return res.status(500).json({ message: 'Failed to approve return request' });
    } finally {
      conn.release();
    }
  });

  /**
   * PATCH /api/returns/:id/reject
   * Sales manager only — reject a pending return request.
   */
  router.patch('/:id/reject', requireAuth, requireRole('sales_manager'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid return request id' });
    }
    try {
      const [existing] = await db.query(
        'SELECT id, status FROM return_requests WHERE id = ?',
        [id]
      );
      if (existing.length === 0) {
        return res.status(404).json({ message: 'Return request not found' });
      }
      if (existing[0].status !== 'pending') {
        return res.status(409).json({ message: 'Return request is no longer pending' });
      }
      await db.query(
        "UPDATE return_requests SET status = 'rejected' WHERE id = ?",
        [id]
      );
      return res.json({ message: 'Return request rejected', id, status: 'rejected' });
    } catch (error) {
      console.error('Return reject error:', error);
      return res.status(500).json({ message: 'Failed to reject return request' });
    }
  });

  return router;
};
