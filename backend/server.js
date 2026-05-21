const path = require("path");
// Always load .env from the backend/ folder (not the shell's current working directory)
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const express = require("express");
const cors = require("cors");
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const createProductRoutes = require('./routes/products');
const { sendPasswordResetEmail } = require('./services/passwordResetEmail');

const createOrderRoutes = require("./routes/orders");
const createReturnRoutes = require("./routes/returns");
const createDiscountRoutes = require("./routes/discounts");
const createNotificationRoutes = require("./routes/notifications");
const { encrypt, decrypt } = require("./utils/encrypt");

const app = express();

// Allow browser calls from CRA (any port / localhost vs 127.0.0.1) when using REACT_APP_API_URL
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());


// db connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Ensure the addresses table exists even if setup.js hasn't been re-run.
// Idempotent; safe to run on every boot.
let addressesTableReady = null;
function ensureAddressesTable() {
  if (!addressesTableReady) {
    addressesTableReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS addresses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          label VARCHAR(50) NOT NULL,
          recipient VARCHAR(512) NOT NULL,
          line1 VARCHAR(1024) NOT NULL,
          city VARCHAR(512) NOT NULL,
          postal VARCHAR(256) DEFAULT NULL,
          country VARCHAR(100) NOT NULL DEFAULT 'Türkiye',
          is_default TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_addresses_user (user_id)
        )
      `);
      // Migration: widen encrypted columns on existing installs.
      // Encrypted output (IV + tag + hex ciphertext) is far longer than plaintext.
      await db.query("ALTER TABLE addresses MODIFY recipient VARCHAR(512) NOT NULL");
      await db.query("ALTER TABLE addresses MODIFY line1 VARCHAR(1024) NOT NULL");
      await db.query("ALTER TABLE addresses MODIFY city VARCHAR(512) NOT NULL");
      await db.query("ALTER TABLE addresses MODIFY postal VARCHAR(256) DEFAULT NULL");
    })().catch((err) => {
      addressesTableReady = null;
      throw err;
    });
  }
  return addressesTableReady;
}

// test route
app.get("/", (req, res) => {
  res.send("Server is running with MySQL");
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LOW_STOCK_THRESHOLD = 5;
const MIN_PRICE_FLOOR = 0;

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

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
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

// ─── Password Reset ────────────────────────────────────

// POST /api/forgot-password — request password reset
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Valid email is required" });
  }

  try {
    // Look up user by email (case-insensitive)
    const [users] = await db.query("SELECT id, email FROM users WHERE email = ?", [email.toLowerCase()]);

    // Security: Always return 200 (don't reveal if email exists)
    if (users.length === 0) {
      return res.json({ message: "If that email exists, we sent a reset link" });
    }

    const user = users[0];

    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Delete any existing tokens for this user
    await db.query("DELETE FROM password_reset_tokens WHERE user_id = ?", [user.id]);

    // Store new token with 1-hour expiry
    await db.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))",
      [user.id, token]
    );

    // Send reset email (async, don't wait)
    sendPasswordResetEmail({ to: user.email, resetToken: token }).catch(err => {
      console.error("Failed to send password reset email:", err);
    });

    res.json({ message: "If that email exists, we sent a reset link" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to process request" });
  }
});

// POST /api/reset-password — reset password with valid token
app.post("/api/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !token.trim()) {
    return res.status(400).json({ message: "Reset token is required" });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Find valid token (not expired)
    const [tokens] = await conn.query(
      "SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()",
      [token.trim()]
    );

    if (tokens.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const userId = tokens[0].user_id;

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await conn.query("UPDATE users SET password = ? WHERE id = ?", [hashed, userId]);

    // Delete the used token (and all others for this user)
    await conn.query("DELETE FROM password_reset_tokens WHERE user_id = ?", [userId]);

    await conn.commit();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    try { await conn?.rollback(); } catch (_) { /* ignore */ }
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  } finally {
    conn?.release();
  }
});

// GET /api/profile — return authenticated user's profile
app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// PUT /api/profile — update authenticated user's name
app.put("/api/profile", requireAuth, async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  const trimmed = name.trim();
  if (trimmed.length > 100) {
    return res.status(400).json({ message: "Name must be 100 characters or fewer" });
  }

  try {
    const [result] = await db.query(
      "UPDATE users SET name = ? WHERE id = ?",
      [trimmed, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const [rows] = await db.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// GET /api/profile/orders — return authenticated user's orders (matched by email)
app.get("/api/profile/orders", requireAuth, async (req, res) => {
  try {
    const [orderRows] = await db.query(
      `SELECT id, invoice_number, total_amount, currency, status, created_at
       FROM orders
       WHERE customer_email = ?
       ORDER BY created_at DESC`,
      [req.user.email]
    );

    if (orderRows.length === 0) {
      return res.json([]);
    }

    const orderIds = orderRows.map((o) => o.id);
    const [itemRows] = await db.query(
      `SELECT oi.order_id, oi.product_id, oi.product_name, oi.size, oi.quantity, oi.unit_price, oi.line_total, p.color
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id IN (?)
       ORDER BY oi.id`,
      [orderIds]
    );

    const itemsByOrder = new Map();
    for (const it of itemRows) {
      if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
      itemsByOrder.get(it.order_id).push({
        id: it.product_id,
        name: it.product_name,
        color: it.color || null,
        size: it.size,
        qty: it.quantity,
        price: Number(it.unit_price),
        lineTotal: Number(it.line_total),
        image: null,
      });
    }

    const payload = orderRows.map((o) => ({
      id: o.invoice_number,
      orderId: o.id,
      placedAt: o.created_at,
      status: String(o.status).replace(/_/g, '-'),
      total: Number(o.total_amount),
      currency: o.currency || 'TRY',
      items: itemsByOrder.get(o.id) || [],
    }));

    res.json(payload);
  } catch (error) {
    console.error("Profile orders fetch error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// ─── Profile Addresses ──────────────────────────────────

function mapAddress(row) {
  return {
    id: row.id,
    label: row.label,
    recipient: decrypt(row.recipient),
    line1: decrypt(row.line1),
    city: decrypt(row.city),
    postal: decrypt(row.postal) || '',
    country: row.country,
    isDefault: !!row.is_default,
  };
}

function validateAddressBody(body) {
  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  const recipient = typeof body?.recipient === 'string' ? body.recipient.trim() : '';
  const line1 = typeof body?.line1 === 'string' ? body.line1.trim() : '';
  const city = typeof body?.city === 'string' ? body.city.trim() : '';
  const postal = typeof body?.postal === 'string' ? body.postal.trim() : '';
  const country = typeof body?.country === 'string' && body.country.trim()
    ? body.country.trim()
    : 'Türkiye';
  const isDefault = body?.isDefault === true;

  if (!label) return { error: 'Label is required' };
  if (label.length > 50) return { error: 'Label must be 50 characters or fewer' };
  if (!recipient) return { error: 'Recipient is required' };
  if (recipient.length > 150) return { error: 'Recipient must be 150 characters or fewer' };
  if (!line1) return { error: 'Street address is required' };
  if (line1.length > 255) return { error: 'Street address must be 255 characters or fewer' };
  if (!city) return { error: 'City is required' };
  if (city.length > 100) return { error: 'City must be 100 characters or fewer' };
  if (postal.length > 20) return { error: 'Postal code must be 20 characters or fewer' };
  if (country.length > 100) return { error: 'Country must be 100 characters or fewer' };

  return { data: { label, recipient, line1, city, postal, country, isDefault } };
}

// GET /api/profile/addresses — list authenticated user's addresses
app.get("/api/profile/addresses", requireAuth, async (req, res) => {
  try {
    await ensureAddressesTable();
    const [rows] = await db.query(
      `SELECT id, label, recipient, line1, city, postal, country, is_default, created_at
       FROM addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at ASC, id ASC`,
      [req.user.id]
    );
    res.json(rows.map(mapAddress));
  } catch (error) {
    // If the table genuinely doesn't exist (e.g. setup failed), treat it as
    // "no addresses yet" rather than a fetch error — the user hasn't created any.
    if (error && error.code === 'ER_NO_SUCH_TABLE') {
      return res.json([]);
    }
    console.error("Addresses fetch error:", error);
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
});

// POST /api/profile/addresses — create a new address for the authenticated user
app.post("/api/profile/addresses", requireAuth, async (req, res) => {
  const { data, error } = validateAddressBody(req.body);
  if (error) return res.status(400).json({ message: error });

  let conn;
  try {
    await ensureAddressesTable();
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [existing] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM addresses WHERE user_id = ?",
      [req.user.id]
    );
    const forceDefault = existing[0].cnt === 0;
    const makeDefault = data.isDefault || forceDefault;

    if (makeDefault) {
      await conn.query(
        "UPDATE addresses SET is_default = 0 WHERE user_id = ?",
        [req.user.id]
      );
    }

    const [result] = await conn.query(
      `INSERT INTO addresses (user_id, label, recipient, line1, city, postal, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        data.label,
        encrypt(data.recipient),
        encrypt(data.line1),
        encrypt(data.city),
        data.postal ? encrypt(data.postal) : null,
        data.country,
        makeDefault ? 1 : 0,
      ]
    );

    await conn.commit();

    const [rows] = await db.query(
      `SELECT id, label, recipient, line1, city, postal, country, is_default
       FROM addresses WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json(mapAddress(rows[0]));
  } catch (err) {
    try { await conn?.rollback(); } catch (_) { /* ignore */ }
    console.error("Address create error:", err);
    res.status(500).json({ message: "Failed to create address" });
  } finally {
    conn?.release();
  }
});

// PUT /api/profile/addresses/:id — update an address owned by the authenticated user
app.put("/api/profile/addresses/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    return res.status(400).json({ message: "Invalid address id" });
  }

  const { data, error } = validateAddressBody(req.body);
  if (error) return res.status(400).json({ message: error });

  let conn;
  try {
    await ensureAddressesTable();
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [owned] = await conn.query(
      "SELECT id, is_default FROM addresses WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (owned.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Address not found" });
    }

    const wasDefault = !!owned[0].is_default;
    const makeDefault = data.isDefault || wasDefault;

    if (makeDefault) {
      await conn.query(
        "UPDATE addresses SET is_default = 0 WHERE user_id = ?",
        [req.user.id]
      );
    }

    await conn.query(
      `UPDATE addresses
       SET label = ?, recipient = ?, line1 = ?, city = ?, postal = ?, country = ?, is_default = ?
       WHERE id = ? AND user_id = ?`,
      [
        data.label,
        encrypt(data.recipient),
        encrypt(data.line1),
        encrypt(data.city),
        data.postal ? encrypt(data.postal) : null,
        data.country,
        makeDefault ? 1 : 0,
        id,
        req.user.id,
      ]
    );

    await conn.commit();

    const [rows] = await db.query(
      `SELECT id, label, recipient, line1, city, postal, country, is_default
       FROM addresses WHERE id = ?`,
      [id]
    );
    res.json(mapAddress(rows[0]));
  } catch (err) {
    try { await conn?.rollback(); } catch (_) { /* ignore */ }
    console.error("Address update error:", err);
    res.status(500).json({ message: "Failed to update address" });
  } finally {
    conn?.release();
  }
});

// DELETE /api/profile/addresses/:id — remove an address owned by the authenticated user
app.delete("/api/profile/addresses/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    return res.status(400).json({ message: "Invalid address id" });
  }

  let conn;
  try {
    await ensureAddressesTable();
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [owned] = await conn.query(
      "SELECT id, is_default FROM addresses WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (owned.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Address not found" });
    }

    await conn.query(
      "DELETE FROM addresses WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );

    if (owned[0].is_default) {
      const [next] = await conn.query(
        "SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at ASC, id ASC LIMIT 1",
        [req.user.id]
      );
      if (next.length > 0) {
        await conn.query(
          "UPDATE addresses SET is_default = 1 WHERE id = ?",
          [next[0].id]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Address removed" });
  } catch (err) {
    try { await conn?.rollback(); } catch (_) { /* ignore */ }
    console.error("Address delete error:", err);
    res.status(500).json({ message: "Failed to delete address" });
  } finally {
    conn?.release();
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

app.get("/api/products/filter-meta", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT MIN(price) AS minPrice, MAX(price) AS maxPrice FROM products");
    res.json({ minPrice: Number(rows[0].minPrice) || 0, maxPrice: Number(rows[0].maxPrice) || 0 });
  } catch (error) {
    console.error("Filter meta error:", error);
    res.status(500).json({ message: "Failed to fetch filter metadata" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const { sort } = req.query;

    const limit = Math.max(1, parseInt(req.query.limit, 10) || 12);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const minPriceRaw = parseFloat(req.query.minPrice);
    const maxPriceRaw = parseFloat(req.query.maxPrice);
    const minRatingRaw = parseFloat(req.query.minRating);

    const minPrice = Number.isFinite(minPriceRaw) && minPriceRaw >= MIN_PRICE_FLOOR ? minPriceRaw : null;
    const maxPrice = Number.isFinite(maxPriceRaw) ? maxPriceRaw : null;
    const minRating = Number.isFinite(minRatingRaw) ? minRatingRaw : null;
    const inStock = req.query.inStock === 'true';
    const colors = req.query.colors ? req.query.colors.split(',').map(c => c.trim()).filter(Boolean) : [];

    const needsRatingJoin = sort === 'popularity' || minRating !== null;

    const whereConds = [];
    const filterParams = [];

    if (minPrice !== null) {
      whereConds.push(needsRatingJoin ? 'p.price >= ?' : 'price >= ?');
      filterParams.push(minPrice);
    }
    if (maxPrice !== null) {
      whereConds.push(needsRatingJoin ? 'p.price <= ?' : 'price <= ?');
      filterParams.push(maxPrice);
    }
    if (minRating !== null) {
      whereConds.push('COALESCE(r.avg_rating, 0) >= ?');
      filterParams.push(minRating);
    }
    if (inStock) {
      whereConds.push(needsRatingJoin ? 'p.quantityInStock > 0' : 'quantityInStock > 0');
    }
    if (colors.length > 0) {
      const placeholders = colors.map(() => '?').join(', ');
      whereConds.push(needsRatingJoin ? `p.color IN (${placeholders})` : `color IN (${placeholders})`);
      filterParams.push(...colors);
    }

    const whereClause = whereConds.length > 0 ? `WHERE ${whereConds.join(' AND ')}` : '';

    let orderBy = '';
    if (sort === 'price_asc') orderBy = needsRatingJoin ? 'ORDER BY p.price ASC' : 'ORDER BY price ASC';
    else if (sort === 'price_desc') orderBy = needsRatingJoin ? 'ORDER BY p.price DESC' : 'ORDER BY price DESC';
    else if (sort === 'popularity') orderBy = 'ORDER BY avg_rating DESC';

    let dataQuery, countQuery;
    if (needsRatingJoin) {
      const ratingSubquery = `LEFT JOIN (SELECT product_id, AVG(rating) AS avg_rating FROM ratings GROUP BY product_id) r ON r.product_id = p.id`;
      dataQuery = `SELECT p.*, COALESCE(r.avg_rating, 0) AS avg_rating FROM products p ${ratingSubquery} ${whereClause} ${orderBy} LIMIT ? OFFSET ?`;
      countQuery = `SELECT COUNT(*) AS total FROM products p ${ratingSubquery} ${whereClause}`;
    } else {
      dataQuery = `SELECT * FROM products ${whereClause} ${orderBy} LIMIT ? OFFSET ?`;
      countQuery = `SELECT COUNT(*) AS total FROM products ${whereClause}`;
    }

    const [[countRows], [rows]] = await Promise.all([
      db.query(countQuery, filterParams),
      db.query(dataQuery, [...filterParams, limit, offset]),
    ]);

    const products = rows.map(product => ({
      ...product,
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images
    }));

    const total = countRows[0].total;
    res.json({
      data: products,
      pagination: { total, limit, offset, hasMore: offset + products.length < total },
    });
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).json({ message: "Failed to fetch products from database" });
  }
});

app.get("/api/products/category/:categoryName", async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { sort } = req.query;

    const limit = Math.max(1, parseInt(req.query.limit, 10) || 12);
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const minPriceRaw = parseFloat(req.query.minPrice);
    const maxPriceRaw = parseFloat(req.query.maxPrice);
    const minRatingRaw = parseFloat(req.query.minRating);

    const minPrice = Number.isFinite(minPriceRaw) && minPriceRaw >= MIN_PRICE_FLOOR ? minPriceRaw : null;
    const maxPrice = Number.isFinite(maxPriceRaw) ? maxPriceRaw : null;
    const minRating = Number.isFinite(minRatingRaw) ? minRatingRaw : null;
    const inStock = req.query.inStock === 'true';
    const colors = req.query.colors ? req.query.colors.split(',').map(c => c.trim()).filter(Boolean) : [];

    const needsRatingJoin = sort === 'popularity' || minRating !== null;

    const whereConds = [needsRatingJoin ? 'p.categoryName = ?' : 'categoryName = ?'];
    const filterParams = [categoryName];

    if (minPrice !== null) {
      whereConds.push(needsRatingJoin ? 'p.price >= ?' : 'price >= ?');
      filterParams.push(minPrice);
    }
    if (maxPrice !== null) {
      whereConds.push(needsRatingJoin ? 'p.price <= ?' : 'price <= ?');
      filterParams.push(maxPrice);
    }
    if (minRating !== null) {
      whereConds.push('COALESCE(r.avg_rating, 0) >= ?');
      filterParams.push(minRating);
    }
    if (inStock) {
      whereConds.push(needsRatingJoin ? 'p.quantityInStock > 0' : 'quantityInStock > 0');
    }
    if (colors.length > 0) {
      const placeholders = colors.map(() => '?').join(', ');
      whereConds.push(needsRatingJoin ? `p.color IN (${placeholders})` : `color IN (${placeholders})`);
      filterParams.push(...colors);
    }

    const whereClause = `WHERE ${whereConds.join(' AND ')}`;

    let orderBy = '';
    if (sort === 'price_asc') orderBy = needsRatingJoin ? 'ORDER BY p.price ASC' : 'ORDER BY price ASC';
    else if (sort === 'price_desc') orderBy = needsRatingJoin ? 'ORDER BY p.price DESC' : 'ORDER BY price DESC';
    else if (sort === 'popularity') orderBy = 'ORDER BY avg_rating DESC';

    let dataQuery, countQuery;
    if (needsRatingJoin) {
      const ratingSubquery = `LEFT JOIN (SELECT product_id, AVG(rating) AS avg_rating FROM ratings GROUP BY product_id) r ON r.product_id = p.id`;
      dataQuery = `SELECT p.*, COALESCE(r.avg_rating, 0) AS avg_rating FROM products p ${ratingSubquery} ${whereClause} ${orderBy} LIMIT ? OFFSET ?`;
      countQuery = `SELECT COUNT(*) AS total FROM products p ${ratingSubquery} ${whereClause}`;
    } else {
      dataQuery = `SELECT * FROM products ${whereClause} ${orderBy} LIMIT ? OFFSET ?`;
      countQuery = `SELECT COUNT(*) AS total FROM products ${whereClause}`;
    }

    const [[countRows], [rows]] = await Promise.all([
      db.query(countQuery, filterParams),
      db.query(dataQuery, [...filterParams, limit, offset]),
    ]);

    const total = countRows[0].total;
    const data = rows.map(product => ({
      ...product,
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images
    }));

    res.json({
      data,
      pagination: { total, limit, offset, hasMore: offset + data.length < total },
    });
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

// ─── Ratings & Comments ────────────────────────────────

// POST /api/products/:productId/ratings — submit or update a rating (1-5)
app.post("/api/products/:productId/ratings", requireAuth, async (req, res) => {
  const { productId } = req.params;
  const rating = Number(req.body?.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
  }

  try {
    const [productRows] = await db.query("SELECT id FROM products WHERE id = ?", [productId]);
    if (productRows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    await db.query(
      `INSERT INTO ratings (user_id, product_id, rating) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating)`,
      [req.user.id, productId, rating]
    );

    const [rows] = await db.query(
      "SELECT id, user_id, product_id, rating, created_at, updated_at FROM ratings WHERE user_id = ? AND product_id = ?",
      [req.user.id, productId]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Submit rating error:", error);
    res.status(500).json({ message: "Failed to submit rating" });
  }
});

// GET /api/products/:productId/ratings — public: average + count
app.get("/api/products/:productId/ratings", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT AVG(rating) AS average, COUNT(*) AS count FROM ratings WHERE product_id = ?",
      [req.params.productId]
    );
    const average = rows[0].average == null ? 0 : Number(rows[0].average);
    return res.json({ average: Math.round(average * 100) / 100, count: Number(rows[0].count) });
  } catch (error) {
    console.error("Get ratings error:", error);
    res.status(500).json({ message: "Failed to fetch ratings" });
  }
});

// GET /api/products/:productId/can-review — authenticated: did the user receive a delivered order containing this product?
app.get("/api/products/:productId/can-review", requireAuth, async (req, res) => {
  const { productId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT 1 FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'
       LIMIT 1`,
      [req.user.id, productId]
    );
    return res.json({ canReview: rows.length > 0 });
  } catch (error) {
    console.error("Can review check error:", error);
    res.status(500).json({ message: "Failed to check purchase status" });
  }
});

