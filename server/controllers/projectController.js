const connection = require('../config/db');

// 1. Lấy danh sách dự án của User (Dashboard)
exports.getProjects = async (req, res) => {
    const { user_id } = req.query;
    try {
       const sql = `
            SELECT DISTINCT p.*,
            CASE 
                WHEN p.owner_id = ? THEN 'owner' 
                ELSE pm.role 
            END as my_role
            FROM projects p
            LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
            WHERE p.owner_id = ? OR pm.user_id = ?
            ORDER BY p.created_at DESC
        `;
        const [rows] = await connection.promise().query(sql, [user_id, user_id, user_id, user_id]);
        res.json(rows);
    } catch (error) {
        console.log("Loi getProjects:", error);
        res.status(500).json({ error: error.message });
    }
};

// [QUAN TRỌNG - MỚI THÊM] Lấy chi tiết 1 dự án (Để check Owner khi mở Modal)
exports.getProjectById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await connection.promise().query(
            'SELECT * FROM projects WHERE id = ?', 
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Dự án không tồn tại' });
        }
        
        res.json(rows[0]);
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

// 3. Xóa dự án (xóa toàn bộ tasks bên trong)
exports.deleteProject = async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body; // Lưu ý: user_id nên lấy từ req.user.id (token) để bảo mật hơn
    try {
        // Bước 1: Kiểm tra xem dự án này có phải của user_id này không
        const [projects] = await connection.promise().query(
            'SELECT id FROM projects WHERE id = ? AND owner_id = ?', 
            [id, user_id]
        );
        if (projects.length === 0) {
            return res.status(403).json({ message: 'Bạn không có quyền xóa dự án này hoặc dự án không tồn tại!' });
        }
        // Bước 2: Nếu đúng là Owner thì mới xóa
        await connection.promise().query('DELETE FROM projects WHERE id = ?', [id]);
        res.json({ message: 'Đã xóa dự án và toàn bộ công việc bên trong!' });
    } catch (error) {
        console.log("Lỗi khi xóa dự án",error);
        res.status(500).json({ error: error.message });
    }
};

// 4. Lấy thành viên dự án (Bao gồm cả Owner)
exports.getProjectMembers = async (req, res) => {
    // Lưu ý: Route bên routers phải dùng :projectId hoặc :id cho khớp
    const projectId = req.params.projectId || req.params.id; 

    try {
        const sql = `
            (SELECT u.id, u.name, u.email, 'owner' as role 
             FROM projects p 
             JOIN users u ON p.owner_id = u.id 
             WHERE p.id = ?)
            UNION
            (SELECT u.id, u.name, u.email, pm.role 
             FROM project_members pm 
             JOIN users u ON pm.user_id = u.id 
             WHERE pm.project_id = ?)
        `;
        
        const [rows] = await connection.promise().query(sql, [projectId, projectId]);
        
        res.json(rows);
    } catch (error) {
        console.error("Lỗi lấy thành viên:", error);
        res.status(500).json({ error: error.message });
    }
};

// 5. Thêm thành viên
exports.addProjectMember = async (req, res) => {
    const projectId = req.params.projectId || req.params.id;
    const { email } = req.body;
    try {
        const [users] = await connection.promise().query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Email này chưa đăng ký tài khoản!' });
        }
        const userToAdd = users[0];
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

// 6. Cập nhật quyền thành viên
exports.updateMemberRole = async (req, res) => {
    const projectId = req.params.projectId || req.params.id;
    const { memberId } = req.params; 
    const { newRole } = req.body; 
    const user_id = req.user.id; 

    try {
        // Check quyền Owner
        const [projects] = await connection.promise().query(
            'SELECT id FROM projects WHERE id = ? AND owner_id = ?',
            [projectId, user_id]
        );

        if (projects.length === 0) {
            return res.status(403).json({ message: 'Bạn không phải Owner, không có quyền đổi role!' });
        }

        if (parseInt(memberId) === user_id) {
             return res.status(400).json({ message: 'Owner không thể tự thay đổi quyền của mình!' });
        }
        
        const [result] = await connection.promise().query(
            'UPDATE project_members SET role = ? WHERE project_id = ? and user_id = ?',
            [newRole, projectId, memberId]
        );

        const io = req.app.get('socketio');
        if (io) {
            io.emit('server_update_member_role', { 
                projectId: projectId, 
                memberId: memberId, 
                newRole: newRole 
            });
        }

        res.json({ message: 'Cập nhật vai trò thành viên thành công!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 7. Xóa thành viên
exports.removeProjectMember = async (req, res) => {
    const projectId = req.params.projectId || req.params.id;
    const { userId } = req.params; 
    const requesterId = req.user.id;

    try {
        const [projects] = await connection.promise().query(
            'SELECT id FROM projects WHERE id = ? AND owner_id = ?',
            [projectId, requesterId]
        );

        if (projects.length === 0) {
            return res.status(403).json({ message: 'Bạn không phải Owner, không có quyền xóa thành viên!' });
        }

        const [result] = await connection.promise().query(
            'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
            [projectId, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Thành viên không tồn tại trong dự án!' });
        }

        const io = req.app.get('socketio');
        if (io) {
            io.emit('server_update_member_role', { 
                projectId: projectId, 
                forceReload: true 
            });
        }

        res.json({ message: 'Đã xóa thành viên khỏi dự án!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};