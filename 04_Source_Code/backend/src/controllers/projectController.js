const pool = require("../config/db");

// ---- ensure tables and extra columns exist ----
const initializeProjects = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      project_name VARCHAR(255) NOT NULL,
      project_code VARCHAR(100),
      start_date DATE,
      end_date DATE,
      budget NUMERIC(12,2) DEFAULT 0,
      billing_type VARCHAR(50) DEFAULT 'Fixed Cost',
      hourly_rate NUMERIC(12,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Active',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='budget') THEN
            ALTER TABLE projects ADD COLUMN budget NUMERIC(12,2) DEFAULT 0;
            ALTER TABLE projects ADD COLUMN billing_type VARCHAR(50) DEFAULT 'Fixed Cost';
            ALTER TABLE projects ADD COLUMN hourly_rate NUMERIC(12,2) DEFAULT 0;
            ALTER TABLE projects ADD COLUMN project_code VARCHAR(100);
            ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
    END $$;`,
    `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL`
  ];
  for (const sql of statements) {
    try { await pool.query(sql); } catch (err) { console.error("Projects DB Init Error:", err); }
  }
};
initializeProjects();

// ================= GET ALL PROJECTS =================
const getProjects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.display_name as customer_name, c.company_name as customer_company
       FROM projects p
       LEFT JOIN customers c ON p.customer_id = c.id
       WHERE p.user_id = $1 
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error("GET PROJECTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET SINGLE PROJECT =================
const getProjectById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT p.*, c.display_name as customer_name, c.company_name as customer_company, c.email as customer_email
       FROM projects p
       LEFT JOIN customers c ON p.customer_id = c.id
       WHERE p.id = $1 AND p.user_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error("GET PROJECT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CREATE PROJECT =================
const createProject = async (req, res) => {
  const { customer_id, project_name, project_code, start_date, end_date, budget, billing_type, hourly_rate, status, description } = req.body;
  if (!project_name || !customer_id) {
      return res.status(400).json({ message: "Project name and customer are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO projects
       (user_id, customer_id, project_name, project_code, start_date, end_date, budget, billing_type, hourly_rate, status, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.user.id,
        customer_id,
        project_name,
        project_code || null,
        start_date || null,
        end_date || null,
        parseFloat(budget) || 0,
        billing_type || 'Fixed Cost',
        parseFloat(hourly_rate) || 0,
        status || 'Active',
        description || null,
      ]
    );
    res.json({ message: "Project created", project: result.rows[0] });
  } catch (err) {
    console.error("CREATE PROJECT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE PROJECT =================
const updateProject = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  delete updates.id;
  delete updates.user_id;
  delete updates.created_at;
  delete updates.updated_at;

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

  if (setColumns.length === 0) {
    return res.status(400).json({ message: "No fields provided to update" });
  }

  setColumns.push(`updated_at = CURRENT_TIMESTAMP`);
  const query = `
    UPDATE projects
    SET ${setColumns.join(", ")}
    WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
    RETURNING *
  `;
  values.push(id, req.user.id);

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json({ message: "Project updated", project: result.rows[0] });
  } catch (err) {
    console.error("UPDATE PROJECT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CANCEL/DELETE PROJECT =================
const deleteProject = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if invoices or expenses are linked
    const invCheck = await pool.query(`SELECT id FROM invoices WHERE project_id = $1 LIMIT 1`, [id]);
    const expCheck = await pool.query(`SELECT id FROM expenses WHERE project_id = $1 LIMIT 1`, [id]);
    
    if (invCheck.rows.length > 0 || expCheck.rows.length > 0) {
        // If linked transactions exist, cancel instead of delete
        const result = await pool.query(
            `UPDATE projects SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
            [id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Project not found" });
        return res.json({ message: "Project cancelled as it has linked transactions.", project: result.rows[0] });
    }

    const result = await pool.query(
      `DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("DELETE PROJECT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= PROJECT INVOICES =================
const getProjectInvoices = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM invoices WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
            [id, req.user.id]
        );
        res.json({ invoices: result.rows });
    } catch (err) {
        console.error("GET PROJECT INVOICES ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ================= PROJECT EXPENSES =================
const getProjectExpenses = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM expenses WHERE project_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
            [id, req.user.id]
        );
        res.json({ expenses: result.rows });
    } catch (err) {
        console.error("GET PROJECT EXPENSES ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ================= PROJECT PROFITABILITY =================
const getProjectProfitability = async (req, res) => {
    const { id } = req.params;
    try {
        // Get total invoiced and total paid from invoices
        const invResult = await pool.query(
            `SELECT 
                SUM(total) as total_invoiced,
                SUM(total - balance_due) as total_paid
             FROM invoices 
             WHERE project_id = $1 AND user_id = $2 AND status != 'draft' AND status != 'cancelled'`,
            [id, req.user.id]
        );

        // Get total expenses
        const expResult = await pool.query(
            `SELECT SUM(amount) as total_expenses
             FROM expenses
             WHERE project_id = $1 AND user_id = $2`,
             [id, req.user.id]
        );

        const projectResult = await pool.query(`SELECT budget FROM projects WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
        
        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: "Project not found" });
        }

        const totalInvoiced = parseFloat(invResult.rows[0].total_invoiced) || 0;
        const totalPaid = parseFloat(invResult.rows[0].total_paid) || 0;
        const totalExpenses = parseFloat(expResult.rows[0].total_expenses) || 0;
        const budget = parseFloat(projectResult.rows[0].budget) || 0;

        // Get Timesheets data
        let totalBillableHours = 0;
        let totalNonBillableHours = 0;
        let totalTimesheetBillableAmount = 0;
        let totalInvoicedTimesheetAmount = 0;

        try {
            const tsResult = await pool.query(
                `SELECT billing_type, status, hours, billable_amount 
                 FROM timesheets 
                 WHERE project_id = $1 AND user_id = $2`,
                [id, req.user.id]
            );
            
            tsResult.rows.forEach(ts => {
                const hrs = parseFloat(ts.hours) || 0;
                const amt = parseFloat(ts.billable_amount) || 0;
                
                if (ts.billing_type === 'Billable') {
                    totalBillableHours += hrs;
                    totalTimesheetBillableAmount += amt;
                    if (ts.status === 'Invoiced') {
                        totalInvoicedTimesheetAmount += amt;
                    }
                } else {
                    totalNonBillableHours += hrs;
                }
            });
        } catch(e) {
            // timesheets table might not exist if module is not fully initialized, safe fallback
            console.error("Could not fetch project timesheets for profitability:", e);
        }

        const profitLoss = totalInvoiced - totalExpenses;
        const budgetUsagePercent = budget > 0 ? (totalExpenses / budget) * 100 : 0;

        res.json({
            profitability: {
                total_invoiced: totalInvoiced,
                total_paid: totalPaid,
                total_expenses: totalExpenses,
                profit_loss: profitLoss,
                budget: budget,
                budget_usage_percent: budgetUsagePercent,
                // Timesheet stats
                total_billable_hours: totalBillableHours,
                total_non_billable_hours: totalNonBillableHours,
                total_timesheet_billable_amount: totalTimesheetBillableAmount,
                total_invoiced_timesheet_amount: totalInvoicedTimesheetAmount,
                unbilled_timesheet_amount: totalTimesheetBillableAmount - totalInvoicedTimesheetAmount
            }
        });

    } catch (err) {
        console.error("GET PROJECT PROFITABILITY ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ================= PROJECT TIMESHEETS =================
const getProjectTimesheets = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT t.*, u.name as staff_name
             FROM timesheets t 
             LEFT JOIN users u ON t.staff_id = u.id
             WHERE t.project_id = $1 AND t.user_id = $2 
             ORDER BY t.work_date DESC, t.created_at DESC`,
            [id, req.user.id]
        );
        res.json({ timesheets: result.rows });
    } catch (err) {
        console.error("GET PROJECT TIMESHEETS ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectInvoices,
  getProjectExpenses,
  getProjectProfitability,
  getProjectTimesheets
};
