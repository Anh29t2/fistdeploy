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
    console.log(`📧 [FORGOT_PASSWORD] Nhận yêu cầu từ email: ${email}`);
    
    try {
        // 1. Kiểm tra email
        const [rows] = await connection.promise().query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            console.log(`❌ Email không tồn tại: ${email}`);
            return res.status(404).json({ message: 'Email này chưa đăng ký tài khoản!' });
        }
        console.log(`✅ Tìm thấy user: ${rows[0].name}`);

        // 2. Tạo mật khẩu mới
        const newPassword = Math.random().toString(36).slice(-8);
        console.log(`🔑 Tạo mật khẩu mới: ${newPassword}`);

        // 3. Mã hóa
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        console.log(`🔒 Đã hash mật khẩu`);

        // 4. Cập nhật DB
        await connection.promise().query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
        console.log(`💾 Cập nhật DB thành công`);

        // 5. Gửi email NGẦM (không chờ) - Improve performance
        console.log(`📤 Bắt đầu gửi email ngầm...`);
        sendResetEmail(email, newPassword).catch(err => {
            console.error("❌ Lỗi gửi email reset:", err);
        });

        // Response ngay cho client (không chờ email)
        console.log(`✅ Response cho client`);
        res.json({ 
            message: 'Mật khẩu mới đã được gửi vào email của bạn! Hãy check email để lấy mật khẩu tạm thời.'
        });

    } catch (error) {
        console.error("❌ Lỗi hệ thống:", error);
        res.status(500).json({ error: error.message });
    }
};

// === HÀM MỚI: ĐỔI MẬT KHẨU ===
exports.changePassword = async (req, res) => {
    const userId = req.user.id;  // Lấy từ token (middleware authMiddleware)
    const { oldPassword, newPassword, confirmPassword } = req.body;
    
    console.log(`🔐 [CHANGE_PASSWORD] User ${userId} yêu cầu đổi mật khẩu`);
    
    try {
        // 1. Validate input
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ các trường!' });
        }
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Mật khẩu mới và xác nhận không trùng khớp!' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự!' });
        }

        // 2. Lấy user từ DB
        const [rows] = await connection.promise().query('SELECT * FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User không tồn tại!' });
        }
        
        const user = rows[0];
        console.log(`✅ Tìm thấy user: ${user.email}`);

        // 3. So sánh mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            console.log(`❌ Mật khẩu cũ không đúng`);
            return res.status(400).json({ message: 'Mật khẩu cũ không đúng!' });
        }
        console.log(`✅ Mật khẩu cũ chính xác`);

        // 4. Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        console.log(`🔒 Đã hash mật khẩu mới`);

        // 5. Cập nhật DB
        await connection.promise().query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
        console.log(`💾 Cập nhật mật khẩu thành công`);

        res.json({ message: 'Đổi mật khẩu thành công!' });

    } catch (error) {
        console.error("❌ Lỗi hệ thống:", error);
        res.status(500).json({ error: error.message });
    }
};
