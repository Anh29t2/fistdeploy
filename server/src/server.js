const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const authRouters = require('../routes/authRoutes.js');
const taskRoutes = require('../routes/taskRoutes'); // 1. Import file routes
const projectRouters = require('../routes/projectRoutes.js')
const messageRoutes = require('../routes/messageRoutes.js');
const notificationRoutes = require('../routes/notificationRoutes.js');
const { createNotification } = require('../utils/notificationHelper.js');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

//cau hinh cors
app.use(cors());
app.use(express.json());

// Tao ket noi den database MySQL
const connection = require('../config/db.js');

app.use('/api/tasks', taskRoutes);
app.use('/api/auth',authRouters);
app.use('/api/projects',projectRouters);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors:{
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
    }
});
// Lưu biến 'io' vào app để dùng được ở trong Controller
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('⚡ User connected:', socket.id);

    // 1. User đăng nhập -> Join vào phòng riêng (để chat 1-1)
    socket.on('register_user', (userId) => {
        if (userId) {
            const roomName = String(userId); // Ép về chuỗi "1" thay vì số 1
            socket.join(roomName);
            console.log(`✅ User ${userId} đã join vào room: ${roomName}`);
        }
    });

    // 2. User mở dự án -> Join vào phòng dự án (để chat chung)
    socket.on('join_project', (projectId) => {
        if (projectId) socket.join(projectId);
    });

    // 3. Xử lý khi nhận tin nhắn
socket.on('send_message', async (data) => {
        try {
            // A. Lưu tin nhắn vào DB
            await connection.promise().query(
                'INSERT INTO messages (sender_id, receiver_id, project_id, content) VALUES (?, ?, ?, ?)',
                [data.senderId, data.receiverId || null, data.projectId || null, data.content]
            );

            // B. Gửi tin nhắn qua Socket (Chat Realtime)
            if (data.projectId) {
                io.to(data.projectId).emit('receive_message', data);
            } else if (data.receiverId) {
                io.to(data.receiverId).emit('receive_message', data);
                socket.emit('receive_message', data);

                // 3. [NEW] Tạo thông báo cho Chat Riêng
                // Khi có người nhắn tin riêng, tạo thêm 1 thông báo vào cái chuông
                // Để dù họ đang lướt ở trang khác cũng biết có tin nhắn
                await createNotification(
                    app, 
                    data.receiverId, 
                    `${data.senderName} đã nhắn tin cho bạn`, 
                    null // Chat thì có thể null link hoặc để link mở chat nếu muốn
                );
            }
        } catch (err) {
            console.error("Lỗi lưu tin nhắn:", err);
        }
    });
});

server.listen(port, () => {
    console.log(`Server Socket đang chạy tại port ${port}`);
});
