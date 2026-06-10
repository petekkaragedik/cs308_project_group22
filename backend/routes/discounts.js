const express = require('express');
const { calculateDiscount, resolveBestDiscount } = require('../services/discountCalculator');
const createWishlistNotificationService = require('../services/wishlistNotificationService');

module.exports = function createDiscountRoutes(db, requireAuth, requireRole) {
  const router = express.Router();
  const { detectWishlistDiscounts } = createWishlistNotificationService(db);

  /**
   * POST /api/discounts/campaigns
   * Create new discount campaign
   * Auth: sales_manager only
   */
  router.post('/campaigns', requireAuth, requireRole('sales_manager'), async (req, res) => {
    const {
      name,
      description,
      discount_type,
      discount_value,
      start_date,
      end_date,
      is_active,
      product_ids,
      category_names
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Campaign name is required' });
    }

    if (!['percentage', 'fixed_amount'].includes(discount_type)) {
      return res.status(400).json({ message: 'Invalid discount type. Must be percentage or fixed_amount' });
    }

    const value = Number(discount_value);
    if (!value || value <= 0) {
      return res.status(400).json({ message: 'Discount value must be greater than 0' });
    }

    if (discount_type === 'percentage' && value > 100) {
      return res.status(400).json({ message: 'Percentage discount cannot exceed 100%' });
    }

    if (discount_type === 'fixed_amount' && value > 10000) {
      return res.status(400).json({ message: 'Fixed amount discount cannot exceed 10,000' });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    if (new Date(start_date) >= new Date(end_date)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    if (!product_ids?.length && !category_names?.length) {
      return res.status(400).json({ message: 'At least one product or category must be selected' });
    }

    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO discount_campaigns
         (name, description, discount_type, discount_value, start_date, end_date, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          description?.trim() || null,
          discount_type,
          value,
          start_date,
          end_date,
          is_active !== false ? 1 : 0,
          req.user.id
        ]
      );

      const campaignId = result.insertId;

      if (product_ids?.length) {
        const productValues = product_ids.map(pid => [campaignId, String(pid).trim()]);
        await conn.query(
          'INSERT INTO discount_campaign_products (campaign_id, product_id) VALUES ?',
          [productValues]
        );
      }

      if (category_names?.length) {
        const categoryValues = category_names.map(cat => [campaignId, String(cat).trim()]);
        await conn.query(
          'INSERT INTO discount_campaign_categories (campaign_id, category_name) VALUES ?',
          [categoryValues]
        );
      }

      await conn.commit();

      const [campaigns] = await conn.query(
        'SELECT * FROM discount_campaigns WHERE id = ?',
        [campaignId]
      );

      // Trigger wishlist notifications asynchronously (don't block response)
      console.log(`🚀 Triggering wishlist notifications for campaign ${campaignId}`);
      detectWishlistDiscounts(campaignId).catch(err => {
        console.error('❌ Failed to create wishlist notifications:', err);
      });

      res.status(201).json({
        message: 'Campaign created successfully',
        campaign: campaigns[0]
      });
    } catch (error) {
      if (conn) await conn.rollback();
      console.error('Create campaign error:', error);
      res.status(500).json({ message: 'Failed to create campaign' });
    } finally {
      if (conn) conn.release();
    }
  });

  /**
   * GET /api/discounts/campaigns?status=active|upcoming|expired|all
   * List all campaigns with filtering
   * Auth: sales_manager only
   */
  router.get('/campaigns', requireAuth, requireRole('sales_manager'), async (req, res) => {
    const { status = 'all' } = req.query;

    try {
      let statusCondition = '';
      let deletedCondition = 'AND dc.deleted_at IS NULL';

      if (status === 'deleted') {
        deletedCondition = 'AND dc.deleted_at IS NOT NULL';
      } else if (status === 'active') {
        statusCondition = 'AND dc.is_active = 1 AND NOW() BETWEEN dc.start_date AND dc.end_date';
      } else if (status === 'upcoming') {
        statusCondition = 'AND dc.is_active = 1 AND NOW() < dc.start_date';
      } else if (status === 'expired') {
        statusCondition = 'AND NOW() > dc.end_date';
      }

      const [campaigns] = await db.query(`
        SELECT
          dc.*,
          COUNT(DISTINCT dcp.product_id) as product_count,
          COUNT(DISTINCT dcc.category_name) as category_count,
          GROUP_CONCAT(DISTINCT dcc.category_name SEPARATOR ', ') as categories,
          CASE
            WHEN dc.deleted_at IS NOT NULL THEN 'deleted'
            WHEN dc.is_active = 0 THEN 'inactive'
            WHEN NOW() < dc.start_date THEN 'upcoming'
            WHEN NOW() > dc.end_date THEN 'expired'
            ELSE 'active'
          END as status
        FROM discount_campaigns dc
        LEFT JOIN discount_campaign_products dcp ON dc.id = dcp.campaign_id
        LEFT JOIN discount_campaign_categories dcc ON dc.id = dcc.campaign_id
        WHERE 1=1 ${deletedCondition} ${statusCondition}
        GROUP BY dc.id
        ORDER BY dc.created_at DESC
      `);

      res.json(campaigns);
    } catch (error) {
      console.error('List campaigns error:', error);
      res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
  });

  /**
   * GET /api/discounts/campaigns/:id
   * Get campaign details with products and categories
   * Auth: sales_manager only
   */
  router.get('/campaigns/:id', requireAuth, requireRole('sales_manager'), async (req, res) => {
    const { id } = req.params;

    try {
      const [campaigns] = await db.query('SELECT * FROM discount_campaigns WHERE id = ?', [id]);

      if (campaigns.length === 0) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      const [products] = await db.query(
        `SELECT p.id, p.name, p.price
         FROM discount_campaign_products dcp
         JOIN products p ON dcp.product_id = p.id
         WHERE dcp.campaign_id = ?`,
        [id]
      );

      const [categories] = await db.query(
        'SELECT category_name FROM discount_campaign_categories WHERE campaign_id = ?',
        [id]
      );

      res.json({
        ...campaigns[0],
        products,
        categories: categories.map(c => c.category_name)
      });
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ message: 'Failed to fetch campaign' });
    }
  });

  /**
   * PUT /api/discounts/campaigns/:id
   * Update existing campaign
   * Auth: sales_manager only
   */
  router.put('/campaigns/:id', requireAuth, requireRole('sales_manager'), async (req, res) => {
    const { id } = req.params;
    const {
      name,
      description,
      discount_type,
      discount_value,
      start_date,
      end_date,
      is_active,
      product_ids,
      category_names
    } = req.body;

    let conn;
    try {
      const [existing] = await db.query('SELECT * FROM discount_campaigns WHERE id = ?', [id]);

      if (existing.length === 0) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      const campaign = existing[0];

      if (start_date && new Date(campaign.start_date) < new Date() && new Date(start_date) !== new Date(campaign.start_date)) {
        return res.status(400).json({ message: 'Cannot change start date of campaign that has already started' });
      }

      if (discount_type === 'percentage' && Number(discount_value) > 100) {
        return res.status(400).json({ message: 'Percentage discount cannot exceed 100%' });
      }

      if (discount_type === 'fixed_amount' && Number(discount_value) > 10000) {
        return res.status(400).json({ message: 'Fixed amount discount cannot exceed 10,000' });
      }

      if (end_date && start_date && new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name.trim());
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description?.trim() || null);
      }
      if (discount_type !== undefined) {
        updates.push('discount_type = ?');
        values.push(discount_type);
      }
      if (discount_value !== undefined) {
        updates.push('discount_value = ?');
        values.push(Number(discount_value));
      }
      if (start_date !== undefined) {
        updates.push('start_date = ?');
        values.push(start_date);
      }
      if (end_date !== undefined) {
        updates.push('end_date = ?');
        values.push(end_date);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active ? 1 : 0);
      }

      if (updates.length > 0) {
        values.push(id);
        await conn.query(
          `UPDATE discount_campaigns SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      if (product_ids !== undefined) {
        await conn.query('DELETE FROM discount_campaign_products WHERE campaign_id = ?', [id]);
        if (product_ids.length > 0) {
          const productValues = product_ids.map(pid => [id, String(pid).trim()]);
          await conn.query(
            'INSERT INTO discount_campaign_products (campaign_id, product_id) VALUES ?',
            [productValues]
          );
        }
      }

      if (category_names !== undefined) {
        await conn.query('DELETE FROM discount_campaign_categories WHERE campaign_id = ?', [id]);
        if (category_names.length > 0) {
          const categoryValues = category_names.map(cat => [id, String(cat).trim()]);
          await conn.query(
            'INSERT INTO discount_campaign_categories (campaign_id, category_name) VALUES ?',
            [categoryValues]
          );
        }
      }

      await conn.commit();

      const [updated] = await conn.query('SELECT * FROM discount_campaigns WHERE id = ?', [id]);

      // Trigger wishlist notifications asynchronously (don't block response)
      detectWishlistDiscounts(id).catch(err => {
        console.error('Failed to create wishlist notifications:', err);
      });

      res.json({
        message: 'Campaign updated successfully',
        campaign: updated[0]
      });
    } catch (error) {
      if (conn) await conn.rollback();
      console.error('Update campaign error:', error);
      res.status(500).json({ message: 'Failed to update campaign' });
    } finally {
      if (conn) conn.release();
    }
  });

  /**
   * DELETE /api/discounts/campaigns/:id
   * Delete campaign
   * Auth: sales_manager only
   */
  router.delete('/campaigns/:id', requireAuth, requireRole('sales_manager'), async (req, res) => {
    const { id } = req.params;

    try {
      const [campaigns] = await db.query('SELECT * FROM discount_campaigns WHERE id = ? AND deleted_at IS NULL', [id]);

      if (campaigns.length === 0) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Soft delete: set deleted_at timestamp
      await db.query('UPDATE discount_campaigns SET deleted_at = NOW() WHERE id = ?', [id]);

      res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({ message: 'Failed to delete campaign' });
    }
  });

  /**
   * GET /api/discounts/active?product_ids=X,Y,Z
   * Get currently active discounts for products
   * Auth: Public
   */
  router.get('/active', async (req, res) => {
    const { product_ids } = req.query;

    if (!product_ids) {
      return res.json({});
    }

    const productIdArray = product_ids.split(',').map(id => id.trim()).filter(Boolean);

    if (productIdArray.length === 0) {
      return res.json({});
    }

    try {
      const [productDiscounts] = await db.query(`
        SELECT
          dc.id,
          dc.name,
          dc.discount_type,
          dc.discount_value,
          dcp.product_id,
          'product' as source
        FROM discount_campaigns dc
        JOIN discount_campaign_products dcp ON dc.id = dcp.campaign_id
        WHERE dc.is_active = 1
          AND dc.deleted_at IS NULL
          AND NOW() BETWEEN dc.start_date AND dc.end_date
          AND dcp.product_id IN (?)
      `, [productIdArray]);

      const [categoryDiscounts] = await db.query(`
        SELECT
          dc.id,
          dc.name,
          dc.discount_type,
          dc.discount_value,
          p.id as product_id,
          'category' as source
        FROM discount_campaigns dc
        JOIN discount_campaign_categories dcc ON dc.id = dcc.campaign_id
        JOIN products p ON p.categoryName = dcc.category_name
        WHERE dc.is_active = 1
          AND dc.deleted_at IS NULL
          AND NOW() BETWEEN dc.start_date AND dc.end_date
          AND p.id IN (?)
      `, [productIdArray]);

      const allDiscounts = [...productDiscounts, ...categoryDiscounts];

      const discountsByProduct = {};

      for (const disc of allDiscounts) {
        if (!discountsByProduct[disc.product_id]) {
          discountsByProduct[disc.product_id] = [];
        }
        discountsByProduct[disc.product_id].push(disc);
      }

      const [products] = await db.query(
        'SELECT id, price FROM products WHERE id IN (?)',
        [productIdArray]
      );

      const productPrices = {};
      products.forEach(p => {
        productPrices[p.id] = Number(p.price);
      });

      const result = {};

      Object.keys(discountsByProduct).forEach(productId => {
        const basePrice = productPrices[productId];
        if (!basePrice) return;

        const campaigns = discountsByProduct[productId];
        const bestDiscount = resolveBestDiscount(basePrice, campaigns);

        if (bestDiscount) {
          result[productId] = {
            campaign_id: bestDiscount.campaign.id,
            campaign_name: bestDiscount.campaign.name,
            discount_type: bestDiscount.campaign.discount_type,
            discount_value: bestDiscount.campaign.discount_value,
            original_price: basePrice,
            discounted_price: bestDiscount.discountedPrice,
            savings: bestDiscount.savingsAmount
          };
        }
      });

      res.json(result);
    } catch (error) {
      console.error('Get active discounts error:', error);
      res.status(500).json({ message: 'Failed to fetch active discounts' });
    }
  });

  return router;
};
