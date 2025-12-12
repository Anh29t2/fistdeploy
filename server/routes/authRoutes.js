const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Định nghĩa đường dẫn
// POST /auth/register
router.post('/register', authController.register);

// POST /auth/login
router.post('/login', authController.login);

router.post('/forgot-password', authController.forgotPassword);

// POST /auth/change-password (Cần token)
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;