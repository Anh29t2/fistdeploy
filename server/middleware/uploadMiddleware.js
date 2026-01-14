const multer = require('multer');
const path = require('path');

// Cấu hình lưu trữ file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Thư mục lưu trữ
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Tên file: timestamp + đuôi gốc
    }
});
// Lọc file: chỉ cho phép hình ảnh
const fileFilter = (req, file, cb) => {
    if(file.mimetype.startsWith('image/')){
        cb(null, true);
    }else{
        cb(new Error('Chỉ cho phép tải lên file hình ảnh!'), false);
    }
};
const upload = multer({ storage: storage, fileFilter: fileFilter });

module.exports = upload;