// POST /api/products/:productId/comments — submit a comment (pending approval)
app.post("/api/products/:productId/comments", requireAuth, async (req, res) => {
  const { productId } = req.params;
  const body = typeof req.body?.body === 'string' ? req.body.body.trim()
    : typeof req.body?.comment === 'string' ? req.body.comment.trim()
    : '';

  if (!body) {
    return res.status(400).json({ message: "Comment body is required" });
  }
  if (body.length > 2000) {
    return res.status(400).json({ message: "Comment is too long (max 2000 characters)" });
  }

  try {
    const [productRows] = await db.query("SELECT id FROM products WHERE id = ?", [productId]);
    if (productRows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [purchaseRows] = await db.query(
      `SELECT 1 FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'
       LIMIT 1`,
      [req.user.id, productId]
    );
    if (purchaseRows.length === 0) {
      return res.status(403).json({ message: "You must purchase this product before commenting on it" });
    }

    const [result] = await db.query(
      "INSERT INTO comments (user_id, product_id, body, status) VALUES (?, ?, ?, 'pending')",
      [req.user.id, productId, body]
    );

    const [rows] = await db.query(
      "SELECT id, user_id, product_id, body, status, created_at FROM comments WHERE id = ?",
      [result.insertId]
    );
    return res.status(201).json({
      message: "Comment submitted and awaiting approval",
      comment: rows[0]
    });
  } catch (error) {
    console.error("Submit comment error:", error);
    res.status(500).json({ message: "Failed to submit comment" });
  }
});

// GET /api/products/:productId/comments — public: only approved comments
app.get("/api/products/:productId/comments", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id, c.product_id, c.body, c.created_at, u.name AS user_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.product_id = ? AND c.status = 'approved'
       ORDER BY c.created_at DESC`,
      [req.params.productId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// ─── Comment Moderation (Product Manager only) ─────────

// GET /api/admin/comments?status=pending — list comments for moderation
app.get("/api/admin/comments", requireAuth, requireRole('product_manager'), async (req, res) => {
  const status = req.query.status;
  const allowed = ['pending', 'approved', 'rejected'];
  try {
    let rows;
    if (status && allowed.includes(status)) {
      [rows] = await db.query(
        `SELECT c.id, c.product_id, c.body, c.status, c.created_at, c.updated_at,
                u.id AS user_id, u.name AS user_name, u.email AS user_email
         FROM comments c JOIN users u ON u.id = c.user_id
         WHERE c.status = ? ORDER BY c.created_at DESC`,
        [status]
      );
    } else {
      [rows] = await db.query(
        `SELECT c.id, c.product_id, c.body, c.status, c.created_at, c.updated_at,
                u.id AS user_id, u.name AS user_name, u.email AS user_email
         FROM comments c JOIN users u ON u.id = c.user_id
         ORDER BY c.created_at DESC`
      );
    }
    res.json(rows);
  } catch (error) {
    console.error("Admin list comments error:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// POST /api/admin/comments/:id/approve
app.post("/api/admin/comments/:id/approve", requireAuth, requireRole('product_manager'), async (req, res) => {
  try {
    const [result] = await db.query(
      "UPDATE comments SET status = 'approved' WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }
    res.json({ message: "Comment approved" });
  } catch (error) {
    console.error("Approve comment error:", error);
    res.status(500).json({ message: "Failed to approve comment" });
  }
});

// POST /api/admin/comments/:id/reject
app.post("/api/admin/comments/:id/reject", requireAuth, requireRole('product_manager'), async (req, res) => {
  try {
    const [result] = await db.query(
      "UPDATE comments SET status = 'rejected' WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }
    res.json({ message: "Comment rejected" });
  } catch (error) {
    console.error("Reject comment error:", error);
    res.status(500).json({ message: "Failed to reject comment" });
  }
});

// DELETE /api/admin/comments/:id
app.delete("/api/admin/comments/:id", requireAuth, requireRole('product_manager'), async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM comments WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }
    res.json({ message: "Comment deleted" });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: "Failed to delete comment" });
  }
});

// GET /api/admin/stock-alerts — products at or below LOW_STOCK_THRESHOLD
app.get("/api/admin/stock-alerts", requireAuth, requireRole('product_manager'), async (req, res) => {
  try {
    const [alertRows] = await db.query(
      `SELECT id AS productId, name, model, categoryName, quantityInStock, price,
              JSON_UNQUOTE(JSON_EXTRACT(images, '$[0]')) AS firstImage
       FROM products
       WHERE quantityInStock <= ?
       ORDER BY quantityInStock ASC`,
      [LOW_STOCK_THRESHOLD]
    );

    const outOfStock = alertRows.filter(r => r.quantityInStock === 0);
    const lowStock = alertRows.filter(r => r.quantityInStock > 0);

    res.json({
      outOfStock,
      lowStock,
      totalAlerts: outOfStock.length + lowStock.length,
    });
  } catch (error) {
    console.error("Stock alerts error:", error);
    res.status(500).json({ message: "Failed to fetch stock alerts" });
  }
});

// ─── Product Manager Dashboard ─────────────────────────

// GET /api/product-manager/dashboard-summary — quick metrics for dashboard
app.get("/api/product-manager/dashboard-summary", requireAuth, requireRole('product_manager'), async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM comments WHERE status = 'pending') as pending_comments,
        (SELECT COUNT(*) FROM orders WHERE status = 'processing') as processing_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'in_transit') as in_transit_orders,
        (SELECT COUNT(*) FROM products WHERE quantityInStock < 10 AND quantityInStock > 0) as low_stock,
        (SELECT COUNT(*) FROM products WHERE quantityInStock = 0) as out_of_stock
    `);
    res.json(results[0]);
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard summary" });
  }
});

