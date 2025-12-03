const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Định nghĩa đường dẫn
// POST /auth/register
router.post('/register', authController.register);

// POST /auth/login
router.post('/login', authController.login);

module.exports = router;