const connection = require('../config/db');

// 1. SỬA TÊN HÀM: getDashBoard -> getDashboardStats
exports.getDashboardStats = async (req, res) => {
    const userId = req.user.id;
    try {
        // --- 1. Thống kê tổng quan (Giữ nguyên) ---
        const sqlTaskStats = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing
            FROM tasks 
            WHERE user_id = ? OR assignee_id = ?
        `;

        // --- 2. Thống kê theo tuần (Giữ nguyên) ---
        // Lưu ý: DB phải có cột 'updated_at' thì cái này mới chạy đúng
        const sqlWeeklyProgress = `
            SELECT DATE(updated_at) as date, COUNT(*) as count
            FROM tasks
            WHERE (user_id = ? OR assignee_id = ?) 
              AND status = 'completed' 
              AND updated_at >= DATE(NOW()) - INTERVAL 7 DAY
            GROUP BY DATE(updated_at)
            ORDER BY date ASC
        `;

        // --- 3. Thống kê Chi tiết theo Dự án (SỬA LẠI SQL MỚI) ---
        // Lý do: Frontend cần biết chi tiết (completed, pending...) để vẽ bảng
        const sqlProjectStats = `
            SELECT 
                p.id, 
                p.name,
                COUNT(t.id) as total_tasks,
                SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN t.status = 'processing' THEN 1 ELSE 0 END) as processing
            FROM projects p
            JOIN project_members pm ON p.id = pm.project_id  -- <--- JOIN ĐỂ TÌM DỰ ÁN CỦA USER
            LEFT JOIN tasks t ON p.id = t.project_id
            WHERE pm.user_id = ?                             -- <--- ĐIỀU KIỆN LỌC THEO THÀNH VIÊN
            GROUP BY p.id, p.name
            ORDER BY total_tasks DESC
        `;

        // --- 4. Thực thi truy vấn (Bỏ comment phần project) ---
        const [taskStats] = await connection.promise().query(sqlTaskStats, [userId, userId]);
        const [weeklyStats] = await connection.promise().query(sqlWeeklyProgress, [userId, userId]);
        const [projectStats] = await connection.promise().query(sqlProjectStats, [userId]);

        // --- 5. Trả về kết quả ---
        res.json({
            overview: taskStats[0], // Dữ liệu cho 4 thẻ bài trên cùng
            weekly: weeklyStats,    // Dữ liệu cho biểu đồ cột (nếu có)
            projects: projectStats  // Dữ liệu cho Bảng tiến độ dự án
        });
        
    } catch (err) {
        console.error("Lỗi thống kê:", err);
        res.status(500).json({ error: 'Lỗi khi lấy thống kê' });
    }
};