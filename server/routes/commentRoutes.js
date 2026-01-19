const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:taskId', authMiddleware, commentController.getCommentsByTask);

router.post('/', authMiddleware, commentController.addComment);
router.delete('/:commentId', authMiddleware, commentController.deleteComment);

module.exports = router;