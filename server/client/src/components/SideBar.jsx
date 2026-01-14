import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaHome, FaProjectDiagram, FaChartPie, FaKey, FaSignOutAlt,FaUserCircle 
} from "react-icons/fa";

export default function Sidebar({ activePage, onLogout, onChangePassword, user }) {
    const navigate = useNavigate();
    const API_URL = 'http://localhost:3000';
const avatarSrc = user?.avatar ? `${API_URL}${user.avatar}` : null;
const displayName = user?.name || "Người dùng";
    // Hàm style chung cho menu item để code gọn hơn
    const getMenuStyle = (pageName) => {
        const isActive = activePage === pageName;
        return {
            margin: '4px 16px', 
            borderRadius: '8px',
            padding: '12px 16px', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            background: isActive ? '#e6f0ff' : 'transparent', 
            color: isActive ? '#0052cc' : '#555', 
            fontWeight: isActive ? '600' : 'normal',
            transition: 'all 0.2s ease-in-out'
        };
    };

    return (
        <aside className="sidebar" style={{display: 'flex', flexDirection: 'column', width: '260px', background: '#fff', borderRight: '1px solid #eee', height: '100vh', position: 'sticky', top: 0, zIndex: 100}}>
            
            {/* --- HEADER --- */}
            <div className="sidebar-header" style={{padding: '24px 20px', borderBottom: '1px solid #f0f0f0'}}>
               <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <div style={{width:'40px', height:'40px', background:'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', borderRadius:'10px', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'20px'}}>A</div>
                  <div>
                      <div style={{fontWeight:'700', fontSize:'16px', color:'#333'}}>ABCD Work</div>
                      <div style={{fontSize:'11px', color:'#888'}}>Quản lý dự án</div>
                  </div>
               </div>
            </div>

            {/* --- MENU --- */}
            <nav className="sidebar-menu" style={{padding: '20px 15px', flex: 1}}>
                
                <div 
                    className="menu-item" 
                    onClick={() => navigate('/statistics')} 
                    style={getMenuStyle('statistics')}
                >
                    <span className="menu-icon"><FaChartPie size={18} /></span>
                    <span className="menu-text">Thống kê</span>
                </div>

                <div 
                    className="menu-item" 
                    onClick={() => navigate('/home')} 
                    style={getMenuStyle('home')}
                >
                    <span className="menu-icon"><FaHome size={18} /></span>
                    <span className="menu-text">Trang chủ</span>
                </div>

                <div 
                    className="menu-item" 
                    onClick={() => navigate('/projects')} 
                    style={getMenuStyle('projects')}
                >
                    <span className="menu-icon"><FaProjectDiagram size={18} /></span>
                    <span className="menu-text">Dự án</span>
                </div>

            </nav>

            {/* --- FOOTER (PROFILE & LOGOUT) --- */}
            <div className="sidebar-footer" style={{padding: '15px', borderTop: '1px solid #f0f0f0'}}>
                
                {/* 1. KHU VỰC USER */}
                <div 
                    onClick={onChangePassword} 
                    title="Bấm để cài đặt tài khoản"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '12px', 
                        padding: '10px', borderRadius: '8px', cursor: 'pointer',
                        marginBottom: '8px', background: '#f8f9fa',
                        transition: '0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#eef2ff'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#f8f9fa'}
                >
                    {/* Avatar tròn */}
                    <div style={{width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #ddd', background:'#fff'}}>
                        {avatarSrc ? (
                            <img src={avatarSrc} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                        ) : (
                            <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc'}}>
                                <FaUserCircle size={36}/>
                            </div>
                        )}
                    </div>
                    
                    {/* Chỉ hiển thị Tên (Căn giữa theo chiều dọc) */}
                    <div style={{overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                        <div style={{fontWeight: '600', fontSize: '14px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px'}}>
                            {displayName}
                        </div>
                    </div>
                </div>

                {/* 2. NÚT ĐĂNG XUẤT */}
                <div 
                    onClick={onLogout} 
                    style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px 10px', borderRadius: '8px', cursor: 'pointer',
                        color: '#e05d5d', fontWeight: '500', transition: '0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#fff1f0'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <FaSignOutAlt size={16} />
                    <span>Đăng xuất</span>
                </div>
            </div>
        </aside>
    );
}