// GET /api/product-manager/stock-overview — list products with stock levels
app.get("/api/product-manager/stock-overview", requireAuth, requireRole('product_manager'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, model, quantityInStock, price, categoryName, color,
             JSON_UNQUOTE(JSON_EXTRACT(images, '$[0]')) AS firstImage
      FROM products
      ORDER BY quantityInStock ASC, name ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Stock overview error:", error);
    res.status(500).json({ message: "Failed to fetch stock overview" });
  }
});

// GET /api/product-manager/deliveries — list orders with filtering
app.get("/api/product-manager/deliveries", requireAuth, requireRole('product_manager'), async (req, res) => {
  const status = req.query.status || 'all';
  const allowedStatuses = ['processing', 'in_transit', 'delivered', 'cancelled', 'all'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status filter" });
  }

  try {
    let query = `
      SELECT
        o.id, o.invoice_number, o.status, o.created_at, o.total_amount, o.currency,
        o.customer_email, o.customer_name,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;

    const params = [];
    if (status !== 'all') {
      query += " WHERE o.status = ?";
      params.push(status);
    }

    query += " GROUP BY o.id ORDER BY o.created_at DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Deliveries fetch error:", error);
    res.status(500).json({ message: "Failed to fetch deliveries" });
  }
});

// PUT /api/product-manager/products/:id/stock — update product stock
app.put("/api/product-manager/products/:id/stock", requireAuth, requireRole('product_manager'), async (req, res) => {
  const productId = req.params.id;
  const quantityInStock = Number(req.body?.quantityInStock);

  if (!productId || !productId.trim()) {
    return res.status(400).json({ message: "Invalid product ID" });
  }
  if (!Number.isInteger(quantityInStock) || quantityInStock < 0) {
    return res.status(400).json({ message: "Stock quantity must be a non-negative integer" });
  }

  try {
    const [result] = await db.query(
      "UPDATE products SET quantityInStock = ? WHERE id = ?",
      [quantityInStock, productId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [rows] = await db.query(
      "SELECT id, name, model, quantityInStock, price, categoryName FROM products WHERE id = ?",
      [productId]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error("Stock update error:", error);
    res.status(500).json({ message: "Failed to update stock" });
  }
});

// PUT /api/product-manager/orders/:id/status — update order status
app.put("/api/product-manager/orders/:id/status", requireAuth, requireRole('product_manager'), async (req, res) => {
  const orderId = Number(req.params.id);
  const newStatus = req.body?.status;

  if (!Number.isInteger(orderId) || orderId < 1) {
    return res.status(400).json({ message: "Invalid order ID" });
  }

  const validStatuses = ['processing', 'in_transit', 'delivered', 'cancelled'];
  if (!newStatus || !validStatuses.includes(newStatus)) {
    return res.status(400).json({
      message: `Invalid status. Must be one of: processing, in_transit, delivered, cancelled`
    });
  }

  try {
    const [orderRows] = await db.query("SELECT id, status FROM orders WHERE id = ?", [orderId]);

    if (orderRows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const currentStatus = orderRows[0].status;

    // Validate status flow: processing → in_transit → delivered
    const statusFlow = {
      'processing': ['in_transit', 'cancelled'],
      'in_transit': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    };

    if (!statusFlow[currentStatus]?.includes(newStatus)) {
      return res.status(400).json({
        message: `Cannot change status from "${currentStatus}" to "${newStatus}". Valid transitions: ${statusFlow[currentStatus]?.join(', ') || 'none'}`
      });
    }

    const [result] = await db.query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [newStatus, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ message: "Failed to update order status" });
    }

    const [updatedRows] = await db.query(
      "SELECT id, invoice_number, status, created_at, total_amount, currency, customer_email, customer_name FROM orders WHERE id = ?",
      [orderId]
    );

    res.json({
      message: "Order status updated successfully",
      order: updatedRows[0]
    });
  } catch (error) {
    console.error("Order status update error:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
});

// ─── Product Management (Product Manager CRUD) ────────────

// POST /api/product-manager/products — add new product
app.post("/api/product-manager/products", requireAuth, requireRole('product_manager'), async (req, res) => {
  const {
    name, model, serialNumber, description, quantityInStock,
    price, warrantyStatus, distributorInfo, categoryName,
    color, size, gender, vatRate, images
  } = req.body;

  if (!name || !model || price === undefined || price === null) {
    return res.status(400).json({ message: "name, model, and price are required" });
  }
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ message: "price must be a non-negative number" });
  }

  const { randomUUID } = require('crypto');
  const id = randomUUID();
  const imagesJson = JSON.stringify(Array.isArray(images) ? images : []);

  try {
    await db.query(
      `INSERT INTO products (id, name, model, serialNumber, description, quantityInStock, price,
         warrantyStatus, distributorInfo, categoryName, color, size, gender, vatRate, images, popularity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id, name, model, serialNumber || null, description || null,
        Number(quantityInStock) || 0, numericPrice,
        warrantyStatus ? 1 : 0, distributorInfo || 'scyllastore',
        categoryName || null, color || null, size || null,
        gender || null, Number(vatRate) || 10, imagesJson
      ]
    );
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    const product = { ...rows[0] };
    if (typeof product.images === 'string') product.images = JSON.parse(product.images);
    res.status(201).json(product);
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: "Failed to create product" });
  }
});

