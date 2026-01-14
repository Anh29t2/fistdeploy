import { useEffect, useState } from "react";
import {toast} from 'react-toastify';
import { FaUser, FaLock, FaCamera, FaSave, FaEye, FaEyeSlash } from "react-icons/fa";

export default function ProfileModal ({ isOpen,onClose, user, setUser, API_URL }) {
    const [activeTab, setActiveTab] = useState('info');

    const [name, setName] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    // Thông tin người dùng
    useEffect(() => {
        if(user && isOpen) {
            setName(user.name || '');
            setPreviewUrl(user.avatar ? `${API_URL}${user.avatar}` : null);
            setOldPassword('');setNewPassword('');setConfirmPassword('');
        }
    },[user, isOpen, API_URL]);
    // Xử lý xem ảnh trước khi upload
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if(file) {
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUpdateInfo = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', name);
        if(avatarFile) formData.append('avatar', avatarFile);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/api/users/profile`, {
                method: 'PUT',
                headers: {'Authorization': `Bearer ${token}`},
                body: formData
            });
            if(res.ok) {
                const data = await res.json();
                toast.success('Cập nhật thông tin thành công');
                setUser(data.user);
                localStorage.setItem('user_data', JSON.stringify(data.user));
            }else{
                toast.error('Cập nhật thông tin thất bại');
            }
        }catch (error) {
            console.error('Lỗi cập nhật thông tin:', error);
    }
};

const handleChangePassword = async (e) => {
    e.preventDefault();
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
    try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/api/users/change-password`, { 
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
            });
        const data = await res.json();
        if(res.ok) {
            toast.success('Đổi mật khẩu thành công!');
            onClose();
        }else {
            toast.error(data.message || 'Lỗi đổi mật khẩu!');
        }
    }catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
    }
};

const renderPasswordInput = (label, value, setValue, show, setShow, placeholder) => (
        <div style={{marginBottom: '25px'}}>
            <label style={{display:'block', marginBottom:'8px', fontWeight:'500'}}>{label}</label>
            <div style={{position: 'relative'}}>
                <input 
                    className="control-input" 
                    // [QUAN TRỌNG]: Chuyển đổi type giữa text và password
                    type={show ? "text" : "password"} 
                    value={value} 
                    onChange={e => setValue(e.target.value)}
                    placeholder={placeholder}
                    style={{width:'100%', padding: '10px 40px 10px 12px'}} // paddingRight 40px để chữ không đè lên icon
                />
                {/* Nút icon con mắt */}
                <span 
                    onClick={() => setShow(!show)}
                    style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer',
                        color: '#666',
                        fontSize: '16px',
                        display: 'flex'
                    }}
                >
                    {show ? <FaEyeSlash /> : <FaEye />}
                </span>
            </div>
        </div>
    );

if(!isOpen) return null;

