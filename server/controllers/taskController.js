const connection = require('../config/db'); // Gọi kết nối DB

// 1. Lấy danh sách task
exports.getTasks = async (req, res) => {
    const { user_id } = req.query; 
    try {
        const [rows] = await connection.promise().query(
            'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', 
            [user_id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Thêm task mới
exports.createTask = async (req, res) => {
    const { user_id, title } = req.body;
    try {
        await connection.promise().query(
            'INSERT INTO tasks (user_id, title) VALUES (?, ?)',
            [user_id, title]
        );
        res.status(201).json({ message: 'Thêm công việc thành công!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Cập nhật task
exports.updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, status } = req.body;
    try {
        await connection.promise().query(
            'UPDATE tasks SET title = ?, status = ? WHERE id = ?',
            [title, status, id]
        );
        res.json({ message: 'Cập nhật thành công!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Xóa task
exports.deleteTask = async (req, res) => {
    const { id } = req.params;
    try {
        await connection.promise().query('DELETE FROM tasks WHERE id = ?', [id]);
        res.json({ message: 'Xóa thành công!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};