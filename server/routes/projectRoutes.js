const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/authMiddleware'); // Bảo vệ API

// Bắt buộc phải đăng nhập mới được thao tác dự án
router.get('/', authMiddleware, projectController.getProjects);
router.post('/', authMiddleware, projectController.createProject);
router.delete('/:id', authMiddleware, projectController.deleteProject);

module.exports = router;