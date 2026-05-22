const express = require('express');
const { checkRole } = require('../middleware/auth');

module.exports = function createProductRoutes(db, requireAuth, requireRole) {
  const router = express.Router();

  router.put('/:id/price', checkRole(['sales_manager']), async (req, res) => {
    const productId = req.params.id;
    const { newPrice } = req.body;
    const numericPrice = Number(newPrice);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: 'Invalid price.' });
    }
    try {
      const [result] = await db.query(
        'UPDATE products SET price = ? WHERE id = ?',
        [numericPrice, productId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: `Product not found.` });
      }

      return res.status(200).json({ message: 'Price updated successfully.', updatedPrice: numericPrice });

    } catch (error) {
      console.error('Error updating price:', error);
      return res.status(500).json({ message: 'Database error' });
    }
});

  router.post('/bulk-price-update', requireAuth, requireRole('sales_manager'), async (req, res) => {
    const { updates } = req.body;

    // Validation
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'Updates array is required' });
    }

    if (updates.length > 100) {
      return res.status(400).json({ message: 'Cannot update more than 100 products at once' });
    }

    const errors = [];
    const validUpdates = [];

    for (const update of updates) {
      const { productId, newPrice } = update;
      const numericPrice = Number(newPrice);

      if (!productId) {
        errors.push({ productId, error: 'Product ID is required' });
        continue;
      }

      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        errors.push({ productId, error: 'Invalid price value' });
        continue;
      }

      validUpdates.push({ productId, numericPrice });
    }

    if (validUpdates.length === 0) {
      return res.status(400).json({
        message: 'No valid updates to process',
        errors
      });
    }

    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      const results = {
        successful: [],
        failed: errors
      };

      for (const { productId, numericPrice } of validUpdates) {
        try {
          const [result] = await conn.query(
            'UPDATE products SET price = ? WHERE id = ?',
            [numericPrice, productId]
          );

          if (result.affectedRows === 0) {
            results.failed.push({ productId, error: 'Product not found' });
          } else {
            results.successful.push({ productId, updatedPrice: numericPrice });
          }
        } catch (error) {
          results.failed.push({ productId, error: error.message });
        }
      }

      await conn.commit();

      return res.status(200).json({
        message: `Updated ${results.successful.length} product(s)`,
        results
      });

    } catch (error) {
      if (conn) await conn.rollback();
      console.error('Bulk price update error:', error);
      return res.status(500).json({ message: 'Database error during bulk update' });
    } finally {
      if (conn) conn.release();
    }
  });

  return router;
};