// PUT /api/product-manager/products/:id — update product details
app.put("/api/product-manager/products/:id", requireAuth, requireRole('product_manager'), async (req, res) => {
  const { id } = req.params;
  const {
    name, model, serialNumber, description, quantityInStock,
    price, warrantyStatus, distributorInfo, categoryName,
    color, size, gender, vatRate, images
  } = req.body;

  if (!name || !model || price === undefined || price === null) {
    return res.status(400).json({ message: "name, model, and price are required" });
  }
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ message: "price must be a non-negative number" });
  }

  const imagesJson = JSON.stringify(Array.isArray(images) ? images : []);

  try {
    const [result] = await db.query(
      `UPDATE products SET
         name=?, model=?, serialNumber=?, description=?, quantityInStock=?,
         price=?, warrantyStatus=?, distributorInfo=?, categoryName=?,
         color=?, size=?, gender=?, vatRate=?, images=?
       WHERE id=?`,
      [
        name, model, serialNumber || null, description || null,
        Number(quantityInStock) || 0, numericPrice,
        warrantyStatus ? 1 : 0, distributorInfo || 'scyllastore',
        categoryName || null, color || null, size || null,
        gender || null, Number(vatRate) || 10, imagesJson, id
      ]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    const product = { ...rows[0] };
    if (typeof product.images === 'string') product.images = JSON.parse(product.images);
    res.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
});

