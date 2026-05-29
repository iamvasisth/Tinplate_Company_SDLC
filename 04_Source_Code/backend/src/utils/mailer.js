const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.sendinblue.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "your-brevo-login@example.com",
    pass: process.env.SMTP_PASS || "your-brevo-smtp-key",
  },
});

/**
 * Send an email
 * @param {Object} options - { to, subject, html, from, cc, bcc }
 */
const sendEmail = async ({ to, subject, html, from, cc, bcc }) => {
  const mailOptions = {
    from: from || process.env.FROM_EMAIL || "noreply@tinplate.com",
    to,
    subject,
    html,
  };
  if (cc) mailOptions.cc = cc;
  if (bcc) mailOptions.bcc = bcc;

  await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };