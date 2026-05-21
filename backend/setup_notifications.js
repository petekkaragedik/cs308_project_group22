require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupNotifications() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✓ Connected to database');
    console.log('Creating notifications table...');

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
      ) ENGINE=InnoDB;
    `);

    console.log('✓ Notifications table created successfully');

  } catch (error) {
    console.error('Error setting up notifications table:', error);
    throw error;
  } finally {
    if (db) await db.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupNotifications()
    .then(() => {
      console.log('Notification setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Notification setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupNotifications;
