const cron = require('node-cron');
const pool = require('../config/db');

/**
 * Calculates the next due date for a recurring expense based on its frequency, start_date, and due_day.
 * Also checks if the due date has already been processed by comparing with last_processed_date.
 */
function getNextDueDate(startDate, dueDay, frequency, lastProcessedDate) {
  const start = new Date(startDate);
  const now = new Date();
  
  // We start looking from the start_date's month/year, or the last processed date's month/year
  let currentRef = lastProcessedDate ? new Date(lastProcessedDate) : new Date(start);
  
  // If we just processed it, the next one is in the future based on frequency
  let targetMonth = currentRef.getMonth();
  let targetYear = currentRef.getFullYear();

  if (lastProcessedDate) {
    if (frequency === 'Monthly') targetMonth += 1;
    if (frequency === 'Quarterly') targetMonth += 3;
    if (frequency === 'Yearly') targetYear += 1;
  } else {
    // If it hasn't been processed yet, the very first due date is the start_date's month/year
    // Wait, if start_date is in the past, we should generate for the past until we catch up?
    // Let's just generate the next due date that is <= today and > lastProcessedDate
    // For simplicity, we just generate the immediate next valid due date after lastProcessedDate.
  }

  // Handle year rollover
  while (targetMonth > 11) {
    targetMonth -= 12;
    targetYear += 1;
  }

  // Create the target date using the specific due_day
  let nextDate = new Date(targetYear, targetMonth, dueDay);
  
  // Handle edge case where due_day is 31 but month has 30 days
  if (nextDate.getMonth() !== targetMonth) {
    // It rolled over to the next month, so set to last day of target month
    nextDate = new Date(targetYear, targetMonth + 1, 0);
  }

  return nextDate;
}

const processRecurringExpenses = async () => {
  console.log('[CRON] Starting recurring expenses processing...');
  try {
    // Fetch all active recurring expenses that have started
    const result = await pool.query(
      `SELECT * FROM recurring_expenses 
       WHERE status = 'Active' 
       AND start_date <= CURRENT_DATE 
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)`
    );

    let processedCount = 0;

    for (const expense of result.rows) {
      const nextDueDate = getNextDueDate(
        expense.start_date, 
        expense.due_day, 
        expense.frequency, 
        expense.last_processed_date
      );

      const now = new Date();
      now.setHours(0,0,0,0);
      nextDueDate.setHours(0,0,0,0);

      // If the next due date is today or in the past, generate the expense!
      if (nextDueDate <= now) {
        
        // 1. Insert into expenses table
        const insertQuery = `
          INSERT INTO expenses (expense_date, category, amount, user_id, description) 
          VALUES ($1, $2, $3, $4, $5)
        `;
        const descriptionText = expense.notes ? `[Auto-Generated Recurring Expense]\n${expense.notes}` : `[Auto-Generated Recurring Expense] ${expense.expense_name}`;
        
        await pool.query(insertQuery, [
          nextDueDate.toISOString().split('T')[0],
          expense.category,
          expense.amount,
          expense.created_by,
          descriptionText
        ]);

        // 2. Update last_processed_date
        const updateQuery = `
          UPDATE recurring_expenses 
          SET last_processed_date = $1 
          WHERE id = $2
        `;
        await pool.query(updateQuery, [
          nextDueDate.toISOString().split('T')[0],
          expense.id
        ]);

        console.log(`[CRON] Generated expense for: ${expense.expense_name} (Due: ${nextDueDate.toISOString().split('T')[0]})`);
        processedCount++;
      }
    }
    
    console.log(`[CRON] Processing complete. Generated ${processedCount} new expenses.`);
  } catch (error) {
    console.error('[CRON] Error processing recurring expenses:', error);
  }
};

const initCronJobs = () => {
  // Run daily at midnight
  cron.schedule('0 0 * * *', () => {
    processRecurringExpenses();
  });

  // Also run immediately on startup to catch up any missed ones
  processRecurringExpenses();
};

module.exports = { initCronJobs };
