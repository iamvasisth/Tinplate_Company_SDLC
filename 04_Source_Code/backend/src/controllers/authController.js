require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

// ================= REGISTER =================
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
    });
  }

  const { email, password, business_type } = req.body; // ✅ now accepts business_type

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password, business_type)
       VALUES ($1, $2, $3)
       RETURNING id, email, business_type`,
      [email, hashedPassword, business_type || "Other"], // ✅ default 'Other' if not provided
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

  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, business_type: user.business_type },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        business_type: user.business_type || "Other",
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
      "SELECT id, email, business_type FROM users WHERE id = $1", // ✅ added business_type
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

module.exports = {
  register,
  login,
  getProfile,
  logout,
};
