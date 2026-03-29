const express = require("express");
const Product = require("./models/Product");

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

// PRODUCT DATA
const products = [
  {
    ...new Product({
      id: "S-14101",
      model: "S-141",
      serialNumber: "S-14101",
      warranty: "2 years",
      distributor: "scyllastore",
      name: "Seashell Necklace",
      price: 699.9
    }),
    categoryId: "cat-necklace"
  },
  {
    ...new Product({
      id: "S-12001",
      model: "S-120",
      serialNumber: "S-12001",
      warranty: "2 years",
      distributor: "scyllastore",
      name: "Shell Bikini Set",
      price: 999.9
    }),
    categoryId: "cat-bikini-set"
  },
  {
    ...new Product({
      id: "S-13001",
      model: "S-130",
      serialNumber: "S-13001",
      warranty: "2 years",
      distributor: "scyllastore",
      name: "Starfish Earrings",
      price: 499.9
    }),
    categoryId: "cat-earrings"
  },
  {
    ...new Product({
      id: "S-15001",
      model: "S-150",
      serialNumber: "S-15001",
      warranty: "2 years",
      distributor: "scyllastore",
      name: "Ocean Charm Bracelet",
      price: 799.9
    }),
    categoryId: "cat-bracelet"
  },
  {
    ...new Product({
      id: "S-16001",
      model: "S-160",
      serialNumber: "S-16001",
      warranty: "2 years",
      distributor: "scyllastore",
      name: "Pearl Summer Set",
      price: 1199.9
    }),
    categoryId: "cat-summer-set"
  }
];

// GET ALL PRODUCTS
app.get("/api/products", (req, res) => {
  res.json(products);
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