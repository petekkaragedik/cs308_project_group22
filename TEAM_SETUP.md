# Team Development Setup Guide

## Why Each Developer Needs Their Own Database

✅ **DO:** Each team member runs their own local MySQL database  
❌ **DON'T:** Share a single database (causes conflicts, data overwrites, and connection issues)

**Benefits of separate databases:**
- No conflicts when testing
- Safe to experiment without breaking others' work
- Everyone can reset/seed data independently
- Faster development (no network latency)

---

## Setup Instructions for New Team Members

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd cs308_project_group22
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Setup Your Local Database

#### Create the database:
```sql
CREATE DATABASE scylla_db;
USE scylla_db;
```

#### Run the schema setup:
```bash
# From backend directory
node setup.js
```

#### Seed test users:
```bash
# Option A: Using Node.js
node -e "
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });
  const sql = fs.readFileSync('seed_test_users.sql', 'utf8');
  await db.query(sql);
  console.log('✅ Test users created!');
  await db.end();
})();
"

# Option B: Using MySQL CLI
mysql -u root -p scylla_db < seed_test_users.sql
```

---

## Test Accounts (Same for Everyone)

After running the seed script, everyone will have these test accounts:

### 👤 Customer Account
- **Email:** `customer@test.com`
- **Password:** `Test123456`
- **Role:** `customer`
- **Can:** Browse products, add to cart, place orders, leave comments

### 💰 Sales Manager Account
- **Email:** `sales@test.com`
- **Password:** `Test123456`
- **Role:** `sales_manager`
- **Can:** *(Reserved for future features - account ready when you implement sales manager functionality)*

### 📦 Product Manager Account
- **Email:** `productmanager@test.com`
- **Password:** `Test123456`
- **Role:** `product_manager`
- **Can:** Manage stock, track deliveries, moderate comments, **access Product Manager Dashboard**

---

## Testing the Product Manager Dashboard

### Access the Dashboard:

1. **Start servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm start

   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

2. **Log in:**
   - Open: `http://localhost:3000`
   - Email: `productmanager@test.com`
   - Password: `Test123456`

3. **Navigate to dashboard:**
   - Click Profile → See "Manager Dashboard" link
   - OR go directly to: `http://localhost:3000/product-manager/dashboard`

### Dashboard Features:

✅ **Summary Cards:** View metrics at a glance  
✅ **Stock Management:** Update product inventory  
✅ **Deliveries:** Track orders by status  
✅ **Comment Moderation:** Approve/reject customer reviews  

---

## Re-seeding Test Users

If you mess up the test accounts, just re-run the seed script:

```bash
# From backend directory
node -e "
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });
  const sql = fs.readFileSync('seed_test_users.sql', 'utf8');
  await db.query(sql);
  console.log('✅ Test users reset!');
  await db.end();
})();
"
```

The script safely removes old test accounts and creates fresh ones.

---

## Environment Variables

Make sure your `backend/.env` file is configured:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=scylla_db
JWT_SECRET=your_jwt_secret
```

**Note:** Each team member can have different MySQL credentials - just update `.env` accordingly.

---

## Troubleshooting

### "Cannot connect to database"
- Check MySQL is running: `mysql.server status`
- Verify `.env` credentials are correct
- Ensure database exists: `SHOW DATABASES;`

### "Table doesn't exist"
- Run setup script: `node setup.js`

### "Test accounts not working"
- Re-run seed script (see above)
- Check password is exactly: `Test123456` (case-sensitive)

### "Dashboard says Access Denied"
- Confirm you're logged in as `productmanager@test.com`
- Check user role in database:
  ```sql
  SELECT email, role FROM users WHERE email = 'productmanager@test.com';
  ```

---

## Summary

✅ Each developer: Own database  
✅ Same test accounts: Run `seed_test_users.sql`  
✅ Product Manager: `productmanager@test.com` / `Test123456`  
✅ Dashboard: `http://localhost:3000/product-manager/dashboard`

**Everyone can now test the Product Manager Dashboard independently!** 🎉
