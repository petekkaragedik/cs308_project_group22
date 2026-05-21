const express = require('express');

module.exports = function createNotificationRoutes(db, requireAuth) {
  const router = express.Router();

  /**
   * GET /api/notifications
   * Get user's notifications with optional filtering
   * Auth: Required
   * Query params:
   *   - status: 'unread' | 'read' | 'all' (default: 'all')
   *   - limit: number (default: 20)
   *   - offset: number (default: 0)
   */
  router.get('/', requireAuth, async (req, res) => {
  const { status = 'all', limit = 20, offset = 0 } = req.query;
  const userId = req.user.id;

  try {
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];

    if (status === 'unread') {
      whereClause += ' AND read_at IS NULL';
    } else if (status === 'read') {
      whereClause += ' AND read_at IS NOT NULL';
    }

    const [notifications] = await db.query(
      `SELECT
        n.*,
        dc.name as campaign_name,
        dc.discount_type,
        dc.discount_value
      FROM notifications n
      LEFT JOIN discount_campaigns dc ON n.campaign_id = dc.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Parse JSON affected_products field
    const parsedNotifications = notifications.map(n => ({
      ...n,
      affected_products: n.affected_products ? JSON.parse(n.affected_products) : []
    }));

    res.json(parsedNotifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for the authenticated user
 * Auth: Required
 */
  router.get('/unread-count', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );

    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 * Auth: Required
 */
  router.put('/:id/read', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [result] = await db.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ? AND read_at IS NULL',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found or already read' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all user's notifications as read
 * Auth: Required
 */
  router.put('/read-all', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const [result] = await db.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
      [userId]
    );

    res.json({
      message: 'All notifications marked as read',
      count: result.affectedRows
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 * Auth: Required
 */
  router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [result] = await db.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
  });

  return router;
};
