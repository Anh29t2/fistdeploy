const connection = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail, sendResetEmail } = require('../services/emailService');
// 1. Xử lý Đăng Ký
exports.register = async (req, res) => {
    const { email, name, password } = req.body;

    try {
        // 1. Kiểm tra trùng email (Giữ nguyên)
        const [rows] = await connection.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length > 0) return res.status(400).json({ message: 'Email này đã được sử dụng!' });

        // 2. Mã hóa mật khẩu (Giữ nguyên)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. LƯU VÀO DATABASE NGAY LẬP TỨC (Không chờ gửi mail nữa)
        await connection.promise().query(
            'INSERT INTO users (email, name, password) VALUES (?, ?, ?)', 
            [email, name, hashedPassword]
        );

        // 4. Gửi mail chạy ngầm (Bỏ await)
        // Chúng ta không cần quan tâm nó thành công hay thất bại ở đây để tránh user phải chờ
        sendWelcomeEmail(email, name).catch(err => console.error("Lỗi gửi mail ngầm:", err));

        // 5. Phản hồi ngay cho người dùng
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

        // tạo token
        const token = jwt.sign(
            {
                id: user.id, email: user.email},
                process.env.JWT_SECRET,
                {expiresIn: '1h'} // ve het han sau 1h
        );    
            res.json({
                message: 'Đăng nhập thành công !',
                token: token, // Tra ve cho client
                user: {id: user.id,email: user.email, name: user.name}
            });
        }catch(error){
            res.status(500).json({ error: error.message});
        }
    };

// === HÀM MỚI: QUÊN MẬT KHẨU ===
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        // 1. Kiểm tra email có tồn tại không
        const [rows] = await connection.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(404).json({ message: 'Email này chưa đăng ký tài khoản!' });

        // 2. Tạo mật khẩu ngẫu nhiên (8 ký tự)
        const newPassword = Math.random().toString(36).slice(-8);

        // 3. Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 4. Cập nhật vào Database
        await connection.promise().query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);

        // 5. Gửi email (Chạy ngầm)
        sendResetEmail(email, newPassword).catch(console.error);

        res.json({ message: 'Mật khẩu mới đã được gửi vào email của bạn!' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
