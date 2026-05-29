const puppeteer = require("puppeteer");
const numberToWords = require("number-to-words");
const pool = require("../config/db");

async function generateInvoicePDF(invoice, items, customer, userId) {
  // Fetch user preferences
  const prefsRes = await pool.query(
    "SELECT * FROM invoice_preferences WHERE user_id = $1",
    [userId]
  );
  const prefs = prefsRes.rows[0] || {};

  const bizName = "Tinplate Computer Training Center";
  const bizAddress1 = "2nd Floor, Thakur Pyare Singh Road";
  const bizAddress2 = "Jamshedpur - 831001";
  const bizEmail = "india.technologyhelp88@gmail.com";
  const bizGSTIN = "YOUR_GSTIN"; // Replace with actual
  const bizPAN = "YOUR_PAN"; // Replace with actual

  const invoiceNumber = invoice.invoice_number || `INV-${String(invoice.id).padStart(6, "0")}`;
  const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString("en-IN");
  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-IN") : "—";
  const terms = invoice.payment_terms || "Due on Receipt";
  const customerName = customer?.display_name || "Customer";
  const customerAddress = customer?.address || "";
  const customerEmail = customer?.email || "";
  const notes = invoice.notes || "Looking forward for your business.";
  const total = parseFloat(invoice.total_amount) || 0;
  const balanceDue = parseFloat(invoice.balance_due) || total;

  let totalWords = "";
  try {
    totalWords = numberToWords.toWords(Math.floor(total));
    totalWords = totalWords.charAt(0).toUpperCase() + totalWords.slice(1);
  } catch (e) {
    totalWords = "Indian Rupee " + total.toFixed(0);
  }

  // Build items rows with optional HSN column
  const showHSN = prefs.show_hsn || false;
  let itemsRows = "";
  if (items.length > 0) {
    items.forEach((item, idx) => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.unit_price) || 0;
      const amount = qty * rate;
      itemsRows += `<tr>
        <td style="padding:6px; border-bottom:1px solid #ddd;">${idx + 1}</td>
        <td style="padding:6px; border-bottom:1px solid #ddd;">${item.description || "—"}</td>`;
      if (showHSN) {
        itemsRows += `<td style="padding:6px; border-bottom:1px solid #ddd;">${item.hsn_code || "—"}</td>`;
      }
      itemsRows += `<td style="padding:6px; border-bottom:1px solid #ddd; text-align:center;">${qty.toFixed(2)}</td>
        <td style="padding:6px; border-bottom:1px solid #ddd; text-align:right;">₹${rate.toFixed(2)}</td>
        <td style="padding:6px; border-bottom:1px solid #ddd; text-align:right;">₹${amount.toFixed(2)}</td>
      </tr>`;
    });
  } else {
    const colspan = showHSN ? 6 : 5;
    itemsRows = `<tr><td colspan="${colspan}" style="padding:16px; text-align:center; color:#888;">No items</td></tr>`;
  }

  // CGST/SGST calculation
  const showCGSTSGST = prefs.show_cgst_sgst || false;
  const cgst = showCGSTSGST ? (total * 0.09) : 0; // Example: 9% CGST
  const sgst = showCGSTSGST ? (total * 0.09) : 0;
  const grandTotal = total + cgst + sgst;

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 20px 25px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .biz-name { font-size: 16px; font-weight: bold; }
  .biz-detail { font-size: 10px; color: #555; }
  .doc-title { font-size: 22px; font-weight: bold; color: #000; }
  .divider { border-top: 1px solid #999; margin: 10px 0; }
  .meta { font-size: 11px; }
  .meta div { margin: 2px 0; }
  .bill-to { font-size: 11px; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th { background: #f0f0f0; padding: 6px; text-align: left; font-weight: bold; border-bottom: 2px solid #333; }
  td { padding: 6px; border-bottom: 1px solid #ddd; }
  .totals { text-align: right; margin: 10px 0; font-size: 12px; }
  .words { margin: 10px 0; font-style: italic; }
  .notes { margin: 10px 0; font-size: 11px; }
  .signature { text-align: right; margin-top: 40px; }
  .footer { text-align: center; font-size: 10px; color: #888; margin-top: 30px; border-top: 1px solid #ccc; padding-top: 8px; }
</style></head><body>
  <div class="header">
    <div>
      <div class="biz-name">${bizName}</div>
      <div class="biz-detail">${bizAddress1}</div>
      <div class="biz-detail">${bizAddress2}</div>
      <div class="biz-detail">${bizEmail}</div>
      ${prefs.show_gstin ? `<div class="biz-detail">GSTIN: ${bizGSTIN}</div>` : ''}
      ${prefs.show_pan ? `<div class="biz-detail">PAN NO: ${bizPAN}</div>` : ''}
    </div>
    <div class="doc-title">TAX INVOICE</div>
  </div>
  <div class="divider"></div>
  <div class="meta">
    <div><strong>Invoice No:</strong> ${invoiceNumber}</div>
    <div><strong>Date:</strong> ${invoiceDate}</div>
    ${prefs.show_due_date !== false ? `<div><strong>Due Date:</strong> ${dueDate}</div>` : ''}
    ${prefs.show_payment_mode ? `<div><strong>Payment Mode:</strong> ___________</div>` : ''}
  </div>
  <div class="divider"></div>
  <div class="bill-to">
    <strong>Bill To:</strong><br>
    ${customerName}<br>
    ${customerAddress}<br>
    ${customerEmail}
  </div>
  <div class="divider"></div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        ${showHSN ? '<th>HSN Code</th>' : ''}
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <div class="totals">
    <div>Sub Total: ₹${total.toFixed(2)}</div>
    ${showCGSTSGST ? `<div>CGST @9%: ₹${cgst.toFixed(2)}</div><div>SGST @9%: ₹${sgst.toFixed(2)}</div>` : ''}
    <div style="font-weight:bold;">Total: ₹${grandTotal.toFixed(2)}</div>
    <div style="font-weight:bold;">Balance Due: ₹${balanceDue.toFixed(2)}</div>
  </div>
  <div class="words"><strong>Total in Words:</strong> Indian Rupee ${totalWords} Only</div>
  ${prefs.show_terms !== false ? `<div class="notes"><strong>Terms & Conditions:</strong><br>${terms}</div>` : ''}
  ${prefs.show_signature !== false ? `<div class="signature">Authorised Signatory<br><br>_________________</div>` : ''}
  <div class="footer">POWERED BY ${bizName}</div>
</body></html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "12mm", right: "12mm" }
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = generateInvoicePDF;