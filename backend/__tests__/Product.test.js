const Product = require("../models/Product");

describe("Product model - unit tests", () => {
  const base = { id: "p1", model: "wave-runner" };

  test("1. throws when id is missing", () => {
    expect(() => new Product({ model: "m" })).toThrow("Product must have id");
  });

  test("2. throws when model is missing", () => {
    expect(() => new Product({ id: "p1" })).toThrow("Product must have model");
  });

  test("3. applies default values for optional fields", () => {
    const p = new Product(base);
    expect(p.name).toBe("");
    expect(p.description).toBe("");
    expect(p.quantityInStock).toBe(0);
    expect(p.price).toBe(0);
    expect(p.warrantyStatus).toBe(false);
    expect(p.distributorInfo).toBe("scyllastore");
    expect(p.categoryName).toBe("");
    expect(p.color).toBe("");
    expect(p.size).toBe("");
    expect(p.gender).toBe("");
    expect(p.vatRate).toBe(10);
    expect(p.images).toEqual([]);
    expect(p.popularity).toBe(0);
  });

  test("4. uses id as fallback for serialNumber when not provided", () => {
    const p = new Product({ ...base, id: "abc-42" });
    expect(p.serialNumber).toBe("abc-42");
  });

  test("5. keeps explicit serialNumber over id fallback", () => {
    const p = new Product({ ...base, serialNumber: "SN-999" });
    expect(p.serialNumber).toBe("SN-999");
  });

  test("6. supports legacy `warranty` alias for warrantyStatus", () => {
    const withWarranty = new Product({ ...base, warranty: true });
    const withoutWarranty = new Product({ ...base, warranty: false });
    expect(withWarranty.warrantyStatus).toBe(true);
    expect(withoutWarranty.warrantyStatus).toBe(false);
  });

  test("7. supports legacy `distributor` alias for distributorInfo", () => {
    const p = new Product({ ...base, distributor: "AcmeCo" });
    expect(p.distributorInfo).toBe("AcmeCo");
  });

  test("8. preserves explicit quantityInStock of 0 (does not treat as missing)", () => {
    const p = new Product({ ...base, quantityInStock: 0 });
    expect(p.quantityInStock).toBe(0);
  });

  test("9. defaults images to [] when a non-array value is provided", () => {
    const withString = new Product({ ...base, images: "not-an-array" });
    const withNull = new Product({ ...base, images: null });
    expect(withString.images).toEqual([]);
    expect(withNull.images).toEqual([]);
  });

  test("10. keeps all provided real values intact", () => {
    const p = new Product({
      id: "p42",
      name: "Sunset Board",
      model: "sunset",
      serialNumber: "SN-42",
      description: "a surfboard",
      quantityInStock: 7,
      price: 199.99,
      warrantyStatus: true,
      distributorInfo: "SurfCo",
      categoryName: "surfboards",
      color: "red",
      size: "L",
      gender: "unisex",
      vatRate: 18,
      images: ["a.png", "b.png"],
      popularity: 5,
    });

    expect(p).toEqual({
      id: "p42",
      name: "Sunset Board",
      model: "sunset",
      serialNumber: "SN-42",
      description: "a surfboard",
      quantityInStock: 7,
      price: 199.99,
      warrantyStatus: true,
      distributorInfo: "SurfCo",
      categoryName: "surfboards",
      color: "red",
      size: "L",
      gender: "unisex",
      vatRate: 18,
      images: ["a.png", "b.png"],
      popularity: 5,
    });
  });
});
