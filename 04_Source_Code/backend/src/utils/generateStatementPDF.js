/**
 * generateStatementPDF.js
 * Generates a customer Statement of Accounts PDF using Puppeteer.
 * Pattern: mirrors generateInvoicePDF.js
 */
const puppeteer = require('puppeteer');

const ORG_NAME = 'Tinplate Computer Training Center';
const ORG_ADDRESS = '2nd Floor, Thakur Pyara Singh Road, Jamshedpur – 831001';
const ORG_EMAIL = 'kumarrahulraj468@gmail.com';
const ORG_COUNTRY = 'India';

/**
 * @param {object} customer  - customer row from DB
 * @param {Array}  invoices  - array of invoice rows filtered by date range
 * @param {string} fromDate  - 'YYYY-MM-DD'
 * @param {string} toDate    - 'YYYY-MM-DD'
 */
async function generateStatementPDF(customer, invoices, fromDate, toDate) {
  const customerName = customer.display_name ||
    [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
    customer.company_name || customer.email || 'Customer';

  const openingBalance = parseFloat(customer.opening_balance) || 0;
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
  const amountReceived = 0; // TODO: sum from payments table when available
  const balanceDue = openingBalance + totalInvoiced - amountReceived;

  const invoiceRows = invoices.map((inv, i) => `
    <tr>
      <td>${new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
      <td>Invoice ${inv.invoice_number || '—'}</td>
      <td>${inv.description || '—'}</td>
      <td style="text-align: right;">${parseFloat(inv.total_amount || 0).toFixed(2)}</td>
      <td style="text-align: right;">0.00</td>
      <td style="text-align: right;">${balanceDue.toFixed(2)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; color: #333; margin: 0; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .org-details { text-align: right; line-height: 1.5; font-size: 13px; }
  .org-details h2 { margin: 0 0 5px 0; font-size: 16px; color: #111; }
  .mid-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .to-section { font-size: 13px; }
  .to-section .to-label { font-weight: bold; margin-bottom: 5px; }
  .to-section .customer-name { color: #2275d7; font-weight: bold; font-size: 15px; }
  .title-section { text-align: center; margin-right: 40px; }
  .title-section h1 { margin: 0 0 10px 0; font-size: 26px; color: #111; font-weight: bold; }
  .date-range { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; font-size: 13px; }
  
  .account-summary { width: 350px; float: right; margin-bottom: 30px; border-collapse: collapse; }
  .account-summary th { background: #f2f2f2; padding: 8px 10px; text-align: left; font-weight: bold; }
  .account-summary td { padding: 8px 10px; border-bottom: 1px solid #e0e0e0; }
  
  .txn-table { width: 100%; border-collapse: collapse; clear: both; }
  .txn-table th { background: #333; color: #fff; padding: 10px; text-align: left; font-weight: normal; }
  .txn-table td { padding: 12px 10px; border-bottom: 1px solid #e0e0e0; }
  
  .final-balance { text-align: right; margin-top: 20px; font-weight: bold; font-size: 14px; padding-right: 10px; }
  .final-balance span { display: inline-block; width: 120px; }
</style></head><body>
  <div class="header">
    <div></div>
    <div class="org-details">
      <h2>Thesis International College</h2>
      <div>Jharkhand</div>
      <div>India</div>
      <div>91-9065329152</div>
      <div>pritishakumari555@gmail.com</div>
    </div>
  </div>
  
  <div class="mid-section">
    <div class="to-section">
      <div class="to-label">To</div>
      <div class="customer-name">${customerName}</div>
    </div>
    <div class="title-section">
      <h1>Statement of Accounts</h1>
      <div class="date-range">${fromDate} To ${toDate}</div>
    </div>
  </div>
  
  <table class="account-summary">
    <thead>
      <tr><th colspan="2">Account Summary</th></tr>
    </thead>
    <tbody>
      <tr><td>Opening Balance</td><td style="text-align: right;">₹ ${openingBalance.toFixed(2)}</td></tr>
      <tr><td>Invoiced Amount</td><td style="text-align: right;">₹ ${totalInvoiced.toFixed(2)}</td></tr>
      <tr><td>Amount Received</td><td style="text-align: right;">₹ ${amountReceived.toFixed(2)}</td></tr>
      <tr><td>Balance Due</td><td style="text-align: right;">₹ ${balanceDue.toFixed(2)}</td></tr>
    </tbody>
  </table>
  
  <table class="txn-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Transactions</th>
        <th>Details</th>
        <th style="text-align: right;">Amount</th>
        <th style="text-align: right;">Payments</th>
        <th style="text-align: right;">Balance</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${fromDate}</td>
        <td>***Opening Balance***</td>
        <td></td>
        <td style="text-align: right;">${openingBalance.toFixed(2)}</td>
        <td style="text-align: right;"></td>
        <td style="text-align: right;">${openingBalance.toFixed(2)}</td>
      </tr>
      ${invoiceRows || '<tr><td colspan="6" style="text-align:center; padding:20px;">No transactions in this period.</td></tr>'}
    </tbody>
  </table>
  
  <div class="final-balance">
    Balance Due <span>₹ ${balanceDue.toFixed(2)}</span>
  </div>
</body></html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = generateStatementPDF;
