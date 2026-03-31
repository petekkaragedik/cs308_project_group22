const express = require("express");
const Product = require("./models/Product");
const rawProducts = require("./data/products");

const app = express();
app.use(express.json());

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server is running");
});

// LOGIN ROUTE
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "test@test.com" && password === "1234") {
    return res.json({ message: "Login successful" });
  } else {
    return res.status(401).json({ message: "Invalid credentials" });
  }
});

// CATEGORY DATA
const categories = [
  { id: "cat-necklace", name: "Fashion Necklace" },
  { id: "cat-bikini-set", name: "Bikini Set" },
  { id: "cat-earrings", name: "Earrings" },
  { id: "cat-bracelet", name: "Bracelet" },
  { id: "cat-summer-set", name: "Summer Set" }
];

// PRODUCT DATA — all 253 products from mockProducts
const products = rawProducts.map((p) => new Product(p));

// GET ALL PRODUCTS
app.get("/api/products", (req, res) => {
  res.json(products);
});

// GET SINGLE PRODUCT
app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

// GET ALL CATEGORIES
app.get("/api/categories", (req, res) => {
  res.json(categories);
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
}

module.exports = app;