const connection = require('../config/db');

// Lấy danh sách thông báo của User
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // SỬA: Thay SELECT * bằng việc liệt kê cột và dùng DATE_FORMAT cho created_at
        // '%Y-%m-%d %H:%i:%s' sẽ trả về chuỗi dạng "2026-01-07 15:30:00"
        const sql = `
            SELECT 
                id, 
                user_id, 
                content, 
                link, 
                is_read, 
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
            FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 20
        `;
        
        const [rows] = await connection.promise().query(sql, [userId]);
        
        res.json(rows);
    } catch (error) {
        console.error("Lỗi lấy thông báo:", error);
        res.status(500).json({ error: error.message });
    }
};

// Đánh dấu tất cả thông báo là "Đã đọc"
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const sql = `UPDATE notifications SET is_read = 1 WHERE user_id = ?`;
        
        await connection.promise().query(sql, [userId]);
        
        res.json({ message: 'Đã đánh dấu đã đọc' });
    } catch (error) {
        console.error("Lỗi update thông báo:", error);
        res.status(500).json({ error: error.message });
    }
};