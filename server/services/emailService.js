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

module.exports = { sendWelcomeEmail };