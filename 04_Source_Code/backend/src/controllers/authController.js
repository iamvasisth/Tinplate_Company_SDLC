require("dotenv").config();

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const sendEmail = require("../utils/sendEmail");

// ================= REGISTER =================
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
    });
  }

// ✅ now accepts both business_type and organization_name and role
  const { email, password, organization_name, business_type, role } = req.body;

  try {
    // Ensure organization_name and reset token columns exist
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255);
       ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
       ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;`
    ).catch(() => {}); // ignore if already exists or DB doesn't support IF NOT EXISTS

    const hashedPassword = await bcrypt.hash(password, 10);

    const validRoles = ['Admin', 'Accountant', 'Staff', 'Viewer'];
    const assignedRole = validRoles.includes(role) ? role : 'Admin';

    const result = await pool.query(
      `INSERT INTO users (email, password, business_type, organization_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, business_type, organization_name, role`,
      [email, hashedPassword, business_type || "Other", organization_name || null, assignedRole]
    );

    res.json({
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    if (error.code === "23505") {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    res.status(500).json({
      message: "Error registering user",
    });
  }
};

// ================= LOGIN =================
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
    });
  }

  const { email, password, rememberMe } = req.body;

  if (!email || !password || email.trim() === "" || password.trim() === "") {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email.trim(),
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const tokenExpiry = rememberMe ? "30d" : "1d";
    const token = jwt.sign(
      { id: user.id, email: user.email, business_type: user.business_type, role: user.role || 'Admin' },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiry },
    );

    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    };

    if (rememberMe) {
      cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    res.cookie("token", token, cookieOptions);

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        business_type: user.business_type || "Other",
        role: user.role || "Admin",
      },
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= PROFILE =================
const getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Unauthorized - no user in token",
      });
    }

    const result = await pool.query(
      "SELECT id, email, business_type, role FROM users WHERE id = $1", // ✅ added business_type & role
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Profile fetched successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= LOGOUT =================
// ================= LOGOUT =================
const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false, // local dev → false
      sameSite: "lax",
    });

    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    return res.status(500).json({ message: "Server error during logout" });
  }
};

// ================= FORGOT PASSWORD =================
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || email.trim() === "") {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [email.trim()]);
    if (result.rows.length === 0) {
      // Return generic success to avoid email enumeration
      return res.json({ message: "If this email exists, a password reset link has been sent." });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expireTime = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await pool.query(
      `UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3`,
      [token, expireTime, email.trim()]
    );

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${token}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 30px; border-radius: 8px;">
        <div style="background: #1e3a5f; padding: 20px; border-radius: 6px 6px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">RUPP Books</h1>
          <p style="color: #93c5fd; margin: 5px 0 0 0; font-size: 14px;">Accounting &amp; Finance</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border-radius: 0 0 6px 6px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
            We received a request to reset the password for your RUPP Books account associated with this email address.
          </p>
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
            Click the button below to set a new password. This link is valid for <strong>15 minutes</strong>.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #1e3a5f; color: #ffffff; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
              Reset My Password
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; line-height: 1.6;">
            If the button above doesn't work, copy and paste this URL into your browser:
          </p>
          <p style="color: #1e3a5f; font-size: 13px; word-break: break-all;">${resetLink}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            If you did not request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
      </div>
    `;

    await sendEmail(
      email.trim(),
      "Reset Your RUPP Books Password",
      `You requested a password reset. Click here to reset your password: ${resetLink}\n\nThis link expires in 15 minutes. If you did not request this, ignore this email.`,
      htmlBody
    );

    res.json({ message: "If this email exists, a password reset link has been sent." });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= RESET PASSWORD =================
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const result = await pool.query(
      `SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Reset token is invalid or has expired" });
    }

    const userId = result.rows[0].id;
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2`,
      [hashedPassword, userId]
    );

    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  logout,
  forgotPassword,
  resetPassword
};