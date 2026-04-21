const path = require("path");
// Always load .env from the backend/ folder (not the shell's current working directory)
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const express = require("express");
const cors = require("cors");
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const createOrderRoutes = require("./routes/orders");

const app = express();
// Allow browser calls from CRA (any port / localhost vs 127.0.0.1) when using REACT_APP_API_URL
app.use(cors({ origin: true, credentials: true }));
// Larger limit needed for base64-encoded avatar uploads
app.use(express.json({ limit: '8mb' }));

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

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
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

// ─── Email (dev-safe) ──────────────────────────────────

const mailer = (() => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return {
    sendMail: async (opts) => {
      console.log('\n─── DEV EMAIL (no SMTP configured) ───');
      console.log('To:     ', opts.to);
      console.log('Subject:', opts.subject);
      console.log(opts.text || opts.html);
      console.log('──────────────────────────────────────\n');
      return { messageId: 'dev-' + Date.now() };
    },
  };
})();

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@scylla.local';

// ─── Profile ───────────────────────────────────────────

// GET /api/me — current user profile
app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, phone, avatar_url, role, created_at FROM users WHERE id = ?",
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/me error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// PUT /api/me — update name + phone
app.put("/api/me", requireAuth, async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (phone && phone.length > 30) {
    return res.status(400).json({ message: "Phone is too long" });
  }
  try {
    await db.query(
      "UPDATE users SET name = ?, phone = ? WHERE id = ?",
      [name.trim(), phone ? phone.trim() : null, req.user.id]
    );
    const [rows] = await db.query(
      "SELECT id, name, email, phone, avatar_url, role FROM users WHERE id = ?",
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/me error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// POST /api/me/avatar — { dataUrl }
app.post("/api/me/avatar", requireAuth, async (req, res) => {
  const { dataUrl } = req.body;
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return res.status(400).json({ message: "Valid image data URL required" });
  }
  if (dataUrl.length > 7_500_000) {
    return res.status(413).json({ message: "Image too large (max ~5MB)" });
  }
  try {
    await db.query("UPDATE users SET avatar_url = ? WHERE id = ?", [dataUrl, req.user.id]);
    res.json({ avatar_url: dataUrl });
  } catch (err) {
    console.error("POST /api/me/avatar error:", err);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
});

// DELETE /api/me/avatar
app.delete("/api/me/avatar", requireAuth, async (req, res) => {
  try {
    await db.query("UPDATE users SET avatar_url = NULL WHERE id = ?", [req.user.id]);
    res.json({ avatar_url: null });
  } catch (err) {
    console.error("DELETE /api/me/avatar error:", err);
    res.status(500).json({ message: "Failed to remove avatar" });
  }
});

// ─── Password change with email confirmation ───────────

// POST /api/me/password/request
// Body: { currentPassword, newPassword }
// Verifies current password, stores HASHED new password keyed by a random token,
// emails the user a confirmation link. Change only takes effect when confirmed.
app.post("/api/me/password/request", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new password required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters" });
  }
  try {
    const [rows] = await db.query("SELECT id, email, password FROM users WHERE id = ?", [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });
    const user = rows[0];

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ message: "Current password is incorrect" });

    // Invalidate any previous pending tokens for this user
    await db.query("DELETE FROM password_reset_tokens WHERE user_id = ? AND used = 0", [user.id]);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const newHash = await bcrypt.hash(newPassword, 10);
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      "INSERT INTO password_reset_tokens (token_hash, user_id, new_password_hash, expires_at) VALUES (?, ?, ?, ?)",
      [tokenHash, user.id, newHash, expires]
    );

    const confirmUrl = `${APP_URL}/password/confirm?token=${rawToken}`;
    await mailer.sendMail({
      from: FROM_EMAIL,
      to: user.email,
      subject: "Confirm your Scylla password change",
      text: `Hello,\n\nWe received a request to change your Scylla password.\n` +
            `Click the link below within 15 minutes to confirm:\n\n${confirmUrl}\n\n` +
            `If you didn't request this, you can safely ignore this email — your password will not change.`,
    });

    res.json({ message: "Confirmation email sent" });
  } catch (err) {
    console.error("password/request error:", err);
    res.status(500).json({ message: "Failed to initiate password change" });
  }
});

