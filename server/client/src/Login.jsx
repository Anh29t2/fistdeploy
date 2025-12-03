import { useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom"; // 1. Import Link

// Bỏ prop onSwitchForm đi vì k dùng nữa
function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if(!email || !password) {
        toast.warning("Vui lòng nhập đầy đủ thông tin!");
        return;
    }
    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (response.ok) {
        toast.success("🎉 Đăng nhập thành công!");
        onLoginSuccess(data.user); 
      } else {
        toast.error("❌ " + data.message);
      }
    } catch (error) {
      toast.error("Lỗi kết nối server!");
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Đăng Nhập</h2>
      <form onSubmit={handleLogin}>
        {/* ... (Giữ nguyên các ô input) ... */}
        <div className="form-group">
          <label>Email</label>
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Mật khẩu</label>
          <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        
        <button type="submit" className="btn-submit">Đăng Nhập</button>
      </form>

      <div className="switch-auth">
        Chưa có tài khoản? 
        {/* 2. Thay onClick bằng thẻ Link */}
        <Link to="/register" className="switch-link">Đăng ký ngay</Link>
      </div>
    </div>
  );
}

export default Login;