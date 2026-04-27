require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// ✅ INIT APP FIRST
const app = express();

// ✅ ROUTES IMPORT
const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');

// ✅ MIDDLEWARE
app.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// ✅ RATE LIMIT
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many login attempts. Try again later." },
});

app.use('/api/login', loginLimiter);

// ✅ ROUTES (AFTER APP INIT)
app.use('/api', authRoutes);
app.use('/api', dataRoutes);

// ✅ TEST ROUTE
app.get('/', (req, res) => {
  res.send('Server running');
});

// ✅ START SERVER
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});