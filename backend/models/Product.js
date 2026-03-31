class Product {
  constructor({
    id,
    name,
    model,
    serialNumber,
    description,
    quantityInStock,
    price,
    warrantyStatus,
    distributorInfo,
    categoryName,
    color,
    size,
    gender,
    vatRate,
    images,
    popularity,
    // legacy aliases kept for backward compatibility
    warranty,
    distributor
  }) {
    if (!id) throw new Error("Product must have id");
    if (!model) throw new Error("Product must have model");
    this.id = id;
    this.name = name || "";
    this.model = model;
    this.serialNumber = serialNumber || id;
    this.description = description || "";
    this.quantityInStock = quantityInStock !== undefined ? quantityInStock : 0;
    this.price = price || 0;
    this.warrantyStatus = warrantyStatus !== undefined ? warrantyStatus : (warranty ? true : false);
    this.distributorInfo = distributorInfo || distributor || "scyllastore";
    this.categoryName = categoryName || "";
    this.color = color || "";
    this.size = size || "";
    this.gender = gender || "";
    this.vatRate = vatRate !== undefined ? vatRate : 10;
    this.images = Array.isArray(images) ? images : [];
    this.popularity = popularity || 0;
  }
}

module.exports = Product;
