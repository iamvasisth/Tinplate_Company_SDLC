require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const contactRoutes = require("./routes/contactRoutes");
const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');
const tasksRoutes = require('./routes/tasks');                    // ← ADD
const authMiddleware = require('./middleware/authMiddleware');     // ← ADD
const itemRoutes = require("./routes/itemRoutes");   // near other route imports


// ✅ INIT APP
const app = express();

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

// ✅ ROUTES
app.use('/api', authRoutes);
app.use('/api', dataRoutes);
app.use('/api', contactRoutes);
app.use('/api/tasks', authMiddleware, tasksRoutes); 
app.use("/api", itemRoutes);                         // near other app.use("/api", ...) lines
         

// ✅ TEST
app.get('/', (req, res) => {
  res.send('Server running');
});

// ✅ START
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});