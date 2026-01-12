const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware'); 
const upload = require('../middleware/uploadMiddleware'); // File này bạn đã có rồi

// upload.single('avatar') -> Cho phép nhận 1 file từ form có tên là 'avatar'
router.put('/profile', authMiddleware, upload.single('avatar'), userController.updateProfile);

module.exports = router;