const pool = require("../config/db");
const { checkTransactionLock } = require("../utils/lockHelper");

// ---- Ensure table exists ----
const initializeBulkUpdateLogs = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bulk_update_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        module_name VARCHAR(100) NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        selected_record_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        request_payload JSONB,
        result_summary JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error("Bulk Update Logs DB Init Error:", err);
  }
};
initializeBulkUpdateLogs();

const getModules = (req, res) => {
    const modules = [
        { name: "Customers", actions: [{ value: "setStatus", label: "Set Status (Active/Inactive)" }] },
        { name: "Items", actions: [{ value: "setStatus", label: "Set Status (Active/Inactive)" }, { value: "setTaxRate", label: "Update Tax Rate" }, { value: "setReorderLevel", label: "Update Reorder Level" }] },
        { name: "Invoices", actions: [{ value: "setStatus", label: "Update Status" }] },
        { name: "Expenses", actions: [{ value: "setCategory", label: "Update Category" }] }
    ];
    res.json({ modules });
};

const getLogs = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM bulk_update_logs WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json({ logs: result.rows });
    } catch (err) {
        console.error("GET BULK UPDATE LOGS ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const processBulkUpdate = async (userId, moduleName, actionType, records, payload, isPreview) => {
    const results = {
        success: [],
        failed: []
    };

    const client = await pool.connect();
    try {
        if (!isPreview) await client.query("BEGIN");

        for (const recordId of records) {
            try {
                let existing;
                let table;
                let dateField;

                if (moduleName === "Customers") table = "customers";
                else if (moduleName === "Items") table = "items";
                else if (moduleName === "Invoices") { table = "invoices"; dateField = "invoice_date"; }
                else if (moduleName === "Expenses") { table = "expenses"; dateField = "expense_date"; }
                else throw new Error("Unsupported module");

                const q = await client.query(`SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`, [recordId, userId]);
                if (q.rows.length === 0) throw new Error("Record not found");
                existing = q.rows[0];

                // Transaction lock check for financial modules
                if (dateField && existing[dateField]) {
                    await checkTransactionLock(userId, moduleName, existing[dateField]);
                }

                if (!isPreview) {
                    if (moduleName === "Customers" && actionType === "setStatus") {
                        await client.query(`UPDATE customers SET is_active = $1 WHERE id = $2`, [payload.status === 'Active', recordId]);
                    } else if (moduleName === "Items" && actionType === "setStatus") {
                        await client.query(`UPDATE items SET status = $1 WHERE id = $2`, [payload.status, recordId]);
                    } else if (moduleName === "Items" && actionType === "setTaxRate") {
                        await client.query(`UPDATE items SET tax_rate = $1 WHERE id = $2`, [parseFloat(payload.tax_rate) || 0, recordId]);
                    } else if (moduleName === "Items" && actionType === "setReorderLevel") {
                         // assuming reorder_level exists, if not we will just skip gracefully or it throws
                         const checkCol = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='items' AND column_name='reorder_level'`);
                         if (checkCol.rows.length > 0) {
                             await client.query(`UPDATE items SET reorder_level = $1 WHERE id = $2`, [parseFloat(payload.reorder_level) || 0, recordId]);
                         } else {
                             throw new Error("reorder_level column not supported");
                         }
                    } else if (moduleName === "Invoices" && actionType === "setStatus") {
                        if (existing.status === 'paid' && payload.status !== 'paid') {
                            throw new Error("Cannot blindly un-pay an invoice without removing payments");
                        }
                        await client.query(`UPDATE invoices SET status = $1 WHERE id = $2`, [payload.status, recordId]);
                    } else if (moduleName === "Expenses" && actionType === "setCategory") {
                        await client.query(`UPDATE expenses SET category = $1 WHERE id = $2`, [payload.category, recordId]);
                    } else {
                        throw new Error("Unsupported action");
                    }
                }

                results.success.push({ id: recordId, name: existing.display_name || existing.name || existing.invoice_number || `Record #${recordId}` });

            } catch (err) {
                results.failed.push({ id: recordId, reason: err.message });
                // We don't rollback everything just because one failed, unless it's a massive failure.
                // For bulk, we try to do as much as possible or rollback per record.
                // Since postgres aborts transaction on error, we actually need SAVEPOINTs to continue.
                // For simplicity, if we are not using savepoints, one failure in non-preview mode would kill the transaction.
                if (!isPreview) {
                     // We should ideally use savepoints for partial success, or just do it connection-less (autocommit)
                     // Since we want partial success, let's just throw and rollback the whole thing if we are inside a tx without savepoints.
                     // Actually, better approach: autocommit for bulk updates, so partial success works.
                     throw err; 
                }
            }
        }

        if (!isPreview) await client.query("COMMIT");
    } catch (err) {
        if (!isPreview) await client.query("ROLLBACK");
        // If the whole transaction failed due to one record, we need to mark all remaining as failed
        // For simplicity in this implementation, if a DB error occurs during Apply, we'll return a 500.
        // A more robust implementation would use individual transactions or savepoints.
        throw err;
    } finally {
        client.release();
    }
    return results;
}

const previewBulkUpdate = async (req, res) => {
    const { module_name, action_type, records, payload } = req.body;
    if (!module_name || !action_type || !records || !Array.isArray(records)) {
        return res.status(400).json({ message: "Invalid request" });
    }
    try {
        const results = await processBulkUpdate(req.user.id, module_name, action_type, records, payload, true);
        res.json({ results });
    } catch (err) {
        console.error("PREVIEW BULK UPDATE ERROR:", err);
        res.status(500).json({ message: err.message || "Server error" });
    }
};

const applyBulkUpdate = async (req, res) => {
    const { module_name, action_type, records, payload } = req.body;
    if (!module_name || !action_type || !records || !Array.isArray(records)) {
        return res.status(400).json({ message: "Invalid request" });
    }
    try {
        // Run with individual transactions so partial success works
        const results = { success: [], failed: [] };
        
        for (const recordId of records) {
             const client = await pool.connect();
             try {
                 await client.query("BEGIN");
                 
                 let existing;
                 let table;
                 let dateField;

                 if (module_name === "Customers") table = "customers";
                 else if (module_name === "Items") table = "items";
                 else if (module_name === "Invoices") { table = "invoices"; dateField = "invoice_date"; }
                 else if (module_name === "Expenses") { table = "expenses"; dateField = "expense_date"; }
                 else throw new Error("Unsupported module");

                 const q = await client.query(`SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`, [recordId, req.user.id]);
                 if (q.rows.length === 0) throw new Error("Record not found");
                 existing = q.rows[0];

                 if (dateField && existing[dateField]) {
                     await checkTransactionLock(req.user.id, module_name, existing[dateField]);
                 }

                 if (module_name === "Customers" && action_type === "setStatus") {
                     await client.query(`UPDATE customers SET is_active = $1 WHERE id = $2`, [payload.status === 'Active', recordId]);
                 } else if (module_name === "Items" && action_type === "setStatus") {
                     await client.query(`UPDATE items SET status = $1 WHERE id = $2`, [payload.status, recordId]);
                 } else if (module_name === "Items" && action_type === "setTaxRate") {
                     await client.query(`UPDATE items SET tax_rate = $1 WHERE id = $2`, [parseFloat(payload.tax_rate) || 0, recordId]);
                 } else if (module_name === "Items" && action_type === "setReorderLevel") {
                      const checkCol = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='items' AND column_name='reorder_level'`);
                      if (checkCol.rows.length > 0) {
                          await client.query(`UPDATE items SET reorder_level = $1 WHERE id = $2`, [parseFloat(payload.reorder_level) || 0, recordId]);
                      } else {
                          throw new Error("reorder_level column not supported");
                      }
                 } else if (module_name === "Invoices" && action_type === "setStatus") {
                     if (existing.status === 'paid' && payload.status !== 'paid') {
                         throw new Error("Cannot blindly un-pay an invoice without removing payments");
                     }
                     await client.query(`UPDATE invoices SET status = $1 WHERE id = $2`, [payload.status, recordId]);
                 } else if (module_name === "Expenses" && action_type === "setCategory") {
                     await client.query(`UPDATE expenses SET category = $1 WHERE id = $2`, [payload.category, recordId]);
                 } else {
                     throw new Error("Unsupported action");
                 }

                 await client.query("COMMIT");
                 results.success.push({ id: recordId, name: existing.display_name || existing.name || existing.invoice_number || `Record #${recordId}` });
             } catch (e) {
                 await client.query("ROLLBACK");
                 results.failed.push({ id: recordId, reason: e.message });
             } finally {
                 client.release();
             }
        }

        // Log it
        await pool.query(
            `INSERT INTO bulk_update_logs (user_id, module_name, action_type, selected_record_count, success_count, failed_count, request_payload, result_summary)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [req.user.id, module_name, action_type, records.length, results.success.length, results.failed.length, JSON.stringify(payload), JSON.stringify(results)]
        );

        res.json({ message: "Bulk update completed", results });
    } catch (err) {
        console.error("APPLY BULK UPDATE ERROR:", err);
        res.status(500).json({ message: err.message || "Server error" });
    }
};

module.exports = {
  getModules,
  getLogs,
  previewBulkUpdate,
  applyBulkUpdate
};
