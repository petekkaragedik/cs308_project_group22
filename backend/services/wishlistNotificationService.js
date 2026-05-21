/**
 * Create wishlist notification service
 * @param {object} db - Database connection pool
 * @returns {object} - Service methods
 */
function createWishlistNotificationService(db) {
  /**
   * Detect wishlisted products affected by a campaign and create notifications
   * @param {number} campaignId - The campaign ID to process
   * @returns {Promise<number>} - Number of notifications created
   */
  async function detectWishlistDiscounts(campaignId) {
    let conn;
    try {
      conn = await db.getConnection();

    // Step 1: Fetch campaign details
    const [campaigns] = await conn.query(
      'SELECT * FROM discount_campaigns WHERE id = ?',
      [campaignId]
    );

    if (campaigns.length === 0) {
      console.log(`Campaign ${campaignId} not found`);
      return 0;
    }

    const campaign = campaigns[0];

    // Step 2: Check if notification is needed
    const now = new Date();
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);

    // Only notify for active campaigns within date range
    if (campaign.is_active !== 1 || now < startDate || now > endDate) {
      console.log(`Campaign ${campaignId} is not currently active - skipping notifications`);
      return 0;
    }

    // Step 3: Get direct product IDs
    const [productRows] = await conn.query(
      'SELECT product_id FROM discount_campaign_products WHERE campaign_id = ?',
      [campaignId]
    );
    const directProductIds = productRows.map(row => row.product_id);

    // Step 4: Get categories
    const [categoryRows] = await conn.query(
      'SELECT category_name FROM discount_campaign_categories WHERE campaign_id = ?',
      [campaignId]
    );
    const categoryNames = categoryRows.map(row => row.category_name);

    // Step 5: Expand affected products (direct + category-based)
    let affectedProductIds = [...directProductIds];

    if (categoryNames.length > 0) {
      const [categoryProducts] = await conn.query(
        'SELECT id FROM products WHERE categoryName IN (?)',
        [categoryNames]
      );
      const categoryProductIds = categoryProducts.map(p => p.id);
      affectedProductIds = [...new Set([...affectedProductIds, ...categoryProductIds])];
    }

    if (affectedProductIds.length === 0) {
      console.log(`Campaign ${campaignId} has no affected products - skipping notifications`);
      return 0;
    }

    // Step 6: Find affected users (group by user, exclude recently notified)
    const [userWishlists] = await conn.query(`
      SELECT
        f.user_id,
        JSON_ARRAYAGG(f.product_id) as wishlisted_product_ids,
        COUNT(f.product_id) as product_count
      FROM favorites f
      WHERE f.product_id IN (?)
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = f.user_id
            AND n.campaign_id = ?
            AND n.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        )
      GROUP BY f.user_id
    `, [affectedProductIds, campaignId]);

    if (userWishlists.length === 0) {
      console.log(`No users to notify for campaign ${campaignId}`);
      return 0;
    }

    // Step 7: Build notification messages
    const discountText = campaign.discount_type === 'percentage'
      ? `${campaign.discount_value}% off`
      : `${campaign.discount_value} TL off`;

    const notificationValues = userWishlists.map(uw => {
      const count = uw.product_count;
      const title = count === 1
        ? 'Your wishlisted item is now on sale!'
        : `${count} of your wishlisted items are now on sale!`;

      const message = `${campaign.name} - ${discountText}`;

      return [
        uw.user_id,
        'wishlist_discount',
        title,
        message,
        campaignId,
        uw.wishlisted_product_ids,
        null // read_at
      ];
    });

    // Step 8: Bulk insert notifications
    const [result] = await conn.query(`
      INSERT IGNORE INTO notifications
      (user_id, type, title, message, campaign_id, affected_products, read_at)
      VALUES ?
    `, [notificationValues]);

    const notificationsCreated = result.affectedRows || 0;
    console.log(`Created ${notificationsCreated} notifications for campaign ${campaignId}`);

    return notificationsCreated;

  } catch (error) {
    console.error('Error detecting wishlist discounts:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

  return {
    detectWishlistDiscounts
  };
}

module.exports = createWishlistNotificationService;
