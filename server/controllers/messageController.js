const connection = require('../config/db');

// 1. Lấy tin nhắn của một dự án cụ thể
exports.getProjectMessages = async (req, res) => {
    const { projectId }  = req.params;
    try {
        // SỬA: Dùng DATE_FORMAT để lấy chuỗi giờ chuẩn y hệt trong DB
        const sql = `
            SELECT 
                m.id, m.sender_id, m.receiver_id, m.project_id, m.content,
                DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                u.name as sender_name, u.email as sender_email 
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.project_id = ?
            ORDER BY m.created_at ASC
        `;
        const [rows] = await connection.promise().query(sql, [projectId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message }); 
    }
};

// 2. Lấy tin nhắn với 1 người cụ thể (Chat riêng)
exports.getPrivateMessages = async (req, res) => {
    const { anotherUserId } = req.params;
    const myId = req.user.id; // Lấy từ token

    try {
        // SỬA: Dùng DATE_FORMAT tương tự
        const sql = `
            SELECT 
                m.id, m.sender_id, m.receiver_id, m.project_id, m.content,
                DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
                u.name as sender_name
            FROM messages m
            JOIN users u on m.sender_id = u.id
            WHERE (m.sender_id = ? AND m.receiver_id = ?)
               OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC
        `;
        const [rows] = await connection.promise().query(sql, [myId, anotherUserId, anotherUserId, myId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};