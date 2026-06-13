/**
 * generateStatementPDF.js
 * Generates a Customer Statement of Accounts PDF using PDFKit (no Puppeteer needed).
 */
const PDFDocument = require('pdfkit');

const ORG_NAME    = 'Tinplate Computer Training Center';
const ORG_ADDRESS = '2nd Floor, Thakur Pyara Singh Road, Jamshedpur – 831001';
const ORG_EMAIL   = 'kumarrahulraj468@gmail.com';
const ORG_COUNTRY = 'India';

/**
 * @param {object} customer  - customer row from DB
 * @param {Array}  invoices  - array of invoice rows filtered by date range
 * @param {string} fromDate  - 'YYYY-MM-DD'
 * @param {string} toDate    - 'YYYY-MM-DD'
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateStatementPDF(customer, invoices, fromDate, toDate) {
  const customerName =
    customer.display_name ||
    [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
    customer.company_name || customer.email || 'Customer';

  const openingBalance = parseFloat(customer.opening_balance) || 0;
  const totalInvoiced  = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
  const amountReceived = 0; // TODO: sum from payments table when available
  const balanceDue     = openingBalance + totalInvoiced - amountReceived;

  return new Promise((resolve, reject) => {
    const doc     = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end',  ()    => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const drawLine = (y, from = 50, to = 545) =>
      doc.moveTo(from, y).lineTo(to, y).strokeColor('#cccccc').stroke().strokeColor('#000000');

    let y = 55;

    // ── Header: Org info (right-aligned) ──────────────────────────────
    doc.fontSize(13).font('Helvetica-Bold').text(ORG_NAME, 50, y, { align: 'right' });
    y += 16;
    doc.fontSize(9).font('Helvetica').text(ORG_ADDRESS, 50, y, { align: 'right' });
    y += 12;
    doc.text(`${ORG_COUNTRY}  |  ${ORG_EMAIL}`, 50, y, { align: 'right' });
    y += 20;
    drawLine(y); y += 14;

    // ── Title ────────────────────────────────────────────────────────
    doc.fontSize(20).font('Helvetica-Bold').text('Statement of Accounts', 50, y, { align: 'center' });
    y += 26;
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
       .text(`Period: ${fromDate}  to  ${toDate}`, 50, y, { align: 'center' });
    doc.fillColor('#000000');
    y += 20;
    drawLine(y); y += 14;

    // ── Customer Info ────────────────────────────────────────────────
    doc.fontSize(9).font('Helvetica').text('To', 50, y);
    y += 12;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a56db').text(customerName, 50, y);
    doc.fillColor('#000000');
    y += 22;
    drawLine(y); y += 14;

    // ── Account Summary box (right side) ─────────────────────────────
    const boxX = 340, boxW = 205, rowH = 20;
    const summaryRows = [
      ['Opening Balance', openingBalance],
      ['Invoiced Amount', totalInvoiced],
      ['Amount Received', amountReceived],
      ['Balance Due',     balanceDue],
    ];
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
       .rect(boxX, y, boxW, 20).fill('#333333');
    doc.text('Account Summary', boxX + 6, y + 5, { width: boxW - 12 });
    doc.fillColor('#000000');
    let boxY = y + 20;
    summaryRows.forEach(([label, val], i) => {
      if (i % 2 === 0) doc.rect(boxX, boxY, boxW, rowH).fill('#f7f7f7');
      doc.fillColor('#000000').font('Helvetica').fontSize(9)
         .text(label, boxX + 6, boxY + 5)
         .text(`INR ${val.toFixed(2)}`, boxX + 6, boxY + 5, { width: boxW - 12, align: 'right' });
      boxY += rowH;
    });
    y = boxY + 16;
    drawLine(y); y += 14;

    // ── Transactions Table header ────────────────────────────────────
    const cols = { date: 50, txn: 120, details: 240, amount: 345, payments: 420, balance: 490 };
    const colW = { date: 68, txn: 118, details: 100, amount: 72, payments: 68, balance: 55 };

    doc.rect(50, y, 495, 20).fill('#333333');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
    doc.text('Date',        cols.date,     y + 5, { width: colW.date });
    doc.text('Transaction', cols.txn,      y + 5, { width: colW.txn });
    doc.text('Details',     cols.details,  y + 5, { width: colW.details });
    doc.text('Amount',      cols.amount,   y + 5, { width: colW.amount,    align: 'right' });
    doc.text('Payments',    cols.payments, y + 5, { width: colW.payments,  align: 'right' });
    doc.text('Balance',     cols.balance,  y + 5, { width: colW.balance,   align: 'right' });
    doc.fillColor('#000000');
    y += 20;

    // Opening balance row
    doc.rect(50, y, 495, rowH).fill('#f2f2f2');
    doc.fillColor('#000000').font('Helvetica').fontSize(9);
    doc.text(fromDate,             cols.date,     y + 5, { width: colW.date });
    doc.text('***Opening Balance***', cols.txn,   y + 5, { width: 200 });
    doc.text(openingBalance.toFixed(2), cols.amount, y + 5, { width: colW.amount, align: 'right' });
    doc.text('',                   cols.payments, y + 5, { width: colW.payments });
    doc.text(openingBalance.toFixed(2), cols.balance, y + 5, { width: colW.balance, align: 'right' });
    y += rowH;

    if (invoices.length === 0) {
      doc.rect(50, y, 495, 28).fill('#fafafa');
      doc.fillColor('#888888').font('Helvetica').fontSize(9)
         .text('No transactions in this period.', 50, y + 8, { width: 495, align: 'center' });
      doc.fillColor('#000000');
      y += 28;
    } else {
      invoices.forEach((inv, idx) => {
        if (y + rowH > 750) { doc.addPage(); y = 50; }
        if (idx % 2 === 0) doc.rect(50, y, 495, rowH).fill('#f9f9f9');
        doc.fillColor('#000000').font('Helvetica').fontSize(9);
        const invDate = inv.invoice_date
          ? new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '—';
        const invAmt = parseFloat(inv.total_amount || 0);
        doc.text(invDate,                          cols.date,     y + 5, { width: colW.date });
        doc.text(`Invoice ${inv.invoice_number || '—'}`, cols.txn, y + 5, { width: colW.txn });
        doc.text(inv.description || '—',           cols.details,  y + 5, { width: colW.details });
        doc.text(invAmt.toFixed(2),                cols.amount,   y + 5, { width: colW.amount,   align: 'right' });
        doc.text('0.00',                           cols.payments, y + 5, { width: colW.payments, align: 'right' });
        doc.text(balanceDue.toFixed(2),            cols.balance,  y + 5, { width: colW.balance,  align: 'right' });
        y += rowH;
      });
    }

    drawLine(y); y += 14;

    // ── Balance Due summary (bottom right) ───────────────────────────
    doc.font('Helvetica-Bold').fontSize(11)
       .text(`Balance Due:  INR ${balanceDue.toFixed(2)}`, 50, y, { align: 'right' });
    y += 30;

    // ── Footer ───────────────────────────────────────────────────────
    const footerY = doc.page.height - 45;
    drawLine(footerY);
    doc.fontSize(8).font('Helvetica').fillColor('#888888')
       .text('POWERED BY TINPLATE COMPUTER TRAINING CENTER', 50, footerY + 8, { align: 'center' });

    doc.end();
  });
}

module.exports = generateStatementPDF;
