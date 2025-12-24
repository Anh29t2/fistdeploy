const connection = require('../config/db');
// Đừng quên dòng này để hàm createNotification hoạt động
const { createNotification } = require('../utils/notificationHelper'); 

// 1. Lấy danh sách task (ĐÃ SỬA: JOIN thêm bảng users để lấy tên người được giao)
exports.getTasks = async (req, res) => {
    const { user_id, project_id } = req.query; 

    try {
        let sql = '';
        let params = [];

        // Câu lệnh SELECT chuẩn: Lấy thêm assignee_name và assignee_email
        const selectFields = `
            SELECT t.*, 
                   p.name as project_name, 
                   u.name as assignee_name, 
                   u.email as assignee_email
        `;

        if (project_id){
            // TH1: Lấy theo dự án
            sql = `
                ${selectFields}
                FROM tasks t
                JOIN projects p ON t.project_id = p.id
                LEFT JOIN users u ON t.assignee_id = u.id  -- JOIN để lấy tên người được giao
                WHERE t.project_id = ? 
                ORDER BY t.created_at DESC
            `;
            params = [project_id];
        } else if(user_id){
            // TH2: Lấy theo User
            sql = `
                ${selectFields}
                FROM tasks t
                LEFT JOIN project_members pm ON t.project_id = pm.project_id
                LEFT JOIN projects p ON t.project_id = p.id
                LEFT JOIN users u ON t.assignee_id = u.id -- JOIN để lấy tên người được giao
                WHERE 
                    t.user_id = ?          
                    OR 
                    pm.user_id = ?         
                ORDER BY t.created_at DESC
            `;
            params = [user_id, user_id]; // Lưu ý: Params phải khớp số lượng dấu ?
        } else {
            return res.json([]); 
        }

        // Dùng distinct ở code xử lý mảng để tránh lặp nếu dùng LEFT JOIN phức tạp
        const [rows] = await connection.promise().query(sql, params);
        
        // (Optional) Lọc trùng lặp bằng JS nếu SQL trả về trùng dòng do JOIN
        const uniqueRows = Array.from(new Set(rows.map(a => a.id)))
            .map(id => rows.find(a => a.id === id));

        res.json(uniqueRows);
    } catch (error) {
        console.error("Lỗi getTasks:", error);
        res.status(500).json({ error: error.message });
    }
};

// 2. Thêm task mới (Giữ nguyên code chuẩn bạn đã có)
exports.createTask = async (req, res) => {
    let { title, description, priority, deadline, user_id, assignee_id, project_id } = req.body;
    
    try {
        if (!deadline || deadline === '') {
            deadline = null;
        } else {
            if (typeof deadline === 'string') deadline = deadline.split('T')[0];
        }

        const sqlInsert = `
            INSERT INTO tasks (title, description, priority, deadline, user_id, assignee_id, project_id, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `;

        await connection.promise().query(sqlInsert, [
            title, description || '', priority || 'medium', deadline,
            user_id, assignee_id || null, project_id || null
        ]);
        
        // --- LOGIC THÔNG BÁO ---
        if (project_id) {
            const [members] = await connection.promise().query(
                `SELECT user_id FROM project_members WHERE project_id = ?`, [project_id]
            );
            const targetLink = `/projects/${project_id}`; 
            
            const notificationPromises = members.map(member => {
                const memberIdStr = String(member.user_id);
                const creatorIdStr = String(user_id);
                const assigneeIdStr = assignee_id ? String(assignee_id) : null;

                if (memberIdStr === creatorIdStr) return null;

                if (memberIdStr === assigneeIdStr) {
                    return createNotification(req.app, member.user_id, ` Bạn vừa được giao công việc mới: "${title}"`, targetLink);
                }
                return createNotification(req.app, member.user_id, ` Dự án có công việc mới: "${title}"`, targetLink);
            });
            await Promise.all(notificationPromises);
        }

        const io = req.app.get('socketio');
        if (io) io.emit('server_update_data'); 
        
        res.status(201).json({ message: 'Thêm công việc thành công!' });

    } catch (error) {
        console.error("Lỗi tạo task:", error);
        res.status(500).json({ error: error.message });
    }
};

// 3. Cập nhật task (ĐÃ SỬA: Thêm assignee_id vào UPDATE)
exports.updateTask = async (req, res) => {
    const { id } = req.params;
    // Lấy thêm assignee_id từ body
    let { title, status, description, priority, deadline, assignee_id } = req.body; 
    
    try {
        if (!deadline || deadline === '') {
            deadline = null;
        } else {
            if (typeof deadline === 'string') deadline = deadline.split('T')[0];
        }

        // --- CẬP NHẬT SQL: Thêm cột assignee_id = ? ---
        const sql = `
            UPDATE tasks SET 
                title = ?, 
                status = ?, 
                description = ?, 
                priority = ?, 
                deadline = ?,
                assignee_id = ? 
            WHERE id = ?
        `;

        await connection.promise().query(sql, [
            title, 
            status, 
            description, 
            priority, 
            deadline, 
            assignee_id || null, // Nếu frontend gửi null hoặc rỗng thì lưu null
            id
        ]);
        
        // (Optional: Nếu muốn thông báo khi Đổi người làm, có thể viết thêm logic ở đây)
        // Ví dụ: Nếu assignee_id mới khác assignee_id cũ thì báo cho người mới.

        const io = req.app.get('socketio');
        if (io) io.emit('server_update_data');

        res.json({ message: 'Cập nhật thành công!' });
    } catch (error) {
        console.error("Lỗi update task:", error);
        res.status(500).json({ error: error.message });
    }
};


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