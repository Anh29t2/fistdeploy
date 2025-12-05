const mysql = require('mysql2');
require('dotenv').config(); 

// Dùng createPool thay vì createConnection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    
    // Cấu hình SSL (giữ nguyên như của bạn để kết nối cloud)
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

// Kiểm tra kết nối thử (Optional - chỉ để debug lúc khởi động)
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Lỗi kết nối Pool: ' + err.stack);
    } else {
        console.log('✅ Database Pool đã sẵn sàng!');
        connection.release(); // Trả kết nối về hồ ngay
    }
});

// Xuất pool ra (Code bên controller dùng y hệt connection cũ, không cần sửa gì thêm)
module.exports = pool;