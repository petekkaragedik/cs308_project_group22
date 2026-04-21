const PDFDocument = require('pdfkit');

/**
 * @param {object} payload
 * @param {string} payload.invoiceNumber
 * @param {Date|string} payload.issuedAt
 * @param {string} payload.customerEmail
 * @param {string|null} payload.customerName
 * @param {string} payload.currency
 * @param {number} payload.total
 * @param {Array<{ productName: string, size: string, quantity: number, unitPrice: number, lineTotal: number }>} payload.lines
 */
function generateInvoicePdfBuffer(payload) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const issued = new Date(payload.issuedAt);
    const dateStr = Number.isNaN(issued.getTime())
      ? String(payload.issuedAt)
      : issued.toISOString().slice(0, 10);

    doc.fontSize(20).fillColor('#111111').text('SCYLLA', { align: 'center' });
    doc.fontSize(11).fillColor('#444444').text('Invoice', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(10).fillColor('#222222');
    doc.text(`Invoice #: ${payload.invoiceNumber}`);
    doc.text(`Date: ${dateStr}`);
    doc.moveDown(0.5);
    doc.text(`Bill to: ${payload.customerName?.trim() || 'Customer'}`);
    doc.text(`Email: ${payload.customerEmail}`);
    doc.moveDown(1);

    const fmt = (n) =>
      new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(n));

    doc.fontSize(10).text('Items', { underline: true });
    doc.moveDown(0.4);

    let y = doc.y;
    const left = doc.page.margins.left;
    const colQty = left + 280;
    const colUnit = left + 320;
    const colTotal = left + 400;

    doc.fontSize(9).fillColor('#555555');
    doc.text('Description', left, y);
    doc.text('Qty', colQty, y);
    doc.text('Unit', colUnit, y);
    doc.text('Line total', colTotal, y);
    doc.moveDown(0.8);
    y = doc.y;
    doc.fillColor('#222222');

    for (const line of payload.lines) {
      const nm = line.productName.length > 72 ? `${line.productName.slice(0, 72)}…` : line.productName;
      const title = `${nm} (size ${line.size})`;
      const rowY = doc.y;
      doc.fontSize(9).text(title, left, rowY, { width: 260, lineGap: 2 });
      doc.text(String(line.quantity), colQty, rowY);
      doc.text(`${fmt(line.unitPrice)} TRY`, colUnit, rowY);
      doc.text(`${fmt(line.lineTotal)} TRY`, colTotal, rowY);
      doc.moveDown(0.6);
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
      }
    }

    doc.moveDown(1.5);
    doc.fontSize(11).fillColor('#111111');
    doc.text(`Total: ${fmt(payload.total)} TRY`, { align: 'right' });

    doc.moveDown(2);
    doc.fontSize(8).fillColor('#888888').text(
      'Thank you for shopping at SCYLLA.',
      { align: 'center' }
    );

    doc.end();
  });
}

module.exports = { generateInvoicePdfBuffer };
