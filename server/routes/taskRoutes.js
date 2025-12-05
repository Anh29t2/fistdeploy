const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

// Định nghĩa các đường dẫn (Lưu ý: Chỉ cần dấu / thôi, vì bên server.js ta sẽ gán /tasks vào đầu)
router.get('/',authMiddleware, taskController.getTasks);
router.post('/',authMiddleware, taskController.createTask);
router.put('/:id',authMiddleware, taskController.updateTask);
router.delete('/:id',authMiddleware, taskController.deleteTask);

module.exports = router;