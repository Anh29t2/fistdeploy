const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

// Định nghĩa các đường dẫn cho tin nhắn
router.get('/project/:projectId', authMiddleware, messageController.getProjectMessages);
router.get('/private/:anotherUserId', authMiddleware, messageController.getPrivateMessages);

module.exports = router;