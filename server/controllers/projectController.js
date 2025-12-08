const connection = require('../config/db');

// 1. Lấy danh sách dự án của User
exports.getProjects = async (req, res) => {
    const { user_id } = req.query;
    try {
        const [rows] = await connection.promise().query(
            'SELECT * FROM projects WHERE owner_id = ? ORDER BY created_at DESC',
            [user_id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Tạo dự án mới
exports.createProject = async (req, res) => {
    const { user_id, name, description, deadline } = req.body;
    try {
        await connection.promise().query(
            'INSERT INTO projects (name, description, deadline, owner_id) VALUES (?, ?, ?, ?)',
            [name, description || '', deadline || null, user_id]
        );
        res.status(201).json({ message: 'Tạo dự án thành công!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Xóa dự án (Cẩn thận: Xóa dự án là xóa hết Task bên trong nhờ ON DELETE CASCADE)
exports.deleteProject = async (req, res) => {
    const { id } = req.params;
    try {
        await connection.promise().query('DELETE FROM projects WHERE id = ?', [id]);
        res.json({ message: 'Đã xóa dự án và toàn bộ công việc bên trong!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};