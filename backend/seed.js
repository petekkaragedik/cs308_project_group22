require('dotenv').config();
const mysql = require('mysql2/promise');
const rawProducts = require('./data/products'); 

async function seedDatabase() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log("connected to MySQL, inserting products");

  for (const p of rawProducts) {
    const query = `
      INSERT INTO products 
      (id, name, model, serialNumber, description, quantityInStock, price, warrantyStatus, distributorInfo, categoryName, color, size, gender, vatRate, images, popularity) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE id=id;
    `;
    
    const values = [
      p.id, p.name, p.model, p.serialNumber, p.description, p.quantityInStock, p.price, 
      p.warrantyStatus, p.distributorInfo, p.categoryName, p.color, p.size, p.gender, 
      p.vatRate, JSON.stringify(p.images), p.popularity
    ];

    await db.execute(query, values);
  }

  console.log("all products are now inserted into MySQL");
  process.exit();
}

seedDatabase();