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

exports.getProjectMembers = async (req, res) => {
    const { projectId } = req.params;
    try {
        const sql = `
            SELECT u.id, u.name, u.email, pm.role 
            FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
        `;
        const [rows] = await connection.promise().query(sql, [projectId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addProjectMember = async (req, res) => {
    const { projectId } = req.params;
    const { email } = req.body;
    try {
        // B1: Tìm xem email này có tồn tại trong hệ thống không
        const [users] = await connection.promise().query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Email này chưa đăng ký tài khoản hệ thống!' });
        }
        const userToAdd = users[0];
        // B2: Thêm vào dự án
        await connection.promise().query(
            'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
            [projectId, userToAdd.id, 'member']
        );
        res.status(201).json({ message: 'Đã thêm thành viên thành công!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Thành viên này đã ở trong dự án rồi!' });
        }
        res.status(500).json({ error: error.message });
    }
};
exports.removeProjectMember = async (req, res) => {
    const { projectId, userId } = req.params;
    try {
        const result = await connection.promise().query(
            'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
            [projectId, userId]
        )
        res.json({ message: 'Đã xóa thành viên khỏi dự án!' });
    }catch (error) {
        res.status(500).json({ error: error.message });
    }
};