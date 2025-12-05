// File: server/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const sendWelcomeEmail = async (userEmail, userName) => {
    // 1. Cấu hình người gửi (Lấy từ .env)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // 2. Nội dung email
    const mailOptions = {
        from: '"My App" <no-reply@todoapp.com>',
        to: userEmail,
        subject: '🎉 Chào mừng bạn gia nhập My App!',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4CAF50;">Xin chào ${userName}!</h2>
                <p>Cảm ơn bạn đã đăng ký tài khoản.</p>
                <p>Tài khoản của bạn là: <b>${userEmail}</b></p>
                <br/>
                <p>Chúc bạn một ngày làm việc hiệu quả!</p>
                <hr style="border: none; border-top: 1px solid #eee" />
                <small style="color: #888">Đây là email tự động.</small>
            </div>
        `
    };

    // 3. Gửi đi
    await transporter.sendMail(mailOptions);
};

// Hàm 2: Gửi mật khẩu mới (Khi quên mật khẩu) - MỚI THÊM
const sendResetEmail = async (userEmail, newPassword) => {
    const mailOptions = {
        from: '"My App" <no-reply@todoapp.com>',
        to: userEmail,
        subject: '🔐 Cấp lại mật khẩu mới',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #FF5722;">Quên mật khẩu?</h2>
                <p>Chúng tôi đã nhận được yêu cầu cấp lại mật khẩu của bạn.</p>
                <p>Mật khẩu mới của bạn là: abcd123 <b style="font-size: 24px; color: #333; letter-spacing: 2px;">${newPassword}</b></p>
                <br/>
                <p>Vui lòng đăng nhập và đổi lại mật khẩu ngay nhé!</p>
                <hr style="border: none; border-top: 1px solid #eee" />
                <small style="color: #888">Đây là email tự động.</small>
            </div>
        `
    };
    await transporter.sendMail(mailOptions);
};

// Xuất cả 2 hàm ra để Controller dùng
module.exports = { sendWelcomeEmail, sendResetEmail };