// POST /api/password/confirm — public (token carries the auth)
// Body: { token }
app.post("/api/password/confirm", async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: "Token required" });
  }
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await db.query(
      "SELECT user_id, new_password_hash, expires_at, used FROM password_reset_tokens WHERE token_hash = ?",
      [tokenHash]
    );
    if (rows.length === 0) return res.status(400).json({ message: "Invalid token" });

    const t = rows[0];
    if (t.used) return res.status(400).json({ message: "Token already used" });
    if (new Date(t.expires_at) < new Date()) {
      return res.status(400).json({ message: "Token expired" });
    }

    await db.query("UPDATE users SET password = ? WHERE id = ?", [t.new_password_hash, t.user_id]);
    await db.query("UPDATE password_reset_tokens SET used = 1 WHERE token_hash = ?", [tokenHash]);

    res.json({ message: "Password updated" });
  } catch (err) {
    console.error("password/confirm error:", err);
    res.status(500).json({ message: "Failed to confirm password change" });
  }
});

// ─── Addresses ─────────────────────────────────────────

app.get("/api/me/addresses", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET addresses error:", err);
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
});

function validateAddress(body) {
  const { label, recipient, line1, city } = body;
  if (!label || !label.trim()) return "Label is required";
  if (!recipient || !recipient.trim()) return "Recipient is required";
  if (!line1 || !line1.trim()) return "Street address is required";
  if (!city || !city.trim()) return "City is required";
  return null;
}

