const express = require('express')
const cors = require('cors')

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

//cau hinh cors
app.use(cors());
app.use(express.json());

// Tao ket noi den database MySQL
const connection = require('../config/db.js');

const authRouters = require('../routes/authRoutes.js');
const taskRoutes = require('../routes/taskRoutes'); // 1. Import file routes
app.use('/tasks', taskRoutes);
app.use('/auth',authRouters);

// Dang ky (API)
// app.post('/register', async (req, res) => {
//     const{ email,name,password} = req.body;
//     try{
//         const [rows] = await connection.promise().query('SELECT * FROM users WHERE email = ?', [email]);
//         if(rows.length > 0){
//             return res.status(400).json({ message: 'Email da duoc su dung' });
//         }
//         // ma hoa mat khau
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);
//         // luu nguoi dung vao database
//         await connection.promise().query(
//             'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
//             [email, name, hashedPassword]
//         );
//         res.status(201).json({ message: 'Dang ky thanh cong' });
//     } catch (err){
//         console.error(err);
//         res.status(500).json({ message: 'Loi server' + err.message });
//     }
// });
// // Dang nhap (API)
// app.post('/login', async (req, res) => {
//     const { email, password } = req.body;
//     try {
//         const [rows] = await connection.promise().query('SELECT * FROM users WHERE email = ?', [email]);
//         if (rows.length === 0) {
//             return res.status(400).json({ message: 'Email hoac mat khau khong dung' });
//         }
//         const user = rows[0];
//         // kiem tra mat khau
//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) {
//             return res.status(400).json({ message: 'Email hoac mat khau khong dung' });
//         }
//         res.json({
//             message: 'Dang nhap thanh cong',
//             user: {
//                 id: user.id,
//                 email: user.email,
//                 name: user.name
//             }
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Loi server' + err.message });
//     }
// });
// // === API 1: LẤY DANH SÁCH CÔNG VIỆC CỦA USER ===
// app.get('/tasks', async (req, res) => {
//     // Client sẽ gửi lên: https://fistdeploy.onrender.com/tasks?user_id=1
//     const { user_id } = req.query; 

//     try {
//         const [rows] = await connection.promise().query(
//             'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', 
//             [user_id]
//         );
//         res.json(rows);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // === API 2: THÊM CÔNG VIỆC MỚI ===
// app.post('/tasks', async (req, res) => {
//     const { user_id, title } = req.body;

//     try {
//         await connection.promise().query(
//             'INSERT INTO tasks (user_id, title) VALUES (?, ?)',
//             [user_id, title]
//         );
//         res.status(201).json({ message: 'Thêm công việc thành công!' });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// app.put('/tasks/:id',async(req,res) =>{
//     const{ id } = req.params;
//     const{ title, status } = req.body;

//     try{
//         await connection.promise().query(
//             'UPDATE tasks SET title = ? ,status = ? WHERE id = ?',
//             [title,status,id]
//         );
//         res.json({message: 'Cap nhat thanh cong'});
//     }catch(error){
//         res.status(500).json({error : error.message});
//     }
// });

// app.delete('/tasks/:id', async (req, res) => {
//     const { id } = req.params;

//     try {
//         await connection.promise().query(
//             'DELETE FROM tasks WHERE id = ?',
//             [id]
//         );
//         res.json({ message: 'Xóa thành công!' });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // app.get('/', (req, res) => {
// //   res.send('Xin chao cac ban')
// // })

app.listen(port, () => {
    console.log(`Server đang chạy tại port ${port}`);
});
