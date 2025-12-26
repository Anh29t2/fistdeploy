import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';
import AddProjectModal from '../components/AddProjectModal';
import ChatWidget from '../components/ChatWidget';

import { FaHome, FaProjectDiagram, FaKey, FaSignOutAlt, FaSearch, FaPlus } from "react-icons/fa";

export default function Projects({ user, onLogout }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectDeadline, setNewProjectDeadline] = useState('');

  const API_URL = 'http://localhost:3000';

  const getToken = () => localStorage.getItem('access_token');

  const authenticatedFetch = async (url, options = {}) => {
    const token = getToken();
    if (!token) { onLogout(); return null; }
    const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401 || response.status === 403) {
        toast.error("Hết phiên đăng nhập!"); onLogout(); return null;
      }
      return response;
    } catch (error) { console.error("Lỗi mạng:", error); return null; }
  };

  // Lấy danh sách projects
  const fetchProjects = async () => {
    if (!user?.id) return;
    const response = await authenticatedFetch(`${API_URL}/api/projects?user_id=${user.id}`);
    if (response && response.ok) {
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    }
  };

  useEffect(() => {
    if (user?.id) fetchProjects();
    const socket = io(API_URL);
    socket.on('server_update_data', () => fetchProjects());
    return () => socket.disconnect();
  }, [user]);

  // Thêm project mới
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) { toast.warning('Vui lòng nhập tên project!'); return; }

    const response = await authenticatedFetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id, name: newProjectName, description: newProjectDescription, deadline: newProjectDeadline
      })
    });

    if (response && response.ok) {
      toast.success('Tạo project thành công!');
      setNewProjectName(''); setNewProjectDescription(''); setNewProjectDeadline('');
      setIsAddingProject(false); fetchProjects();
    } else { toast.error('Lỗi tạo project!'); }
  };

  // Xóa project
  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    const response = await authenticatedFetch(`${API_URL}/api/projects/${deletingProject.id}`, { method: 'DELETE' });
    if (response && response.ok) {
      toast.success('Xóa project thành công!');
      setDeletingProject(null); fetchProjects();
    } else { toast.error('Lỗi xóa project!'); }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <div className="app-container">
        
        {/* 1. SIDEBAR TRÁI (Giống Home, nhưng Active ở mục Dự án) */}
        <aside className="sidebar">
            <div className="sidebar-header">
               <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <div style={{width:'32px', height:'32px', background:'#6a11cb', borderRadius:'8px', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>
                     A
                  </div>
                  <div style={{fontWeight:'bold', fontSize:'15px', color:'#333'}}>ABCD Board</div>
               </div>
            </div>

            <nav className="sidebar-menu">
                <div className="menu-item" onClick={() => navigate('/home')}>
                    <span className="menu-icon"><FaHome size={18} /></span>
                    <span className="menu-text">Trang chủ</span>
                </div>
                {/* Active class ở đây */}
                <div className="menu-item active">
                    <span className="menu-icon"><FaProjectDiagram size={18} /></span>
                    <span className="menu-text">Dự án</span>
                </div>
            </nav>

            <div className="sidebar-footer">
                <div className="menu-item" onClick={onLogout} style={{color: '#e05d5d'}}>
                    <span className="menu-icon"><FaSignOutAlt size={18} /></span>
                    <span className="menu-text">Đăng xuất</span>
                </div>
            </div>
        </aside>

        {/* 2. MAIN CONTENT (GIỮA) */}
        <main className="main-content">
            <header className="main-header">
                <div>
                   <h2 style={{margin:0, fontSize: '24px', color: '#172b4d'}}>Projects</h2>
                   <small style={{color:'#6b778c'}}>Quản lý các dự án của bạn</small>
                </div>
                
                <div style={{display:'flex', gap:'10px'}}>
                   <div style={{position:'relative'}}>
                        <FaSearch style={{position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#888'}} />
                        <input 
                            type="text" 
                            placeholder="Tìm dự án..." 
                            className="control-input"
                            style={{padding: '8px 12px 8px 35px', fontSize: '14px', width: '220px'}}
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                   </div>
                   <button 
                       className="btn-add" 
                       onClick={() => setIsAddingProject(true)}
                       style={{padding: '8px 16px', fontSize: '14px', display:'flex', alignItems:'center', gap:'5px'}}
                   >
                       <FaPlus /> Tạo mới
                   </button>
                </div>
            </header>

            <div className="content-scroll-area">
                {/* Grid Projects */}
                {filteredProjects.length === 0 ? (
                  <div style={{textAlign:'center', marginTop:'50px', color:'#999'}}>
                    <p style={{ fontSize: '16px' }}>
                      {searchTerm ? '❌ Không tìm thấy project nào.' : '📁 Chưa có project nào. Hãy tạo cái đầu tiên! 🚀'}
                    </p>
                  </div>
                ) : (
                  <div className="projects-grid">
                    {filteredProjects.map(project => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        onDelete={() => setDeletingProject(project)}
                      />
                    ))}
                  </div>
                )}
            </div>
        </main>

        {/* 3. RIGHT SIDEBAR (THỐNG KÊ DỰ ÁN) */}
        <aside className="right-sidebar">
            {/* User Profile */}
            <div>
                <div className="right-section-title">PROFILE</div>
                <div style={{display:'flex', alignItems:'center', gap:'12px', paddingBottom:'20px', borderBottom:'1px solid #eee'}}>
                    <div style={{
                        width:'40px', height:'40px', borderRadius:'50%', background:'#0052cc', color:'white', 
                        display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize: '16px'
                    }}>
                        {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                        <div style={{fontWeight:'600', color:'#172b4d'}}>{user?.name}</div>
                        {/* <div style={{fontSize:'12px', color:'#5e6c84'}}>{user?.email}</div> */}
                    </div>
                </div>
            </div>

            {/* Thống kê Projects */}
            <div>
                <div className="right-section-title" style={{marginTop: '20px'}}>THỐNG KÊ DỰ ÁN</div>
                <div className="info-card">
                    <div className="stats-row" style={{marginBottom:'15px'}}>
                        <span className="stats-label" style={{fontSize:'14px'}}>Tổng số dự án</span>
                        <span className="stats-value" style={{fontSize:'18px', color:'#0052cc'}}>{projects.length}</span>
                    </div>
                    
                    <div className="progress-bar-mini" style={{marginBottom:'15px'}}>
                        <div className="progress-fill" style={{width: '100%'}}></div>
                    </div>

                    <p style={{fontSize:'12px', color:'#666'}}>
                        Bạn đang tham gia {projects.length} dự án. Hãy giữ tiến độ tốt nhé!
                    </p>
                </div>
            </div>

            {/* Hoạt động gần đây */}
            <div>
                <div className="right-section-title" style={{marginTop: '20px'}}>HOẠT ĐỘNG</div>
                <div className="info-card">
                    <div style={{display:'flex', gap:'10px', alignItems:'start'}}>
                        <span style={{fontSize:'16px'}}>✨</span>
                        <div>
                            <h4 style={{marginBottom: '4px'}}>Mẹo nhỏ</h4>
                            <p style={{fontSize: '12px'}}>Bạn có thể mời thêm thành viên vào dự án để cùng làm việc.</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

      </div>
      <ChatWidget 
                user={user} 
                API_URL={API_URL} 
            />

      {/* --- MODALS --- */}
      <AddProjectModal
        isOpen={isAddingProject}
        onClose={() => setIsAddingProject(false)}
        onSubmit={handleAddProject}
        name={newProjectName} setName={setNewProjectName}
        description={newProjectDescription} setDescription={setNewProjectDescription}
        deadline={newProjectDeadline} setDeadline={setNewProjectDeadline}
      />

      {/* Modal Xóa Xác Nhận - Dùng style inline hoặc class modal-delete-confirm đã có */}
      {deletingProject && (
        <div className="modal-overlay" onClick={() => setDeletingProject(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', alignItems:'center' }}>
             <div style={{fontSize:'40px', marginBottom:'10px'}}>⚠️</div>
             <h3>Xác nhận xóa dự án?</h3>
             <p style={{color:'#666'}}>
                Bạn có chắc muốn xóa dự án <b>{deletingProject.name}</b>?<br/>
                Hành động này không thể hoàn tác.
             </p>
             <div className="modal-actions" style={{justifyContent:'center', width:'100%'}}>
                <button onClick={() => setDeletingProject(null)} className="modal-btn modal-cancel">Hủy</button>
                <button onClick={handleDeleteProject} className="modal-btn modal-delete-confirm">Xóa luôn</button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}