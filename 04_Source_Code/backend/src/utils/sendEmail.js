const nodemailer = require("nodemailer");

/**
 * sendEmail – Sends an email using Brevo SMTP (or any configured SMTP provider)
 * @param {string} to      – Recipient email address
 * @param {string} subject – Email subject line
 * @param {string} text    – Plain-text fallback body
 * @param {string} html    – HTML body (optional, overrides text if set)
 */
const sendEmail = async (to, subject, text, html = "") => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,              // Brevo uses STARTTLS on port 587 (not SSL)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"RUPP Books" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html: html || text,        // use html if provided, else fall back to plain text
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Email] Sent to ${to} | MessageId: ${info.messageId}`);
  return info;
};

module.exports = sendEmail;
