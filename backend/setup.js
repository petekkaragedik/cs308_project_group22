require('dotenv').config();
const mysql = require('mysql2/promise');

async function setup() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('customer', 'sales_manager', 'product_manager') NOT NULL DEFAULT 'customer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Users table ready');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      model VARCHAR(255) NOT NULL,
      serialNumber VARCHAR(255),
      description TEXT,
      quantityInStock INT DEFAULT 0,
      price DECIMAL(10,2) DEFAULT 0,
      warrantyStatus TINYINT(1) DEFAULT 0,
      distributorInfo VARCHAR(255) DEFAULT 'scyllastore',
      categoryName VARCHAR(100),
      color VARCHAR(50),
      size VARCHAR(50),
      gender VARCHAR(20),
      vatRate DECIMAL(5,2) DEFAULT 10,
      images JSON,
      popularity INT DEFAULT 0
    )
  `);
  console.log('Products table ready');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      invoice_number VARCHAR(40) NOT NULL UNIQUE,
      customer_email VARCHAR(255) NOT NULL,
      customer_name VARCHAR(150) DEFAULT NULL,
      total_amount DECIMAL(14,2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
      status ENUM('processing', 'in_transit', 'delivered', 'cancelled') NOT NULL DEFAULT 'processing',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_orders_user (user_id)
    )
  `);
  console.log('Orders table ready');

  // Add user_id column if it doesn't exist (for existing databases)
  try {
    await db.execute(`
      ALTER TABLE orders ADD COLUMN user_id INT AFTER id
    `);
    await db.execute(`
      ALTER TABLE orders ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    await db.execute(`
      ALTER TABLE orders ADD INDEX idx_orders_user (user_id)
    `);
  } catch (e) {
    // Column already exists, ignore error
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id VARCHAR(64) NOT NULL,
      product_name VARCHAR(500) NOT NULL,
      size VARCHAR(50) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(12,2) NOT NULL,
      line_total DECIMAL(14,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      INDEX idx_order_items_order (order_id)
    )
  `);
  console.log('Order items table ready');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INT NOT NULL,
      product_id VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('Favorites table ready');

  await db.execute(`
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
  console.log('Addresses table ready');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id VARCHAR(64) NOT NULL,
      rating TINYINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_product (user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_ratings_product (product_id)
    )
  `);
  console.log('Ratings table ready');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id VARCHAR(64) NOT NULL,
      body TEXT NOT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_comments_product (product_id),
      INDEX idx_comments_status (status)
    )
  `);
  console.log('Comments table ready');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_token (token),
      INDEX idx_expires (expires_at)
    )
  `);
  console.log('Password reset tokens table ready');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS return_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      user_id INT NOT NULL,
      reason TEXT DEFAULT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_return_requests_user (user_id),
      INDEX idx_return_requests_order (order_id)
    )
  `);
  console.log('Return requests table ready');

  try {
    await db.execute(`ALTER TABLE return_requests ADD COLUMN refunded_amount DECIMAL(14,2) DEFAULT NULL`);
  } catch (e) { /* column already exists */ }
  try {
    await db.execute(`ALTER TABLE return_requests ADD COLUMN refunded_at TIMESTAMP NULL DEFAULT NULL`);
  } catch (e) { /* column already exists */ }

  // Discount columns on order_items (added when discount feature shipped)
  const orderItemsDiscountCols = [
    `ALTER TABLE order_items ADD COLUMN discount_campaign_id INT DEFAULT NULL`,
    `ALTER TABLE order_items ADD COLUMN discount_type VARCHAR(20) DEFAULT NULL`,
    `ALTER TABLE order_items ADD COLUMN discount_value DECIMAL(10,2) DEFAULT NULL`,
    `ALTER TABLE order_items ADD COLUMN discount_amount DECIMAL(12,2) DEFAULT NULL`,
    `ALTER TABLE order_items ADD COLUMN original_price DECIMAL(12,2) DEFAULT NULL`,
  ];
  for (const sql of orderItemsDiscountCols) {
    try { await db.execute(sql); } catch (e) { /* column already exists */ }
  }
  console.log('Order items discount columns ready');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS discount_campaigns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      discount_type ENUM('percentage', 'fixed_amount') NOT NULL DEFAULT 'percentage',
      discount_value DECIMAL(10,2) NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_active_dates (is_active, start_date, end_date),
      INDEX idx_created_by (created_by)
    )
  `);
  console.log('Discount campaigns table ready');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS discount_campaign_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campaign_id INT NOT NULL,
      product_id VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES discount_campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_campaign_product (campaign_id, product_id),
      INDEX idx_product (product_id)
    )
  `);
  console.log('Discount campaign products table ready');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS discount_campaign_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campaign_id INT NOT NULL,
      category_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES discount_campaigns(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_campaign_category (campaign_id, category_name),
      INDEX idx_category (category_name)
    )
  `);
  console.log('Discount campaign categories table ready');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('wishlist_discount', 'system') NOT NULL DEFAULT 'wishlist_discount',
      title VARCHAR(255) NOT NULL,
      message TEXT,
      campaign_id INT,
      affected_products JSON,
      read_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES discount_campaigns(id) ON DELETE SET NULL,
      INDEX idx_user_unread (user_id, read_at),
      INDEX idx_campaign (campaign_id),
      INDEX idx_created (created_at),
      UNIQUE KEY uniq_user_campaign_time (user_id, campaign_id, created_at)
    ) ENGINE=InnoDB
  `);
  console.log('Notifications table ready');

  await db.end();
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
