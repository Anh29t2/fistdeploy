import { useState } from 'react';
import { toast } from 'react-toastify';

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });

  const API_URL = 'http://localhost:3000';

  const getToken = () => localStorage.getItem('access_token');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.warning('Vui lòng điền đầy đủ các trường!');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu mới và xác nhận không trùng khớp!');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    setLoading(true);

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Đổi mật khẩu thành công!');
        // Reset form
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.message || 'Lỗi đổi mật khẩu!');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Lỗi kết nối!');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔐 Đổi Mật Khẩu</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleChangePassword} className="add-task-form">
          {/* Mật khẩu cũ */}
          <div className="form-group">
            <label>Mật khẩu cũ</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.old ? 'text' : 'password'}
                className="modal-input"
                placeholder="Nhập mật khẩu cũ..."
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                {showPasswords.old ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Mật khẩu mới */}
          <div className="form-group">
            <label>Mật khẩu mới</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                className="modal-input"
                placeholder="Nhập mật khẩu mới..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                {showPasswords.new ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Xác nhận mật khẩu */}
          <div className="form-group">
            <label>Xác nhận mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                className="modal-input"
                placeholder="Xác nhận mật khẩu mới..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Nút Actions */}
          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="modal-btn modal-cancel"
              disabled={loading}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="modal-btn modal-save"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Đổi Mật Khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
