const express = require('express');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

module.exports = function createReturnRoutes(db, requireAuth) {
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
   * List all return requests for the authenticated user.
   */
  router.get('/', requireAuth, async (req, res) => {
    try {
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

  return router;
};
