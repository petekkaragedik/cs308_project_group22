const express = require('express');
const router = express.Router();
const { checkRole } = require('../middleware/auth');
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

module.exports = router;