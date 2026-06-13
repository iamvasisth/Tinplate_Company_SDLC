require('dotenv').config();
const pool = require('./src/config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Add missing fields to vendors table to match customers
    const alterQuery = `
      ALTER TABLE vendors 
      ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(50) DEFAULT 'Business',
      ADD COLUMN IF NOT EXISTS vendor_sub_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS salutation VARCHAR(20),
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS work_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS mobile VARCHAR(50),
      ADD COLUMN IF NOT EXISTS language VARCHAR(50),
      ADD COLUMN IF NOT EXISTS contact_persons JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS reporting_tags VARCHAR(255),
      ADD COLUMN IF NOT EXISTS remarks TEXT,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
      ADD COLUMN IF NOT EXISTS enable_portal BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS portal_language VARCHAR(10) DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS vendor_owner_id INTEGER,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `;
    await client.query(alterQuery);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_addresses (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
        type VARCHAR(50),
        attention VARCHAR(255),
        country VARCHAR(100),
        address_line1 VARCHAR(255),
        address_line2 VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        pin_code VARCHAR(50),
        phone VARCHAR(50),
        fax VARCHAR(50)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_contacts (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
        salutation VARCHAR(20),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        work_phone VARCHAR(50),
        mobile VARCHAR(50)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_activity_log (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
        user_id INTEGER,
        action_type VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query("COMMIT");
    console.log("Migration successful.");
  } catch(e) {
    await client.query("ROLLBACK");
    console.error(e);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
