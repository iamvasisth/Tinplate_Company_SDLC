const pool = require("../config/db");

/**
 * Checks if a transaction is locked based on its date and module.
 * @param {number} userId - The ID of the user/organization.
 * @param {string} moduleName - The name of the module (e.g., 'Invoices', 'Expenses').
 * @param {string|Date} transactionDate - The date of the transaction.
 * @throws {Error} If the transaction is locked.
 */
const checkTransactionLock = async (userId, moduleName, transactionDate) => {
    if (!transactionDate) return; // Cannot check lock without a date

    const activeLockRes = await pool.query(
        `SELECT lock_date, locked_modules FROM transaction_locks WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
        [userId]
    );

    if (activeLockRes.rows.length === 0) return; // No active lock

    const lock = activeLockRes.rows[0];
    const lockedModules = lock.locked_modules || []; // Assuming JSONB array

    // Check if module is in locked_modules
    if (lockedModules.includes(moduleName)) {
        const tDate = new Date(transactionDate).toISOString().slice(0, 10);
        const lDate = new Date(lock.lock_date).toISOString().slice(0, 10);

        if (tDate <= lDate) {
            throw new Error(`This transaction is locked because it falls on or before the accounting lock date (${lDate}).`);
        }
    }
};

module.exports = { checkTransactionLock };
