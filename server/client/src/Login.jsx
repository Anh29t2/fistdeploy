import { useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom"; 

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // State cho Popup Quên mật khẩu
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // Xử lý Đăng nhập
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
        // Lưu token vào localStorage (nếu có)
        if (data.token) localStorage.setItem('access_token', data.token);
        onLoginSuccess(data.user); 
      } else {
        toast.error("❌ " + (data.message || data.error));
      }
    } catch (error) {
      toast.error("Lỗi kết nối server!");
    }
  };

  // Xử lý Gửi yêu cầu quên mật khẩu
  const handleForgotPassword = async () => {
    if (!forgotEmail) return toast.warning("Vui lòng nhập email!");
    try {
        const res = await fetch('http://localhost:3000/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: forgotEmail })
        });
        const data = await res.json();
        
        if (res.ok) {
            toast.success(data.message);
            setShowForgot(false); // Tắt popup sau khi gửi thành công
            setForgotEmail(""); // Xóa trắng ô nhập
        } else {
            toast.error(data.message);
        }
    } catch (err) { toast.error("Lỗi kết nối!"); }
  };

  return (
    <>
      <div className="auth-container">
        <h2 className="auth-title">Đăng Nhập</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Mật khẩu</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {/* Link mở Popup Quên mật khẩu */}
          <div style={{ textAlign: 'right', marginBottom: '15px' }}>
            <span 
                style={{ color: '#6a11cb', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                onClick={() => setShowForgot(true)}
            >
                Quên mật khẩu?
            </span>
          </div>
          
          <button type="submit" className="btn-submit">Đăng Nhập</button>
        </form>

        <div className="switch-auth">
          Chưa có tài khoản? 
          <Link to="/register" className="switch-link">Đăng ký ngay</Link>
        </div>
      </div>

      {/* === POPUP (MODAL) QUÊN MẬT KHẨU === */}
      {showForgot && (
        <div className="modal-overlay" onClick={() => setShowForgot(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '400px'}}>
                <div className="modal-header">
                    <h3>Quên mật khẩu </h3>
                    <button className="modal-close" onClick={() => setShowForgot(false)}>×</button>
                </div>
                
                <p>Nhập email đăng ký của bạn để nhận mật khẩu mới.</p>
                
                <input 
                    type="email" 
                    className="modal-input" 
                    placeholder="Nhập email..." 
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                />
                
                <div className="modal-actions">
                    <button onClick={() => setShowForgot(false)} className="modal-btn modal-cancel">Hủy</button>
                    <button onClick={handleForgotPassword} className="modal-btn modal-save">Gửi yêu cầu</button>
                </div>
            </div>
        </div>
      )}
    </>
  );
}

export default Login;