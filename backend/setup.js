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
      id INT AUTO_INCREMENT PRIMARY KEY,
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

  await db.end();
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
