const mysql = require('mysql2');
require('dotenv').config(); // Đọc file .env

// Tạo kết nối
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306, // Thêm cổng
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    // --- Cấu hình quan trọng để sửa lỗi "Closed State" ---
    waitForConnections: true,
    connectionLimit: 10,  // Cho phép tối đa 10 kết nối cùng lúc
    queueLimit: 0,
    enableKeepAlive: true, // Giữ kết nối sống
    keepAliveInitialDelay: 0
});

// Mở kết nối
connection.connect(err => {
    if (err) console.error('❌ Lỗi kết nối DB: ' + err.stack);
    else console.log('✅ Đã kết nối Database thành công!');
});

// Xuất kết nối ra để file khác dùng
module.exports = connection;