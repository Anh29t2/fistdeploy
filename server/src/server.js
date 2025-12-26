const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const authRouters = require('../routes/authRoutes.js');
const taskRoutes = require('../routes/taskRoutes'); 
const projectRouters = require('../routes/projectRoutes.js')
const messageRoutes = require('../routes/messageRoutes.js');
const notificationRoutes = require('../routes/notificationRoutes.js');
// Vẫn giữ import này để dùng cho Task, nhưng không dùng cho Message nữa
const { createNotification } = require('../utils/notificationHelper.js');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('⚡ User connected:', socket.id);

    socket.on('register_user', (userId) => {
        if (userId) {
            const roomName = String(userId); 
            socket.join(roomName);
            console.log(`✅ User ${userId} đã join vào room: ${roomName}`);
        }
    });

    socket.on('join_project', (projectId) => {
        if (projectId) socket.join(projectId);
    });

    // --- XỬ LÝ TIN NHẮN (ĐÃ SỬA) ---
    socket.on('send_message', async (data) => {
        try {
            // A. Vẫn lưu tin nhắn vào DB để lịch sử chat không bị mất
            await connection.promise().query(
                'INSERT INTO messages (sender_id, receiver_id, project_id, content) VALUES (?, ?, ?, ?)',
                [data.senderId, data.receiverId || null, data.projectId || null, data.content]
            );

            // B. Gửi tin nhắn qua Socket (Chat Realtime)
            if (data.projectId) {
                io.to(data.projectId).emit('receive_message', data);
            } else if (data.receiverId) {
                // Gửi cho người nhận
                io.to(String(data.receiverId)).emit('receive_message', data);
                // Gửi lại cho chính mình
                socket.emit('receive_message', data);
            }
        } catch (err) {
            console.error("Lỗi lưu tin nhắn:", err);
        }
    });
});

server.listen(port, () => {
    console.log(`Server Socket đang chạy tại port ${port}`);
});