return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '600px', padding: 0, overflow: 'hidden', display:'flex', flexDirection:'column'}}>
                
                {/* HEADER */}
                <div style={{padding: '15px 20px', background: '#f8f9fa', borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h3 style={{margin: 0, color: '#172b4d'}}>Cài đặt tài khoản</h3>
                    <button onClick={onClose} style={{border:'none', background:'none', fontSize:'24px', cursor:'pointer'}}>&times;</button>
                </div>

                <div style={{display: 'flex', minHeight: '400px'}}>
                    {/* MENU TRÁI */}
                    <div style={{width: '160px', background: '#f4f5f7', borderRight: '1px solid #eee', paddingTop:'20px'}}>
                        <div onClick={() => setActiveTab('info')} style={menuStyle(activeTab === 'info')}>
                            <FaUser style={{marginRight: 8}}/> Thông tin
                        </div>
                        <div onClick={() => setActiveTab('password')} style={menuStyle(activeTab === 'password')}>
                            <FaLock style={{marginRight: 8}}/> Mật khẩu
                        </div>
                    </div>

                    {/* NỘI DUNG PHẢI */}
                    <div style={{flex: 1, padding: '30px'}}>
                        {activeTab === 'info' && (
                            <form onSubmit={handleUpdateInfo}>
                                <div style={{display:'flex', justifyContent:'center', marginBottom:'30px'}}>
                                    <div style={{position:'relative', width:'100px', height:'100px'}}>
                                        <img 
                                            src={previewUrl || "https://via.placeholder.com/100"} 
                                            alt="Avatar" 
                                            style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover', border:'4px solid #fff', boxShadow:'0 2px 10px rgba(0,0,0,0.1)'}}
                                        />
                                        <label htmlFor="avatar-upload" style={{position:'absolute', bottom:0, right:0, background:'#0052cc', color:'white', width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'2px solid white'}}>
                                            <FaCamera size={14}/>
                                        </label>
                                        <input id="avatar-upload" type="file" accept="image/*" onChange={handleFileChange} style={{display:'none'}} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Họ và tên</label>
                                    <input type="text" className="control-input" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div className="form-group" style={{marginTop:15}}>
                                    <label>Email</label>
                                    <input type="text" className="control-input" value={user?.email} disabled style={{background:'#f5f5f5'}} />
                                </div>
                                <button type="submit" className="modal-btn modal-confirm" style={{marginTop: 20, width:'100%'}}>
                                    <FaSave style={{marginRight:5}}/> Lưu thay đổi
                                </button>
                            </form>
                        )}

                        {activeTab === 'password' && (
                            <form onSubmit={handleChangePassword} style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
    <h4 style={{marginTop:0, marginBottom:'30px', textAlign: 'center', fontSize: '18px'}}>Đổi mật khẩu</h4>
    
    {/* --- MẬT KHẨU CŨ --- */}
    <div style={{marginBottom: '25px'}}>
        <label style={{display:'block', marginBottom:'8px', fontWeight:'500'}}>Mật khẩu cũ</label>
        <div style={{position: 'relative'}}>
            <input 
                className="control-input" 
                type={showOldPass ? "text" : "password"} // Thay đổi kiểu nhập liệu
                value={oldPassword} 
                onChange={e=>setOldPassword(e.target.value)} 
                style={{width:'90%', padding: '10px 40px 10px 10px'}} // Padding phải 40px để chữ không đè lên icon
            />
            <span 
                onClick={() => setShowOldPass(!showOldPass)}
                style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
                    cursor: 'pointer', color: '#666', fontSize: '16px', display: 'flex'
                }}
            >
                {showOldPass ? <FaEyeSlash /> : <FaEye />}
            </span>
        </div>
    </div>
    
    {/* --- MẬT KHẨU MỚI --- */}
    <div style={{marginBottom: '25px'}}>
        <label style={{display:'block', marginBottom:'8px', fontWeight:'500'}}>Mật khẩu mới</label>
        <div style={{position: 'relative'}}>
            <input 
                className="control-input" 
                type={showNewPass ? "text" : "password"} 
                value={newPassword} 
                onChange={e=>setNewPassword(e.target.value)} 
                style={{width:'90%', padding: '10px 40px 10px 10px'}} 
            />
            <span 
                onClick={() => setShowNewPass(!showNewPass)}
                style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
                    cursor: 'pointer', color: '#666', fontSize: '16px', display: 'flex'
                }}
            >
                {showNewPass ? <FaEyeSlash /> : <FaEye />}
            </span>
        </div>
    </div>
    
    {/* --- XÁC NHẬN MẬT KHẨU --- */}
                <div style={{marginBottom: '35px'}}>
                    <label style={{display:'block', marginBottom:'8px', fontWeight:'500'}}>Xác nhận mật khẩu mới</label>
                    <div style={{position: 'relative'}}>
                        <input 
                            className="control-input" 
                            type={showConfirmPass ? "text" : "password"} 
                            value={confirmPassword} 
                            onChange={e=>setConfirmPassword(e.target.value)} 
                            style={{width:'90%', padding: '10px 40px 10px 10px'}} 
                        />
                        <span 
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            style={{
                                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
                                cursor: 'pointer', color: '#666', fontSize: '16px', display: 'flex'
                            }}
                        >
                            {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
                        </span>
                    </div>
                </div>
                
                <button type="submit" className="modal-btn modal-delete-confirm" style={{width:'100%', padding: '12px', marginTop: 'auto'}}>Xác nhận đổi</button>
            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const menuStyle = (isActive) => ({
    padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    background: isActive ? 'white' : 'transparent',
    color: isActive ? '#0052cc' : '#42526e',
    fontWeight: isActive ? 'bold' : 'normal',
    borderLeft: isActive ? '3px solid #0052cc' : '3px solid transparent'
});