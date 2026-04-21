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
      invoice_number VARCHAR(40) NOT NULL UNIQUE,
      customer_email VARCHAR(255) NOT NULL,
      customer_name VARCHAR(150) DEFAULT NULL,
      total_amount DECIMAL(14,2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
      status ENUM('processing', 'in_transit', 'delivered', 'cancelled') NOT NULL DEFAULT 'processing',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Orders table ready');

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

  await db.end();
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
