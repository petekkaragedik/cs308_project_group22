/**
 * Fatura e-postası — Brevo Transactional API (PDF ek).
 * https://developers.brevo.com/reference/sendtransacemail
 *
 * .env:
 *   BREVO_API_KEY=xkeysib-...
 *   BREVO_SENDER_EMAIL=doğrulanmış gönderen (Brevo → Senders)
 *   BREVO_SENDER_NAME=SCYLLA Store (isteğe bağlı)
 */

const { BrevoClient } = require('@getbrevo/brevo');

function brevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && String(process.env.BREVO_API_KEY).trim());
}

async function sendInvoiceEmail({ to, invoiceNumber, pdfBuffer }) {
  const apiKey = process.env.BREVO_API_KEY && String(process.env.BREVO_API_KEY).trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL && String(process.env.BREVO_SENDER_EMAIL).trim();

  if (!apiKey) {
    console.warn('[invoice-email] BREVO_API_KEY eksik. backend/.env içine ekleyip sunucuyu yeniden başlat.');
    return { sent: false, reason: 'brevo_not_configured' };
  }

  if (!senderEmail) {
    console.warn('[invoice-email] BREVO_SENDER_EMAIL eksik (Brevo panelinde doğrulanmış gönderen).');
    return { sent: false, reason: 'brevo_sender_missing' };
  }

  const senderName = (process.env.BREVO_SENDER_NAME || 'SCYLLA Store').trim();
  const safeName = String(invoiceNumber).replace(/[^\w.-]+/g, '_');
  const safeInvoice = String(invoiceNumber).replace(/</g, '');
  const subject = `Your SCYLLA invoice ${invoiceNumber}`;
  const text = `Thank you for your purchase. Your invoice ${invoiceNumber} is attached as a PDF.`;
  const html = `<p>Thank you for your purchase.</p><p>Your invoice <strong>${safeInvoice}</strong> is attached as a PDF.</p>`;

  const client = new BrevoClient({ apiKey });

  await client.transactionalEmails.sendTransacEmail({
    subject,
    textContent: text,
    htmlContent: html,
    sender: {
      email: senderEmail,
      name: senderName,
    },
    to: [{ email: to }],
    attachment: [
      {
        name: `invoice-${safeName}.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
  });

  console.info('[invoice-email] Brevo ile gönderildi.', { to });
  return { sent: true, transport: 'brevo' };
}

module.exports = { sendInvoiceEmail, brevoConfigured };
