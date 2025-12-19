const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const authRouters = require('../routes/authRoutes.js');
const taskRoutes = require('../routes/taskRoutes'); // 1. Import file routes
const projectRouters = require('../routes/projectRoutes.js')
const messageRoutes = require('../routes/messageRoutes.js');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

//cau hinh cors
app.use(cors());
app.use(express.json());

// Tao ket noi den database MySQL
const connection = require('../config/db.js');

app.use('/tasks', taskRoutes);
app.use('/auth',authRouters);
app.use('/projects',projectRouters);
app.use('/messages', messageRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors:{
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
    }
});
// Lưu biến 'io' vào app để dùng được ở trong Controller
app.set('socketio', io);

server.listen(port, () => {
    console.log(`Server Socket đang chạy tại port ${port}`);
});
