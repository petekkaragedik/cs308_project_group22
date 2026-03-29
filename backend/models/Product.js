class Product {
  constructor({
    id,
    model,
    serialNumber,
    warranty,
    distributor,
    name,
    price
  }) {
    // required fields
    if (!id) throw new Error("Product must have id");
    if (!model) throw new Error("Product must have model");
    if (!serialNumber) throw new Error("Product must have serialNumber");
    if (!distributor) throw new Error("Product must have distributor");

    this.id = id;
    this.model = model;
    this.serialNumber = serialNumber;
    this.warranty = warranty || "2 years";
    this.distributor = distributor;

    // optional (frontend için)
    this.name = name || "";
    this.price = price || 0;
  }
}

module.exports = Product;