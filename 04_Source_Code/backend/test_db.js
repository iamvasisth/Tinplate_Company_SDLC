const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_cHanE18PviMS@ep-damp-thunder-amv7nmq9-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false },
});

async function test() {
  try {
    const userId = 1; // Assuming user ID 1 for testing
    const today = new Date();
    let projMonth = today.getMonth() + 2; 
    let projYear = today.getFullYear();
    if (projMonth > 12) {
      projMonth = 1;
      projYear += 1;
    }
    
    console.log("Testing projected expenses (bills)...");
    await pool.query(`
      SELECT b.id as expense_id, b.bill_number as reference_number, v.display_name as vendor_name, 
             b.bill_date as date, b.due_date, 
             b.total_amount, b.balance_due as pending_amount, 
             b.status, 'Bill' as type
      FROM bills b
      LEFT JOIN vendors v ON b.vendor_id = v.id
      WHERE b.user_id = $1 
        AND b.balance_due > 0
        AND b.is_deleted = false
        AND LOWER(b.status) NOT IN ('paid', 'cancelled', 'void')
      ORDER BY b.due_date ASC
    `, [userId]);
    console.log("Bills OK");
    
    console.log("Testing projected expenses (recurring_expenses)...");
    await pool.query(`
      SELECT id as expense_id, expense_name as reference_number, category as vendor_name, 
             start_date as date, due_day, 
             amount as total_amount, amount as pending_amount, 
             status, 'Recurring' as type, frequency
      FROM recurring_expenses
      WHERE created_by = $1 AND status = 'Active' 
        AND start_date <= $2 
        AND (end_date IS NULL OR end_date >= $3)
    `, [userId, new Date(projYear, projMonth, 0), new Date(projYear, projMonth - 1, 1)]);
    console.log("Recurring Expenses OK");
    
    console.log("Testing projected payments (invoices)...");
    await pool.query(`
      SELECT b.id as bill_id, b.invoice_number as bill_number, v.display_name as vendor_name, b.invoice_date as bill_date, b.due_date, 
             b.total_amount, (b.total_amount - b.balance_due) as paid_amount, b.balance_due as pending_amount, 
             b.status
      FROM invoices b
      LEFT JOIN customers v ON b.customer_id = v.id
      WHERE b.user_id = $1 
        AND b.balance_due > 0
        AND LOWER(b.status) NOT IN ('paid', 'cancelled', 'void', 'written off', 'write off', 'written_off')
      ORDER BY b.due_date ASC
    `, [userId]);
    console.log("Invoices OK");
    
    console.log("Testing payments_made...");
    await pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments_made WHERE user_id = $1`, [userId]);
    console.log("payments_made OK");

  } catch (err) {
    console.error("DB Error Full:", err);
  } finally {
    pool.end();
  }
}

test();
