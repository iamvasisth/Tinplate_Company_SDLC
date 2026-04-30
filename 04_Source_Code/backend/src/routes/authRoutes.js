const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');

// ✅ import correctly
const authController = require('../controllers/authController');

// ================= VALIDATIONS =================
const registerValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

// ================= ROUTES =================
router.post('/register', registerValidation, authController.register);

// 🔥 FIXED LINE (IMPORTANT)
router.post('/login', loginValidation, authController.login);

router.post('/logout', authController.logout);

router.get('/profile', authMiddleware, authController.getProfile);


module.exports = router;