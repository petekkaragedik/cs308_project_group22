/**
 * Calculate discounted price for a product
 * @param {number} basePrice - Original product price
 * @param {string} discountType - 'percentage' or 'fixed_amount'
 * @param {number} discountValue - Discount value
 * @returns {object} { discountedPrice, savingsAmount }
 */
function calculateDiscount(basePrice, discountType, discountValue) {
  let discountedPrice;
  let savingsAmount;

  if (discountType === 'percentage') {
    savingsAmount = basePrice * (discountValue / 100);
    discountedPrice = basePrice - savingsAmount;
  } else if (discountType === 'fixed_amount') {
    savingsAmount = Math.min(discountValue, basePrice);
    discountedPrice = basePrice - savingsAmount;
  } else {
    return { discountedPrice: basePrice, savingsAmount: 0 };
  }

  discountedPrice = Math.max(0, discountedPrice);

  discountedPrice = Math.round(discountedPrice * 100) / 100;
  savingsAmount = Math.round(savingsAmount * 100) / 100;

  return { discountedPrice, savingsAmount };
}

/**
 * Resolve conflicts when multiple discounts apply
 * @param {number} basePrice
 * @param {Array} campaigns - Array of applicable campaign objects
 * @returns {object|null} Best discount to apply with calculated prices
 */
function resolveBestDiscount(basePrice, campaigns) {
  if (!campaigns || campaigns.length === 0) return null;

  if (campaigns.length === 1) {
    const { discountedPrice, savingsAmount } = calculateDiscount(
      basePrice,
      campaigns[0].discount_type,
      campaigns[0].discount_value
    );
    return {
      campaign: campaigns[0],
      discountedPrice,
      savingsAmount
    };
  }

  const options = campaigns.map(camp => {
    const { discountedPrice, savingsAmount } = calculateDiscount(
      basePrice,
      camp.discount_type,
      camp.discount_value
    );
    return {
      campaign: camp,
      discountedPrice,
      savingsAmount
    };
  });

  return options.reduce((best, current) =>
    current.discountedPrice < best.discountedPrice ? current : best
  );
}

module.exports = { calculateDiscount, resolveBestDiscount };