// DELETE /api/product-manager/products/:id — remove product
app.delete("/api/product-manager/products/:id", requireAuth, requireRole('product_manager'), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

// GET /api/product-manager/categories — list distinct categories with product count
app.get("/api/product-manager/categories", requireAuth, requireRole('product_manager'), async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT categoryName AS name, COUNT(*) AS productCount
       FROM products
       WHERE categoryName IS NOT NULL AND categoryName != ''
       GROUP BY categoryName
       ORDER BY categoryName`
    );
    res.json(rows);
  } catch (error) {
    console.error("List categories error:", error);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// PUT /api/product-manager/categories/:name — rename category
app.put("/api/product-manager/categories/:name", requireAuth, requireRole('product_manager'), async (req, res) => {
  const oldName = decodeURIComponent(req.params.name);
  const { newName } = req.body;
  if (!newName || !newName.trim()) {
    return res.status(400).json({ message: "newName is required" });
  }
  const trimmed = newName.trim();
  try {
    const [result] = await db.query(
      'UPDATE products SET categoryName = ? WHERE categoryName = ?',
      [trimmed, oldName]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ name: trimmed, productCount: result.affectedRows });
  } catch (error) {
    console.error("Rename category error:", error);
    res.status(500).json({ message: "Failed to rename category" });
  }
});

// DELETE /api/product-manager/categories/:name — delete category (only if no products)
app.delete("/api/product-manager/categories/:name", requireAuth, requireRole('product_manager'), async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM products WHERE categoryName = ?',
      [name]
    );
    if (Number(count) > 0) {
      return res.status(409).json({ message: `Cannot delete: ${count} product(s) still use this category` });
    }
    res.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Failed to delete category" });
  }
});

app.use("/api/orders", createOrderRoutes(db, requireAuth));
app.use("/api/returns", createReturnRoutes(db, requireAuth, requireRole));
app.use("/api/discounts", createDiscountRoutes(db, requireAuth, requireRole));
app.use("/api/notifications", createNotificationRoutes(db, requireAuth));
app.use("/api/products", createProductRoutes(db, requireAuth, requireRole));

if (require.main === module) {
  app.listen(3001, () => {
    console.log("Server running on port 3001");
  });
}

module.exports = app;
