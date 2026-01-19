const connection = require('../config/db');
const { createNotification } = require('../utils/notificationHelper');

// 1. Lấy danh sách comment
exports.getCommentsByTask = async (req, res) => {
    const { taskId } = req.params;
    try {
        const sql = `
        SELECT c.*, u.name as user_name, u.avatar as user_avatar 
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.task_id = ?
            ORDER BY c.created_at ASC
        `;
        const [rows] = await connection.promise().query(sql, [taskId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi lấy bình luận' });
    }
};

// 2. Thêm comment (ĐÃ SỬA GỌI HÀM NOTIFICATION)
exports.addComment = async (req, res) => {
    const { task_id, content } = req.body;
    const sender_id = req.user.id;

    if (!content || !content.trim()) return res.status(400).json({ message: 'Nội dung trống' });

    try {
        // A. Lưu comment vào DB
        const sql = 'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)';
        const [result] = await connection.promise().query(sql, [task_id, sender_id, content]);

        // B. Lấy lại comment vừa tạo đầy đủ
        const [newCommentRows] = await connection.promise().query(`
            SELECT c.*, u.name as user_name, u.avatar as user_avatar 
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [result.insertId]);
        const newComment = newCommentRows[0];

        // C. XỬ LÝ REAL-TIME VÀ THÔNG BÁO
        const [taskRows] = await connection.promise().query(
            'SELECT title, assignee_id, project_id FROM tasks WHERE id = ?', 
            [task_id]
        );
        
        if (taskRows.length > 0) {
            const task = taskRows[0];
            const io = req.app.get('socketio');

            // 1. Logic Thông báo (Notification)
            if (task.assignee_id && String(task.assignee_id) !== String(sender_id)) {
                // [ĐÃ SỬA]: Truyền req.app vào đầu tiên, bỏ tham số 'info' thừa
                await createNotification(
                    req.app,  // <--- QUAN TRỌNG: Phải có cái này
                    task.assignee_id, 
                    `Có bình luận mới: ${task.title}`,
                    `/projects` // Link
                );
                // (Helper đã tự bắn socket thông báo nên không cần io.to(...).emit('new_notification') ở đây nữa)
            }

            // 2. [REAL-TIME CHAT]: Bắn comment mới vào phòng của Project (Vẫn giữ nguyên)
            if (io) {
                io.to(String(task.project_id)).emit('receive_comment', newComment);
                console.log(`📡 Đã bắn comment tới project room: ${task.project_id}`);
            }
        }
        
        res.status(201).json(newComment);

    } catch (error) {
        console.error("Lỗi thêm comment:", error);
        res.status(500).json({ error: 'Lỗi server' });
    }
};

// 3. Xóa comment
exports.deleteComment = async (req, res) => {
    const { commentId } = req.params;
    try {
        await connection.promise().query('DELETE FROM comments WHERE id = ?', [commentId]);
        res.json({ message: 'Đã xóa bình luận thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi xóa bình luận' });
    }
};