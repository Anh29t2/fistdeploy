import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
    FaCheckCircle, FaSpinner, FaClock, FaChartBar, FaProjectDiagram 
} from "react-icons/fa";

// Import các component chung
import ChangePasswordModal from "../components/ChangePasswordModal";
import Notification from '../components/Notification';
import SideBar from '../components/SideBar'; // Nhớ import Sidebar mới

export default function Statistics({ user, onLogout }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

    const API_URL = 'http://localhost:3000';

    // Hàm gọi API lấy thống kê
    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) { onLogout(); return; }

            try {
                const response = await fetch(`${API_URL}/api/statistics`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                } else {
                    console.error("Lỗi tải thống kê:", response.status);
                    toast.error("Không tải được dữ liệu thống kê");
                }
            } catch (error) {
                console.error("Lỗi mạng:", error);
            }
        };

        if (user?.id) {
            fetchStats();
        }
    }, [user, onLogout]);

    // Dữ liệu mẫu cho biểu đồ tròn
    const pieData = stats ? [
        { name: 'Hoàn thành', value: Number(stats.overview.completed), color: '#10b981' },
        { name: 'Đang làm', value: Number(stats.overview.processing), color: '#3b82f6' },
        { name: 'Chờ xử lý', value: Number(stats.overview.pending), color: '#f59e0b' },
    ] : [];

    return (
        <>
            <div className="app-container">
                
                {/* 1. SIDEBAR MỚI */}
                <SideBar 
                    activePage="statistics" 
                    onLogout={onLogout} 
                    onChangePassword={() => setIsChangePasswordOpen(true)} 
                />

                <main className="main-content">
                    
                    {/* 2. HEADER ĐÃ ĐƯỢC CĂN CHỈNH LẠI CHO KHỚP */}
                    <header className="main-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        
                        {/* Cột Trái: Tiêu đề */}
                        <div style={{minWidth: '200px'}}>
                           <h2 style={{margin:0, fontSize: '24px', color: '#172b4d'}}>Thống kê hiệu suất</h2>
                           <small style={{color:'#6b778c'}}>Tổng hợp tiến độ tất cả dự án</small>
                        </div>
                        
                        {/* Cột Giữa: Khoảng trống (Spacer) để đẩy 2 bên ra giống trang Home */}
                        <div style={{flex: 1, margin: '0 20px'}}>
                            {/* Để trống hoặc thêm gì đó nếu muốn sau này */}
                        </div>
                        
                        {/* Cột Phải: Notification */}
                        <div style={{display:'flex', alignItems:'center', gap:'15px', minWidth: '200px', justifyContent: 'flex-end'}}>
                           <Notification user={user} API_URL={API_URL} />
                        </div>
                    </header>

                    {/* Nội dung chính */}
                    <div className="content-scroll-area">
                        {!stats ? (
                            <div style={{textAlign:'center', padding:'50px', color: '#666'}}>
                                <FaSpinner className="fa-spin" style={{marginRight: '10px'}}/> 
                                Đang tải dữ liệu...
                            </div>
                        ) : (
                            <>
                                {/* 1. CARDS TỔNG QUAN */}
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                                    <StatCard icon={<FaCheckCircle/>} title="Đã xong" value={stats.overview.completed} color="#10b981" bg="#d1fae5" />
                                    <StatCard icon={<FaSpinner/>} title="Đang làm" value={stats.overview.processing} color="#3b82f6" bg="#dbeafe" />
                                    <StatCard icon={<FaClock/>} title="Chờ xử lý" value={stats.overview.pending} color="#f59e0b" bg="#fef3c7" />
                                    <StatCard icon={<FaChartBar/>} title="Tổng task" value={stats.overview.total} color="#6366f1" bg="#e0e7ff" />
                                </div>

                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                    
                                    {/* 2. BIỂU ĐỒ TRÒN */}
                                    <div style={{ flex: 1, minWidth: '300px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border:'1px solid #f0f0f0' }}>
                                        <h4 style={{ marginBottom: '20px', borderBottom:'1px solid #eee', paddingBottom:'10px', marginTop: 0 }}>Tỷ lệ toàn hệ thống</h4>
                                        <div style={{ width: '100%', height: 300 }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* 3. BẢNG CHI TIẾT THEO DỰ ÁN */}
                                    <div style={{ flex: 2, minWidth: '450px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border:'1px solid #f0f0f0' }}>
                                        <h4 style={{ marginBottom: '20px', borderBottom:'1px solid #eee', paddingBottom:'10px', marginTop: 0 }}>Tiến độ theo Dự án</h4>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ color: '#6b778c', fontSize: '13px', textAlign: 'left', background:'#f9f9f9' }}>
                                                        <th style={{ padding: '12px 10px', borderRadius:'6px 0 0 6px' }}>DỰ ÁN</th>
                                                        <th style={{ padding: '12px 10px', textAlign: 'center' }}>TỔNG</th>
                                                        <th style={{ padding: '12px 10px', textAlign: 'center', color: '#10b981' }}>XONG</th>
                                                        <th style={{ padding: '12px 10px', textAlign: 'center', color: '#3b82f6' }}>ĐANG LÀM</th>
                                                        <th style={{ padding: '12px 10px', textAlign: 'center', color: '#f59e0b' }}>CHỜ</th>
                                                        <th style={{ padding: '12px 10px', borderRadius:'0 6px 6px 0' }}>TIẾN ĐỘ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {stats.projects.length > 0 ? (
                                                        stats.projects.map(proj => {
                                                            const percent = proj.total_tasks > 0 
                                                                ? Math.round((proj.completed / proj.total_tasks) * 100) 
                                                                : 0;
                                                            return (
                                                                <tr key={proj.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                                    <td style={{ padding: '14px 10px', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'10px', color: '#333' }}>
                                                                        {/* <div style={{width:'32px', height:'32px', background:'#eee', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color:'#666'}}><FaProjectDiagram size={14}/></div> */}
                                                                        {proj.name}
                                                                    </td>
                                                                    <td style={{ textAlign: 'center', fontWeight:'bold', color:'#333' }}>{proj.total_tasks}</td>
                                                                    <td style={{ textAlign: 'center', color: '#10b981', fontWeight:'500' }}>{proj.completed}</td>
                                                                    <td style={{ textAlign: 'center', color: '#3b82f6', fontWeight:'500' }}>{proj.processing}</td>
                                                                    <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight:'500' }}>{proj.pending}</td>
                                                                    <td style={{ padding: '10px' }}>
                                                                        <div style={{ width: '100%', height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                            <div style={{ width: `${percent}%`, height: '100%', background: percent === 100 ? '#10b981' : '#6366f1', transition:'width 0.5s' }}></div>
                                                                        </div>
                                                                        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', textAlign:'right' }}>{percent}%</div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr><td colSpan="6" style={{textAlign:'center', padding:'30px', color:'#999'}}>Chưa có dữ liệu dự án</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>

            {/* --- MODALS & WIDGETS --- */}
            <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} onSuccess={() => {}} />
            
            {/* Bạn có thể bỏ ChatWidget ở trang này nếu muốn nó đỡ rối */}
        </>
    );
}

function StatCard({ icon, title, value, color, bg }) {
    return (
        <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', minWidth: '200px', border:'1px solid #f0f0f0' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                {icon}
            </div>
            <div>
                <div style={{ color: '#6b778c', fontSize: '13px', marginBottom:'4px' }}>{title}</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#172b4d' }}>{value || 0}</div>
            </div>
        </div>
    );
}