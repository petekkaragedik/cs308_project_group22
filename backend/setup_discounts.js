require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDiscounts() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✓ Connected to database');

    console.log('Creating discount_campaigns table...');
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
    console.log('✓ discount_campaigns table created');

    console.log('Creating discount_campaign_products table...');
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
    console.log('✓ discount_campaign_products table created');

    console.log('Creating discount_campaign_categories table...');
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
    console.log('✓ discount_campaign_categories table created');

    console.log('Adding discount tracking columns to order_items...');

    // Check if columns already exist to make this idempotent
    const [columns] = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'discount_campaign_id'
    `, [process.env.DB_NAME]);

    if (columns.length === 0) {
      await db.execute(`
        ALTER TABLE order_items
        ADD COLUMN discount_campaign_id INT DEFAULT NULL,
        ADD COLUMN discount_type ENUM('percentage', 'fixed_amount') DEFAULT NULL,
        ADD COLUMN discount_value DECIMAL(10,2) DEFAULT NULL,
        ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN original_price DECIMAL(12,2) DEFAULT NULL
      `);
      console.log('✓ Discount columns added to order_items');

      await db.execute(`
        ALTER TABLE order_items
        ADD CONSTRAINT fk_order_items_campaign
        FOREIGN KEY (discount_campaign_id)
        REFERENCES discount_campaigns(id)
        ON DELETE SET NULL
      `);
      console.log('✓ Foreign key constraint added');

      await db.execute(`
        ALTER TABLE order_items
        ADD INDEX idx_discount_campaign (discount_campaign_id)
      `);
      console.log('✓ Index added on discount_campaign_id');
    } else {
      console.log('✓ Discount columns already exist in order_items, skipping...');
    }

    console.log('\n✅ Discount system database setup complete!\n');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('Note: Some indexes may already exist, this is normal.');
    }
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
    }
  }
}

setupDiscounts();
