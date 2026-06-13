-- ============================================================
-- Migration: 001_safe_schema_fixes.sql
-- Purpose: Safe schema patches for critical backend bugs
-- All statements use IF NOT EXISTS — safe to re-run
-- ============================================================

-- 1. Add organization_name to users table (registration bug fix)
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255);

-- 2. Add is_deleted soft-delete columns (prevents hard deletes breaking relational data)
--    These are added as DEFAULT false so existing rows are unaffected
ALTER TABLE customers        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE items            ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE quotes           ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE invoices         ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE expenses         ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE bank_accounts    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 3. Add quote_id to invoices for duplicate conversion prevention
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quote_id INTEGER;

-- 4. Ensure quote/invoice extra columns exist (quoteController & invoiceController already do this at startup,
--    but putting them here as a permanent record)
ALTER TABLE quotes           ADD COLUMN IF NOT EXISTS salesperson_id INTEGER;
ALTER TABLE quotes           ADD COLUMN IF NOT EXISTS project_id INTEGER;
ALTER TABLE quote_items      ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE quote_items      ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10) DEFAULT 'flat';
ALTER TABLE invoices         ADD COLUMN IF NOT EXISTS salesperson_id INTEGER;
ALTER TABLE invoices         ADD COLUMN IF NOT EXISTS project_id INTEGER;
ALTER TABLE invoices         ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoice_items    ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoice_items    ADD COLUMN IF NOT EXISTS discount_type VARCHAR(10) DEFAULT 'flat';
