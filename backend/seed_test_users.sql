-- ========================================
-- Test Users for SCYLLA Online Store
-- ========================================
-- Run this script to create test accounts for development
-- Usage: mysql -u root -p scylla_db < seed_test_users.sql

-- Password for all test accounts: Test123456
-- Bcrypt hash of "Test123456"
SET @test_password = '$2b$10$FYMvKmZrt4F9g9XbkFgAx.y4jmNlRVcE3Slof3swiXiSgQXTB.rqm';

-- Remove existing test users (if any)
DELETE FROM users WHERE email IN (
  'customer@test.com',
  'sales@test.com',
  'productmanager@test.com'
);

-- Insert test users with different roles
INSERT INTO users (name, email, password, role, created_at) VALUES
('Test Customer', 'customer@test.com', @test_password, 'customer', NOW()),
('Test Sales Manager', 'sales@test.com', @test_password, 'sales_manager', NOW()),
('Test Product Manager', 'productmanager@test.com', @test_password, 'product_manager', NOW());

-- Display created accounts
SELECT id, name, email, role, created_at FROM users WHERE email LIKE '%@test.com';

-- ========================================
-- Test Account Credentials
-- ========================================
--
-- CUSTOMER:
--   Email: customer@test.com
--   Password: Test123456
--   Role: customer
--   Access: Browse products, cart, orders, comments
--
-- SALES MANAGER:
--   Email: sales@test.com
--   Password: Test123456
--   Role: sales_manager
--   Access: (Reserved for future features)
--
-- PRODUCT MANAGER:
--   Email: productmanager@test.com
--   Password: Test123456
--   Role: product_manager
--   Access: Product Manager Dashboard (stock, deliveries, comment moderation)
--
-- ========================================
