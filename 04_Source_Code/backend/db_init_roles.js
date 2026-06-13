require('dotenv').config();
const pool = require('./src/config/db');

async function migrateRoles() {
  try {
    console.log("Checking for role column in users table...");
    
    // Add column if not exists
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='users' AND column_name='role'
        ) THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'Admin';
          RAISE NOTICE 'Added role column to users table.';
        ELSE
          RAISE NOTICE 'Role column already exists.';
        END IF;
      END
      $$;
    `);

    // Ensure all existing users without a role have 'Admin'
    await pool.query(`
      UPDATE users SET role = 'Admin' WHERE role IS NULL;
    `);

    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    process.exit(0);
  }
}

migrateRoles();
