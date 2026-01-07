const connection = require('../config/db');

const createNotification = async (app, receiverId, message, link = null) => {
    try {
        // 1. Chuẩn bị timestamp cho Socket (để frontend hiện ngay lập tức)
        const now = new Date();
        const socketTimestamp = now.toISOString();

        // 2. Lưu vào Database va chinh sua thanh NOW
        const [results] = await connection.promise().query(
            'INSERT INTO notifications (user_id, content, link, is_read, created_at) VALUES (?, ?, ?, 0, NOW())',
            [receiverId, message, link] 
        );

        // 3. Gửi Socket
        const newNotifi = {
            id: results.insertId,
            user_id: receiverId,
            content: message,
            link: link,
            is_read: 0,
            created_at: socketTimestamp 
        };

        const io = app.get('socketio'); 
        if (io) {
            io.to(String(receiverId)).emit('new_notification', newNotifi);
        }

    } catch (error) {
        console.error('Error creating notification:', error);
    }
};

module.exports = { createNotification };