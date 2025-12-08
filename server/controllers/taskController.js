const connection = require('../config/db');

// 1. Lấy danh sách task (Đã nâng cấp: Hỗ trợ lấy tất cả hoặc lấy theo dự án + JOIN với project name)
exports.getTasks = async (req, res) => {
    const { user_id, project_id } = req.query; 

    try {
        let sql = `SELECT 
                    t.*, 
                    p.name as project_name
                   FROM tasks t
                   LEFT JOIN projects p ON t.project_id = p.id
                   WHERE t.user_id = ?`;
        let params = [user_id];

        // Nếu có project_id gửi lên thì thêm điều kiện lọc
        if (project_id) {
            sql += ' AND t.project_id = ?';
            params.push(project_id);
        }

        sql += ' ORDER BY t.created_at DESC';

        const [rows] = await connection.promise().query(sql, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Thêm task mới (Chuẩn chỉnh)
exports.createTask = async (req, res) => {
    const { user_id, project_id, title, description, priority, deadline } = req.body;
    
    try {
        await connection.promise().query(
            'INSERT INTO tasks (user_id, project_id, title, description, priority, deadline) VALUES (?, ?, ?, ?, ?, ?)',
            [
                user_id,
                project_id || null, // Nếu không có dự án thì để null
                title,
                description || '',
                priority || 'medium',
                deadline || null
            ]
        );
        
        // Bắn Socket để cập nhật Real-time
        const io = req.app.get('socketio');
        if (io) io.emit('server_update_data'); // Thêm if để tránh lỗi nếu socket chưa init
        
        res.status(201).json({ message: 'Thêm công việc thành công!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Cập nhật task (Chuẩn chỉnh)
exports.updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, status, description, priority, deadline } = req.body;
    
    try {
        await connection.promise().query(
            `UPDATE tasks SET 
                title = ?, 
                status = ?, 
                description = ?, 
                priority = ?, 
                deadline = ? 
            WHERE id = ?`,
            [title, status, description, priority, deadline, id]
        );
        
        const io = req.app.get('socketio');
        if (io) io.emit('server_update_data');

        res.json({ message: 'Cập nhật thành công!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Xóa task (Chuẩn chỉnh)
exports.deleteTask = async (req, res) => {
    const { id } = req.params;
    try {
        await connection.promise().query('DELETE FROM tasks WHERE id = ?', [id]);
        
        const io = req.app.get('socketio');
        if (io) io.emit('server_update_data');

        res.json({ message: 'Xóa thành công!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};