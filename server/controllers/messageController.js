const db = require('../config/db');

// Lấy tin nhắn của một dự án cụ thể
exports.getProjectMessages = async (req, res) => {
    const { projectId }  = req.params;
    try {
        const sql = `
            SELECT m.*, u.name as sender_name, u.email as sender_email 
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.project_id = ?
            ORDER BY m.created_at ASC
        `;
        const [rows] = await connection.promise().query(sql, [projectId]);
        res.json(rows);
    }catch (error) {
        res.status(500).json({ error: error.message }); 
    }
};

// lấy tin nhắn với 1 người cụ thể
exports.getPrivateMessages = async(res,req) => {
    const { anotherUserId } = req.params;
    const myId = req.user.id; // Lay tu token
    try {
        const sql = `
            SELECT m.*,u.name as sender_name
            FROM messages m
            JOIN users u on m.sender_id = u.id
            WHERE (m.sender_id = ? AND m.receiver_id = ?)
               OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC
        `;
        const [rows] = await connection.promise().query(sql, [myId, anotherUserId, anotherUserId, myId]);
        res.json(rows);
    }catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Gửi tin nhắn trong dự án
// exports.sendProjectMessage = async (req, res) => {
//     const { projectId } = req.params;


// }