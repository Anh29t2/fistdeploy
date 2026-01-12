const connection = require('../config/db');

// Cập nhật Avatar và tên người dùng
exports.updateProfile = async (req, res) => {
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