const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    // Lấy token từ header: "Bearer chuoi_token_dai_ngoang..."
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy phần token sau chữ Bearer

    if (!token) return res.status(401).json({ message: 'Chưa đăng nhập (Thiếu Token)!' });

    try {
        // Kiểm tra token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Lưu thông tin người dùng vào biến req
        next(); // Cho phép đi tiếp
    } catch (error) {
        return res.status(403).json({ message: 'Token hết hạn hoặc không hợp lệ!' });
    }
};

module.exports = authMiddleware;