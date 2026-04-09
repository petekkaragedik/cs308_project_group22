require('dotenv').config();
const express = require("express");
const cors = require("cors");
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Product = require("./models/Product");

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// db connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// test route
app.get("/", (req, res) => {
  res.send("Server is running with MySQL");
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '7d' }
  );
}

// register
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Valid email is required" });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  try {
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name.trim(), email.toLowerCase(), hashed]
    );

    const user = { id: result.insertId, email: email.toLowerCase(), role: 'customer' };
    return res.status(201).json({
      message: "Registration successful",
      token: signToken(user),
      user: { id: user.id, name: name.trim(), email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json({
      message: "Login successful",
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

app.get("/api/categories", async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DISTINCT categoryName FROM products WHERE categoryName IS NOT NULL AND categoryName != '' ORDER BY categoryName"
    );
    res.json(rows.map(r => r.categoryName));
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// search products by name or description
app.get("/api/products/search", async (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ message: "Search query is required" });
  }

  try {
    const term = `%${q.trim()}%`;
    const [rows] = await db.query(
      "SELECT * FROM products WHERE name LIKE ? OR description LIKE ?",
      [term, term]
    );

    const formattedRows = rows.map(product => ({
      ...product,
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Search failed" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM products");

    const formattedRows = rows.map(product => {
      return {
        ...product,
        images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images
      };
    });

    res.json(formattedRows);
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).json({ message: "Failed to fetch products from database" });
  }
});

app.get("/api/products/category/:categoryName", async (req, res) => {
  try {
    const { categoryName } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM products WHERE categoryName = ?",
      [categoryName]
    );

    const formattedRows = rows.map(product => ({
      ...product,
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).json({ message: "Failed to fetch products by category" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = rows[0];

    if (typeof product.images === 'string') {
      product.images = JSON.parse(product.images);
    }

    const [variantRows] = await db.query(
      "SELECT * FROM products WHERE model = ? AND id != ?",
      [product.model, product.id]
    );

    product.modelVariants = variantRows.map(v => ({
      ...v,
      images: typeof v.images === 'string' ? JSON.parse(v.images) : v.images
    }));

    res.json(product);
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).json({ message: "Failed to fetch product from database" });
  }
});

// ─── Cart Endpoints ────────────────────────────────────
// NOTE: Using in-memory storage for now.
// When DB cart table is ready, replace cartItems array with DB queries.

let cartItems = [];
let nextId = 1;

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
  app.listen(3001, () => {
    console.log("Server running on port 3001");
  });
}

module.exports = app;
