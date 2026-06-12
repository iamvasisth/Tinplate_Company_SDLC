const pool = require("../config/db");

// ---- ensure tables exist ----
const initializeTimesheets = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS timesheets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      timesheet_number VARCHAR(100),
      work_date DATE NOT NULL,
      start_time TIME,
      end_time TIME,
      hours NUMERIC(5,2) NOT NULL DEFAULT 0,
      description TEXT,
      billing_type VARCHAR(50) DEFAULT 'Billable',
      hourly_rate NUMERIC(12,2) DEFAULT 0,
      billable_amount NUMERIC(12,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Draft',
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try { await pool.query(sql); } catch (err) { console.error("Timesheets DB Init Error:", err); }
};
initializeTimesheets();

// ================= GET ALL TIMESHEETS =================
const getTimesheets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, p.project_name, c.display_name as customer_name, u.name as staff_name
       FROM timesheets t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN customers c ON t.customer_id = c.id
       LEFT JOIN users u ON t.staff_id = u.id
       WHERE t.user_id = $1 
       ORDER BY t.work_date DESC, t.created_at DESC`,
      [req.user.id]
    );
    res.json({ timesheets: result.rows });
  } catch (err) {
    console.error("GET TIMESHEETS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET SINGLE TIMESHEET =================
const getTimesheetById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT t.*, p.project_name, c.display_name as customer_name, u.name as staff_name
       FROM timesheets t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN customers c ON t.customer_id = c.id
       LEFT JOIN users u ON t.staff_id = u.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Timesheet not found" });
    res.json({ timesheet: result.rows[0] });
  } catch (err) {
    console.error("GET TIMESHEET ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE TIMESHEET =================
const createTimesheet = async (req, res) => {
  const { project_id, work_date, start_time, end_time, hours, description, billing_type, hourly_rate, status } = req.body;
  if (!project_id || !work_date || !hours) {
      return res.status(400).json({ message: "Project, Work Date, and Hours are required." });
  }

  try {
    // get customer from project
    const projRes = await pool.query(`SELECT customer_id FROM projects WHERE id = $1 AND user_id = $2`, [project_id, req.user.id]);
    if (projRes.rows.length === 0) return res.status(404).json({ message: "Project not found" });
    const customer_id = projRes.rows[0].customer_id;

    const parsedHours = parseFloat(hours) || 0;
    const parsedRate = parseFloat(hourly_rate) || 0;
    const billableAmt = billing_type === 'Billable' ? parsedHours * parsedRate : 0;

    const result = await pool.query(
      `INSERT INTO timesheets
       (user_id, project_id, customer_id, staff_id, work_date, start_time, end_time, hours, description, billing_type, hourly_rate, billable_amount, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user.id,
        project_id,
        customer_id,
        req.user.id, // staff_id default to current user for now
        work_date,
        start_time || null,
        end_time || null,
        parsedHours,
        description || null,
        billing_type || 'Billable',
        parsedRate,
        billableAmt,
        status || 'Draft',
        req.user.id
      ]
    );
    res.json({ message: "Timesheet created", timesheet: result.rows[0] });
  } catch (err) {
    console.error("CREATE TIMESHEET ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE TIMESHEET =================
const updateTimesheet = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  delete updates.id;
  delete updates.user_id;
  delete updates.created_at;
  delete updates.updated_at;
  delete updates.invoice_id; // prevent manual linking

  try {
    const existing = await pool.query(`SELECT status FROM timesheets WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Timesheet not found" });
    if (existing.rows[0].status === 'Invoiced') return res.status(400).json({ message: "Cannot edit an invoiced timesheet" });

    // Recalculate billable amount if hours, rate, or billing_type is updated
    if (updates.hours !== undefined || updates.hourly_rate !== undefined || updates.billing_type !== undefined) {
      // Need full row to calculate properly if partial update
      const fullRow = await pool.query(`SELECT hours, hourly_rate, billing_type FROM timesheets WHERE id = $1`, [id]);
      const h = updates.hours !== undefined ? parseFloat(updates.hours) : parseFloat(fullRow.rows[0].hours);
      const r = updates.hourly_rate !== undefined ? parseFloat(updates.hourly_rate) : parseFloat(fullRow.rows[0].hourly_rate);
      const bt = updates.billing_type !== undefined ? updates.billing_type : fullRow.rows[0].billing_type;
      
      updates.billable_amount = bt === 'Billable' ? h * r : 0;
    }

    const setColumns = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setColumns.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setColumns.length === 0) return res.status(400).json({ message: "No fields provided to update" });

    setColumns.push(`updated_at = CURRENT_TIMESTAMP`);
    const query = `
      UPDATE timesheets
      SET ${setColumns.join(", ")}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;
    values.push(id, req.user.id);

    const result = await pool.query(query, values);
    res.json({ message: "Timesheet updated", timesheet: result.rows[0] });
  } catch (err) {
    console.error("UPDATE TIMESHEET ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CANCEL TIMESHEET =================
const cancelTimesheet = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query(`SELECT status FROM timesheets WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Timesheet not found" });
    if (existing.rows[0].status === 'Invoiced') return res.status(400).json({ message: "Cannot cancel an invoiced timesheet" });

    const result = await pool.query(
      `UPDATE timesheets SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    res.json({ message: "Timesheet cancelled", timesheet: result.rows[0] });
  } catch (err) {
    console.error("CANCEL TIMESHEET ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= APPROVE TIMESHEET =================
const approveTimesheet = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query(`SELECT status FROM timesheets WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Timesheet not found" });
    if (existing.rows[0].status === 'Invoiced') return res.status(400).json({ message: "Already Invoiced" });
    if (existing.rows[0].status === 'Cancelled') return res.status(400).json({ message: "Cannot approve cancelled timesheet" });

    const result = await pool.query(
      `UPDATE timesheets SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    res.json({ message: "Timesheet approved", timesheet: result.rows[0] });
  } catch (err) {
    console.error("APPROVE TIMESHEET ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CONVERT TO INVOICE =================
const convertToInvoice = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Fetch timesheet
    const tsRes = await client.query(
      `SELECT t.*, p.project_name 
       FROM timesheets t 
       LEFT JOIN projects p ON t.project_id = p.id 
       WHERE t.id = $1 AND t.user_id = $2`, 
       [id, req.user.id]
    );
    
    if (tsRes.rows.length === 0) throw new Error("Timesheet not found");
    const ts = tsRes.rows[0];

    if (ts.status !== 'Approved') throw new Error("Timesheet must be Approved to invoice");
    if (ts.billing_type !== 'Billable') throw new Error("Only Billable timesheets can be invoiced");
    if (ts.status === 'Invoiced' || ts.invoice_id) throw new Error("Timesheet is already invoiced");

    // 2. Generate Invoice Number
    const invCountRes = await client.query(`SELECT COUNT(*) FROM invoices WHERE user_id = $1`, [req.user.id]);
    const nextInvNumber = `INV-${String(parseInt(invCountRes.rows[0].count) + 1).padStart(5, '0')}`;
    const invoiceDate = new Date().toISOString().slice(0, 10);
    const dueDate = invoiceDate; // default due today

    // 3. Create Invoice
    const invRes = await client.query(
      `INSERT INTO invoices 
       (user_id, customer_id, project_id, invoice_number, invoice_date, due_date, status, subtotal, tax_amount, discount_amount, total, balance_due, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [
        req.user.id,
        ts.customer_id,
        ts.project_id,
        nextInvNumber,
        invoiceDate,
        dueDate,
        'draft',
        ts.billable_amount,
        0, // tax
        0, // discount
        ts.billable_amount, // total
        ts.billable_amount, // balance due
        `Auto-generated from Timesheet #${ts.id} for project: ${ts.project_name}`
      ]
    );
    const invoiceId = invRes.rows[0].id;

    // 4. Create Invoice Item
    const itemDesc = ts.description ? `${ts.project_name} - ${ts.description}` : `Work logged for ${ts.project_name} on ${new Date(ts.work_date).toLocaleDateString()}`;
    await client.query(
      `INSERT INTO invoice_items 
       (invoice_id, item_name, description, quantity, unit_price, tax_rate, discount, total_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        invoiceId,
        'Service', // item name
        itemDesc,
        ts.hours,
        ts.hourly_rate,
        0, // tax rate
        0, // discount
        ts.billable_amount
      ]
    );

    // 5. Update Timesheet
    await client.query(
      `UPDATE timesheets SET status = 'Invoiced', invoice_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [invoiceId, ts.id]
    );

    await client.query("COMMIT");
    res.json({ message: "Successfully converted to Invoice", invoice_id: invoiceId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CONVERT TIMESHEET TO INVOICE ERROR:", err);
    res.status(400).json({ message: err.message || "Failed to convert to invoice" });
  } finally {
    client.release();
  }
};

module.exports = {
  getTimesheets,
  getTimesheetById,
  createTimesheet,
  updateTimesheet,
  cancelTimesheet,
  approveTimesheet,
  convertToInvoice
};
