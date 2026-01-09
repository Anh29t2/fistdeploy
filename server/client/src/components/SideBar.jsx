import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaHome, FaProjectDiagram, FaChartPie, FaKey, FaSignOutAlt 
} from "react-icons/fa";

export default function Sidebar({ activePage, onLogout, onChangePassword }) {
    const navigate = useNavigate();

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
        <aside className="sidebar" style={{display: 'flex', flexDirection: 'column', width: '260px', background: '#fff', borderRight: '1px solid #eee', height: '100vh', position: 'sticky', top: 0}}>
            
            {/* --- HEADER --- */}
            <div className="sidebar-header" style={{padding: '20px', borderBottom: '1px solid #f0f0f0'}}>
               <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <div style={{width:'36px', height:'36px', background:'#6a11cb', borderRadius:'10px', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'18px'}}>A</div>
                  <div>
                      <div style={{fontWeight:'700', fontSize:'16px', color:'#333'}}>ABCD Work</div>
                      <div style={{fontSize:'11px', color:'#888'}}>Quản lý dự án</div>
                  </div>
               </div>
            </div>

            {/* --- MENU --- */}
            <nav className="sidebar-menu" style={{padding: '10px 0', flex: 1}}>
                
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

                <div 
                    className="menu-item" 
                    onClick={() => navigate('/statistics')} 
                    style={getMenuStyle('statistics')}
                >
                    <span className="menu-icon"><FaChartPie size={18} /></span>
                    <span className="menu-text">Thống kê</span>
                </div>

            </nav>

            {/* --- FOOTER --- */}
            <div className="sidebar-footer" style={{padding: '20px', borderTop: '1px solid #f0f0f0'}}>
                <div 
                    className="menu-item" 
                    onClick={onChangePassword} 
                    style={{padding: '10px 0', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', color:'#555'}}
                >
                    <span className="menu-icon"><FaKey size={18} /></span>
                    <span className="menu-text">Đổi mật khẩu</span>
                </div>
                <div 
                    className="menu-item" 
                    onClick={onLogout} 
                    style={{padding: '10px 0', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', color: '#e05d5d'}}
                >
                    <span className="menu-icon"><FaSignOutAlt size={18} /></span>
                    <span className="menu-text">Đăng xuất</span>
                </div>
            </div>
        </aside>
    );
}