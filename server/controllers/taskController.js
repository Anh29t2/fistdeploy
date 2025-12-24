const connection = require('../config/db');
const { CreateNotification } = require('../utils/notificationHelper');

// 1. Lấy danh sách task (Đã nâng cấp: Hỗ trợ lấy tất cả hoặc lấy theo dự án + JOIN với project name)
exports.getTasks = async (req, res) => {
    const { user_id, project_id } = req.query; 

    try {
        let sql = '';
        let params = [];

        if (project_id){
            // TH1: Lấy tất cả công việc trong dự án
            sql = `
                SELECT t.*, p.name as project_name 
                FROM tasks t
                JOIN projects p ON t.project_id = p.id
                WHERE t.project_id = ? 
                ORDER BY t.created_at DESC
            `;
            params = [project_id];
        } else if(user_id){
            // TH2: Lấy tất cả công việc của user (trang chủ  + cả công việc trong dự án mà user tham gia)
            sql = `
                SELECT DISTINCT t.*, p.name as project_name
                FROM tasks t
                LEFT JOIN project_members pm ON t.project_id = pm.project_id
                LEFT JOIN projects p ON t.project_id = p.id
                WHERE 
                    t.user_id = ?          
                    OR 
                    pm.user_id = ?         
                ORDER BY t.created_at DESC
            `;
            params = [user_id, user_id];
        } else {
            return res.json([]); 
        }

        const [rows] = await connection.promise().query(sql, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Thêm task mới (Chuẩn chỉnh)
exports.createTask = async (req, res) => {
    let { title, description, priority, deadline, user_id, assignee_id, project_id } = req.body;
    
    try {
        // 1. Xử lý deadline (Giữ nguyên logic của bạn)
        if (!deadline || deadline === '') {
            deadline = null;
        } else {
            if (typeof deadline === 'string') {
                deadline = deadline.split('T')[0];
            }
        }

        // 2. INSERT VÀO DATABASE (Đã sửa lại thứ tự tham số cho đúng với SQL)
        const sqlInsert = `
            INSERT INTO tasks (title, description, priority, deadline, user_id, assignee_id, project_id, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `;

        // Lưu ý: Thứ tự biến trong mảng này phải KHỚP 100% với danh sách cột ở trên
        await connection.promise().query(sqlInsert, [
            title,
            description || '',
            priority || 'medium',
            deadline,
            user_id,
            assignee_id || null, // Nếu không chọn người giao việc thì lưu null
            project_id || null
        ]);
        
        // 3. LOGIC GỬI THÔNG BÁO (THÊM MỚI)
        if (project_id) {
            // A. Lấy danh sách thành viên dự án
            const [members] = await connection.promise().query(
                `SELECT user_id FROM project_members WHERE project_id = ?`, 
                [project_id]
            );

            const targetLink = `/projects/${project_id}`; 
            
            // B. Duyệt và gửi thông báo
            const notificationPromises = members.map(member => {
                const memberIdStr = String(member.user_id);
                const creatorIdStr = String(user_id);
                const assigneeIdStr = assignee_id ? String(assignee_id) : null;

                // - Không báo cho chính người tạo task
                if (memberIdStr === creatorIdStr) return null;

                // - Báo riêng cho người được giao việc (Assignee)
                if (memberIdStr === assigneeIdStr) {
                    return createNotification(
                        req.app, 
                        member.user_id, 
                        `Bạn vừa được giao công việc mới: "${title}"`, 
                        targetLink
                    );
                }

                // - Báo chung cho thành viên khác
                return createNotification(
                    req.app, 
                    member.user_id, 
                    `Dự án có công việc mới: "${title}"`, 
                    targetLink
                );
            });

            await Promise.all(notificationPromises);
        }

        // 4. Bắn Socket cập nhật Kanban Board (Real-time)
        const io = req.app.get('socketio');
        if (io) io.emit('server_update_data'); 
        
        res.status(201).json({ message: 'Thêm công việc thành công!' });

    } catch (error) {
        console.error("Lỗi tạo task:", error); // Log lỗi ra console để dễ debug
        res.status(500).json({ error: error.message });
    }
};
// 3. Cập nhật task (Chuẩn chỉnh)
exports.updateTask = async (req, res) => {
    const { id } = req.params;
    let { title, status, description, priority, deadline } = req.body;
    
    try {
        // Xử lý deadline: nếu trống hoặc null thì lưu null, nếu không thì chuẩn hóa ngày
        if (!deadline || deadline === '') {
            deadline = null;
        } else {
            // Đảm bảo deadline ở format YYYY-MM-DD
            if (typeof deadline === 'string') {
                deadline = deadline.split('T')[0]; // Loại bỏ phần time nếu có
            }
        }

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