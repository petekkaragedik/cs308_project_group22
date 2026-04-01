const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* ─── In-memory cart (will be replaced with DB queries later) ─── */
let cartItems = [];
let nextId = 1;

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

// ─── Cart Endpoints ────────────────────────────────────

// GET /api/cart — return all cart items
app.get("/api/cart", (req, res) => {
  res.json(cartItems);
});

// POST /api/cart — add an item (or increment if same product+size exists)
app.post("/api/cart", (req, res) => {
  const { product_id, size } = req.body;
  if (!product_id || !size) {
    return res.status(400).json({ message: "product_id and size are required" });
  }

  const existing = cartItems.find(
    (i) => i.product_id === product_id && i.size === size
  );

  if (existing) {
    existing.quantity += 1;
    return res.json(existing);
  }

  const item = { id: nextId++, product_id, size, quantity: 1 };
  cartItems.push(item);
  res.status(201).json(item);
});

// PUT /api/cart/:id — update quantity
app.put("/api/cart/:id", (req, res) => {
  const id = Number(req.params.id);
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return res.status(400).json({ message: "quantity must be at least 1" });
  }

  const item = cartItems.find((i) => i.id === id);
  if (!item) {
    return res.status(404).json({ message: "Cart item not found" });
  }

  item.quantity = quantity;
  res.json(item);
});

// DELETE /api/cart/:id — remove an item
app.delete("/api/cart/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = cartItems.findIndex((i) => i.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Cart item not found" });
  }

  cartItems.splice(index, 1);
  res.json({ message: "Item removed" });
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
}

module.exports = app;