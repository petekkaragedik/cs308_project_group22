USE cs308_store;

CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50),
    user_id INT,
    content TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);