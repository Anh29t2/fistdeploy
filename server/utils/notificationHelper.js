const connection = require('../config/db');

// Đổi tên hàm thành chữ thường 'c' để khớp với taskController
const createNotification = async (app, receiverId, message, link = null) => {
    try {
        // 1. Lưu vào Database
        // Thêm cột is_read = 0 và created_at = NOW()
        const [results] = await connection.promise().query(
            'INSERT INTO notifications (user_id, content, link, is_read, created_at) VALUES (?, ?, ?, 0, NOW())',
            [receiverId, message, link]
        );

        // 2. Chuẩn bị dữ liệu gửi Socket
        const newNotifi = {
            id: results.insertId,
            user_id: receiverId,
            content: message,
            link: link,
            is_read: 0,
            created_at: new Date().toISOString() // Đổi thành created_at cho khớp Frontend
        };

        // 3. Gửi thông báo qua Socket.io
        // LƯU Ý: Phải dùng 'socketio' vì bên server.js ta set là 'socketio'
        const io = app.get('socketio'); 
        
        if (io) {
            // LƯU Ý: Gửi thẳng vào ID (vì bên server.js ta socket.join(userId))
            // Ép kiểu String cho chắc chắn
            io.to(String(receiverId)).emit('new_notification', newNotifi);
            console.log(`🔔 Đã báo cho user ${receiverId}: ${message}`);
        }

    } catch (error) {
        console.error('Error creating notification:', error);
        // Không throw error để tránh làm crash luồng chính (tạo task) nếu chỉ lỗi thông báo
    }
};

// Export đúng tên createNotification
module.exports = { createNotification };