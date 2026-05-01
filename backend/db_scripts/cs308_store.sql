CREATE DATABASE cs308_store;
USE cs308_store;

CREATE TABLE products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(100),
  serialNumber VARCHAR(100),
  description TEXT,
  quantityInStock INT DEFAULT 0,
  price DECIMAL(10, 2),
  warrantyStatus BOOLEAN DEFAULT FALSE,
  distributorInfo VARCHAR(255),
  categoryName VARCHAR(100),
  color VARCHAR(50),
  size VARCHAR(50),
  gender VARCHAR(50),
  vatRate DECIMAL(5, 2) DEFAULT 10.00,
  images JSON,
  popularity INT DEFAULT 0
);