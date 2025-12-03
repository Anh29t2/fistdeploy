const connection = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. Xử lý Đăng Ký
exports.register = async (req, res) => {
    const { email, name, password } = req.body;
    try {
        // Kiểm tra email trùng
        const [rows] = await connection.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length > 0) return res.status(400).json({ message: 'Email này đã được sử dụng!' });

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Lưu vào DB
        await connection.promise().query(
            'INSERT INTO users (email, name, password) VALUES (?, ?, ?)', 
            [email, name, hashedPassword]
        );
        res.status(201).json({ message: 'Đăng ký thành công!' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server: ' + error.message });
    }
};

// 2. Xử lý Đăng Nhập
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Tìm user
        const [rows] = await connection.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(400).json({ message: 'Email không tồn tại!' });
        
        const user = rows[0];
        // So khớp mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu không đúng!' });

        // Trả về info
        res.json({ 
            message: 'Đăng nhập thành công!', 
            user: { id: user.id, email: user.email, name: user.name } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};