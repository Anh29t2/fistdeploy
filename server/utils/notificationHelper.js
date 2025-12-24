const connection = require('../config/db');

const CreateNotification = async (app, receiverId, message, link = null) => {
    try {
        const [results] = await connection.promise().query(
        'INSERT INTO notifications (user_id,content,link) VALUES (?, ?, ?)',
        [receiverId, message, link]
        );

        // Chuẩn bị dữ liệu thông báo để gửi qua Socket.io
        const newNotifi = {
            id: results.insertId,
            user_id: receiverId,
            content: message,
            link: link,
            is_read: 0,
            create_at: new Date().toISOString()
        };
        // Gửi thông báo qua Socket.io
        const io = app.get('io');
        if(io){
            io.to(`user_${receiverId}`).emit('new_notification', newNotifi);
            console.log(`Đã báo cho user ${receiverId}: ${message}`);
        }

    }catch(error){
        console.error('Error creating notification:', error);
    }
};
module.exports = { CreateNotification };
