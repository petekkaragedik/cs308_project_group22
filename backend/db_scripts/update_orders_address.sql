USE cs308_store;
ALTER TABLE orders ADD COLUMN address_id INT;
ALTER TABLE orders ADD CONSTRAINT fk_order_address FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL;
