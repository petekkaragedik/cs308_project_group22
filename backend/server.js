const express = require("express");
const Product = require("./models/Product"); // 👈 EKLEDİK

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

// 🆕 PRODUCTS DATA (şimdilik hardcoded)
const products = [
  new Product({
    id: "S-14101",
    model: "S-141",
    serialNumber: "S-14101",
    warranty: "2 years",
    distributor: "scyllastore",
    name: "Seashell Necklace",
    price: 699.9
  }),
  new Product({
    id: "S-12001",
    model: "S-120",
    serialNumber: "S-12001",
    warranty: "2 years",
    distributor: "scyllastore",
    name: "Shell Bikini Set",
    price: 999.9
  })
];

// 🆕 GET ALL PRODUCTS
app.get("/api/products", (req, res) => {
  res.json(products);
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
}

module.exports = app;