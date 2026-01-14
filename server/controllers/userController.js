const connection = require('../config/db');
const bcrypt = require('bcryptjs');

// Cập nhật Avatar và tên người dùng
exports.updateProfile = async (req, res) => {

    console.log("--- BẮT ĐẦU CẬP NHẬT PROFILE ---");
    console.log("1. User ID:", req.user.id);
    console.log("2. Body nhận được:", req.body);
    console.log("3. File nhận được:", req.file); // Nếu cái này undefined là do Route thiếu upload
    
    const userId = req.user.id;
    const { name } = req.body;
    const avatarFile = req.file;

    try{
        let sql = 'UPDATE users SET name = ? WHERE id = ?';
        let params = [name, userId];

        if(avatarFile){
            const avatarPath = `/uploads/${avatarFile.filename}`;
            sql = 'UPDATE users SET name = ? , avatar = ? WHERE id = ?';
            params = [name, avatarPath, userId];
        }
        await connection.promise().query(sql, params);
        const [rows] = await connection.promise().query(
            'SELECT id, email, name, avatar FROM users WHERE id = ?', 
            [userId]
        );
        res.json({
            message: 'Cập nhật thông tin thành công!',
            user: rows[0]
        });

    }catch(error){
        console.log("Lỗi update profile",error);
        res.status(500).json({ error: 'Lỗi hệ thống khi cập nhật thông tin người dùng.' });
    }
};

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