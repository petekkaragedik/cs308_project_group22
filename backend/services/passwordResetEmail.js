/**
 * Password Reset Email — Brevo Transactional API
 * Sends password reset link to user
 *
 * .env:
 *   BREVO_API_KEY=xkeysib-...
 *   BREVO_SENDER_EMAIL=verified sender email
 *   BREVO_SENDER_NAME=SCYLLA Store (optional)
 *   FRONTEND_URL=http://localhost:3000 (for reset link)
 */

const { BrevoClient } = require('@getbrevo/brevo');

function brevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && String(process.env.BREVO_API_KEY).trim());
}

async function sendPasswordResetEmail({ to, resetToken }) {
  const apiKey = process.env.BREVO_API_KEY && String(process.env.BREVO_API_KEY).trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL && String(process.env.BREVO_SENDER_EMAIL).trim();
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').trim();

  if (!apiKey) {
    console.warn('[password-reset-email] BREVO_API_KEY missing. Add to backend/.env and restart server.');
    return { sent: false, reason: 'brevo_not_configured' };
  }

  if (!senderEmail) {
    console.warn('[password-reset-email] BREVO_SENDER_EMAIL missing (must be verified in Brevo panel).');
    return { sent: false, reason: 'brevo_sender_missing' };
  }

  const senderName = (process.env.BREVO_SENDER_NAME || 'SCYLLA Store').trim();
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const subject = 'Reset your SCYLLA password';

  const textContent = `Reset Your Password

We received a request to reset your SCYLLA password.

Click this link to set a new password:
${resetLink}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

- SCYLLA Store`;

  const htmlContent = `
<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #F5F2ED; padding: 40px 24px;">
  <div style="background: white; padding: 40px; border-radius: 40px;">
    <h2 style="font-family: 'Playfair Display', serif; color: #1A1A1A; margin: 0 0 16px; font-size: 24px; font-weight: 400;">
      Reset Your Password
    </h2>
    <p style="color: #4A4A4A; margin: 0 0 24px; line-height: 1.6; font-size: 15px;">
      We received a request to reset your SCYLLA password. Click the button below to set a new password:
    </p>
    <a href="${resetLink}"
       style="display: inline-block; background: #FEF9C3; color: #1A1A1A; padding: 16px 32px;
              border-radius: 16px; text-decoration: none; font-weight: 600; letter-spacing: 0.05em; font-size: 14px;">
      RESET PASSWORD
    </a>
    <p style="color: #7A7A7A; margin: 24px 0 0; font-size: 14px; line-height: 1.6;">
      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
    <p style="color: #7A7A7A; margin: 16px 0 0; font-size: 14px;">
      - SCYLLA Store
    </p>
  </div>
</div>`;

  const client = new BrevoClient({ apiKey });

  try {
    await client.transactionalEmails.sendTransacEmail({
      subject,
      textContent,
      htmlContent,
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [{ email: to }],
    });

    console.info('[password-reset-email] Sent via Brevo.', { to });
    return { sent: true, transport: 'brevo' };
  } catch (error) {
    console.error('[password-reset-email] Failed to send:', error);
    return { sent: false, reason: 'send_failed', error: error.message };
  }
}

module.exports = { sendPasswordResetEmail, brevoConfigured };