app.post("/api/me/addresses", requireAuth, async (req, res) => {
  const err = validateAddress(req.body);
  if (err) return res.status(400).json({ message: err });
  const { label, recipient, line1, city, postal, country, isDefault } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (isDefault) {
      await conn.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [req.user.id]);
    } else {
      // If user has no addresses, first one becomes default
      const [[c]] = await conn.query("SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?", [req.user.id]);
      if (c.n === 0) req.body.isDefault = true;
    }
    const [result] = await conn.query(
      `INSERT INTO addresses (user_id, label, recipient, line1, city, postal, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, label.trim(), recipient.trim(), line1.trim(), city.trim(),
       postal || null, country || 'Türkiye', req.body.isDefault ? 1 : 0]
    );
    await conn.commit();
    const [rows] = await db.query("SELECT * FROM addresses WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) {
    await conn.rollback();
    console.error("POST address error:", e);
    res.status(500).json({ message: "Failed to add address" });
  } finally {
    conn.release();
  }
});

app.put("/api/me/addresses/:id", requireAuth, async (req, res) => {
  const err = validateAddress(req.body);
  if (err) return res.status(400).json({ message: err });
  const { label, recipient, line1, city, postal, country } = req.body;
  try {
    const [result] = await db.query(
      `UPDATE addresses
       SET label = ?, recipient = ?, line1 = ?, city = ?, postal = ?, country = ?
       WHERE id = ? AND user_id = ?`,
      [label.trim(), recipient.trim(), line1.trim(), city.trim(),
       postal || null, country || 'Türkiye', req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Address not found" });
    const [rows] = await db.query("SELECT * FROM addresses WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (e) {
    console.error("PUT address error:", e);
    res.status(500).json({ message: "Failed to update address" });
  }
});

app.post("/api/me/addresses/:id/default", requireAuth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[addr]] = await conn.query(
      "SELECT id FROM addresses WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (!addr) {
      await conn.rollback();
      return res.status(404).json({ message: "Address not found" });
    }
    await conn.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [req.user.id]);
    await conn.query("UPDATE addresses SET is_default = 1 WHERE id = ?", [req.params.id]);
    await conn.commit();
    res.json({ message: "Default address updated" });
  } catch (e) {
    await conn.rollback();
    console.error("default address error:", e);
    res.status(500).json({ message: "Failed to set default address" });
  } finally {
    conn.release();
  }
});

app.delete("/api/me/addresses/:id", requireAuth, async (req, res) => {
  try {
    const [[addr]] = await db.query(
      "SELECT id, is_default FROM addresses WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (!addr) return res.status(404).json({ message: "Address not found" });
    if (addr.is_default) {
      return res.status(400).json({ message: "Cannot delete the default address" });
    }
    await db.query("DELETE FROM addresses WHERE id = ?", [req.params.id]);
    res.json({ message: "Address deleted" });
  } catch (e) {
    console.error("DELETE address error:", e);
    res.status(500).json({ message: "Failed to delete address" });
  }
});

// ─── Orders ────────────────────────────────────────────

// GET /api/me/orders — returns all orders grouped with their items
app.get("/api/me/orders", requireAuth, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT id, invoice_number, status, total_amount, currency, created_at
       FROM orders WHERE customer_email = ? ORDER BY created_at DESC`,
      [req.user.email]
    );
    if (orders.length === 0) return res.json([]);

    const ids = orders.map(o => o.id);
    const [items] = await db.query(
      `SELECT order_id, id, product_id, product_name, size, quantity, unit_price, line_total
       FROM order_items WHERE order_id IN (?)`,
      [ids]
    );

    const byOrder = items.reduce((acc, it) => {
      (acc[it.order_id] = acc[it.order_id] || []).push({
        id: it.id,
        productId: it.product_id,
        name: it.product_name,
        size: it.size,
        qty: it.quantity,
        price: Number(it.unit_price),
        lineTotal: Number(it.line_total),
      });
      return acc;
    }, {});

    res.json(orders.map(o => ({
      id: o.invoice_number,
      placedAt: o.created_at,
      status: o.status === 'in_transit' ? 'in-transit' : o.status,
      total: Number(o.total_amount),
      currency: o.currency,
      items: byOrder[o.id] || [],
    })));
  } catch (err) {
    console.error("GET orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// ─── Favorites ─────────────────────────────────────────

// GET /api/favorites — return favorite products for the authenticated user
app.get("/api/favorites", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, f.created_at AS favorited_at
       FROM favorites f
       JOIN products p ON p.id = f.product_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    const formatted = rows.map(product => ({
      ...product,
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Favorites query error:", error);
    res.status(500).json({ message: "Failed to fetch favorites" });
  }
});

// POST /api/favorites — add a product to the authenticated user's favorites
app.post("/api/favorites", requireAuth, async (req, res) => {
  const { product_id } = req.body;

  if (product_id === undefined || product_id === null || product_id === "") {
    return res.status(400).json({ message: "product_id is required" });
  }

  try {
    const [productRows] = await db.query(
      "SELECT id FROM products WHERE id = ?",
      [product_id]
    );
    if (productRows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [result] = await db.query(
      "INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)",
      [req.user.id, String(product_id)]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ message: "Product already in favorites" });
    }

    return res.status(201).json({
      message: "Product added to favorites",
      favorite: { user_id: req.user.id, product_id: String(product_id) }
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({ message: "Failed to add favorite" });
  }
});

// DELETE /api/favorites/:productId — remove a product from the authenticated user's favorites
app.delete("/api/favorites/:productId", requireAuth, async (req, res) => {
  const { productId } = req.params;

  try {
    const [result] = await db.query(
      "DELETE FROM favorites WHERE user_id = ? AND product_id = ?",
      [req.user.id, productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    res.json({ message: "Product removed from favorites" });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ message: "Failed to remove favorite" });
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

app.use("/api/orders", createOrderRoutes(db));

if (require.main === module) {
  app.listen(3001, () => {
    console.log("Server running on port 3001");
  });
}

module.exports = app;
