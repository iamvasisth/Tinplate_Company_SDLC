const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');

// ✅ import correctly
const authController = require('../controllers/authController');

// ================= VALIDATIONS =================
const registerValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  // organization_name is optional — stored if present, ignored if not
  body('organization_name').optional().trim(),
  // business_type is optional — frontend may send 'business_type' (snake_case)
  body('business_type').optional().trim(),
];

const loginValidation = [
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
];

// ================= ROUTES =================
router.post('/register', registerValidation, authController.register);

// 🔥 FIXED LINE (IMPORTANT)
router.post('/login', loginValidation, authController.login);
router.post('/logout', authController.logout);

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;