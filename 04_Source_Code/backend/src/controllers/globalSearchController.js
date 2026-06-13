const pool = require("../config/db");

exports.globalSearch = async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === "") {
    return res.json({ customers: [], items: [], invoices: [], quotes: [] });
  }

  const queryStr = `%${q.trim()}%`;

  try {
    // Search Customers
    const customersResult = await pool.query(
      `SELECT id, first_name, last_name, display_name, company_name, email 
       FROM customers 
       WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR display_name ILIKE $1 OR company_name ILIKE $1 OR email ILIKE $1 
       LIMIT 5`,
      [queryStr]
    );

    // Search Items
    const itemsResult = await pool.query(
      `SELECT id, name, sku, item_type, selling_price 
       FROM items 
       WHERE name ILIKE $1 OR sku ILIKE $1 OR description ILIKE $1 
       LIMIT 5`,
      [queryStr]
    );

    // Search Invoices
    const invoicesResult = await pool.query(
      `SELECT i.id, i.invoice_number, i.total_amount, i.status, c.display_name as customer_name
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.invoice_number ILIKE $1 
       LIMIT 5`,
      [queryStr]
    );

    // Search Quotes
    const quotesResult = await pool.query(
      `SELECT q.id, q.quote_number, q.total_amount, q.status, c.display_name as customer_name
       FROM quotes q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.quote_number ILIKE $1 
       LIMIT 5`,
      [queryStr]
    );

    res.json({
      customers: customersResult.rows,
      items: itemsResult.rows,
      invoices: invoicesResult.rows,
      quotes: quotesResult.rows
    });

  } catch (err) {
    console.error("Global search error:", err);
    res.status(500).json({ message: "Server error during search", error: err.message });
  }
};
