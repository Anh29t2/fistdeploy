const mysql = require('mysql2');
require('dotenv').config(); // Đọc file .env

// Tạo kết nối
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Mở kết nối
connection.connect(err => {
    if (err) console.error('❌ Lỗi kết nối DB: ' + err.stack);
    else console.log('✅ Đã kết nối Database thành công!');
});

// Xuất kết nối ra để file khác dùng
module.exports = connection;