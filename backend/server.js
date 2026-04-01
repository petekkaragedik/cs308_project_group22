require('dotenv').config();
const express = require("express");
const cors = require("cors");
const mysql = require('mysql2/promise'); 

//pull from db instead of file
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

// login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "test@test.com" && password === "1234") {
    return res.json({
      message: "Login successful",
      token: "fake-jwt-token"
    });
  } else {
    return res.status(401).json({ message: "Invalid credentials" });
  }
});

// categories
const categories = [
  { id: "cat-necklace", name: "Fashion Necklace" },
  { id: "cat-bikini-set", name: "Bikini Set" },
  { id: "cat-earrings", name: "Earrings" },
  { id: "cat-bracelet", name: "Bracelet" },
  { id: "cat-summer-set", name: "Summer Set" }
];

app.get("/api/categories", (req, res) => {
  res.json(categories);
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

    res.json(product);
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).json({ message: "Failed to fetch product from database" });
  }
});

if (require.main === module) {
  app.listen(3001, () => {
    console.log("Server running on port 3001");
  });
}

module.exports = app;