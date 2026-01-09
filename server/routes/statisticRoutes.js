const express = require('express');
const router = express.Router();

// 1. Sửa đường dẫn import (lùi lại 1 cấp ..)
const statisticController = require('../controllers/statisticController');
const authMiddleware = require('../middleware/authMiddleware'); // Import middleware xác thực

// 2. Định nghĩa route
router.get('/', authMiddleware, statisticController.getDashboardStats);

module.exports = router;