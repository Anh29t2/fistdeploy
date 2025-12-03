import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import của Router
import { toast } from "react-toastify"; // Import của Toastify

function Register() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState(""); 
  const [password, setPassword] = useState("");
  
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Kiểm tra dữ liệu
    if(!email || !name || !password) {
        toast.warning("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    try {
      const response = await fetch('https://fistdeploy.onrender.com/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await response.json();
      
      if (response.ok) {
        // 1. Hiện thông báo thành công
        toast.success("🎉 Đăng ký thành công! Hãy đăng nhập ngay.");
        
        // 2. Chuyển hướng về trang Login
        // Mẹo: Vì ToastContainer nằm ở App.jsx nên chuyển trang xong thông báo vẫn còn đó, nhìn rất xịn.
        navigate('/login'); 
      } else {
        // Hiện thông báo lỗi từ server
        toast.error("❌ " + data.message);
      }
    } catch (error) {
      toast.error("Lỗi kết nối server!");
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Đăng Ký Tài Khoản</h2>
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label>Email</label>
          <input 
            className="form-input" 
            type="email" 
            placeholder="Ví dụ: abc@gmail.com"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Họ và tên</label>
          <input 
            className="form-input" 
            type="text" 
            placeholder="Ví dụ: Nguyễn Văn A"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Mật khẩu</label>
          <input 
            className="form-input" 
            type="password" 
            placeholder="Mật khẩu bảo mật"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
        </div>

        <button type="submit" className="btn-submit">Đăng Ký</button>
      </form>

      <div className="switch-auth">
        Đã có tài khoản? 
        <Link to="/login" className="switch-link">Đăng nhập</Link>
      </div>
    </div>
  );
}

export default Register;