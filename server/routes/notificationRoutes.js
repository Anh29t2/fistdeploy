const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// 1. Lấy danh sách thông báo
router.get('/', authMiddleware, notificationController.getNotifications);

// 2. Đánh dấu tất cả là đã đọc (Khi bấm vào cái chuông)
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);

module.exports = router;