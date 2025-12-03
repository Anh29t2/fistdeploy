const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// Định nghĩa các đường dẫn (Lưu ý: Chỉ cần dấu / thôi, vì bên server.js ta sẽ gán /tasks vào đầu)
router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;