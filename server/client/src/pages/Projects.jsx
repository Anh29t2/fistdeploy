import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';
import AddProjectModal from '../components/AddProjectModal';
import ChatWidget from '../components/ChatWidget';
import ChangePasswordModal from "../components/ChangePasswordModal";
import Notification from '../components/Notification';
import SideBar from '../components/SideBar';

import { FaHome, FaProjectDiagram, FaKey, FaSignOutAlt, FaSearch, FaPlus } from "react-icons/fa";

export default function Projects({ user, onLogout }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectDeadline, setNewProjectDeadline] = useState('');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const API_URL = 'http://localhost:3000';

  const getToken = () => localStorage.getItem('access_token');

  const authenticatedFetch = async (url, options = {}) => {
    const token = getToken();
    if (!token) { onLogout(); return null; }
    const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        // Bỏ 403 ủy quyền
        toast.error("Hết phiên đăng nhập!", { toastId: 'session-expired' });
        onLogout(); 
        return null;
      }
      return response;
    } catch (error) { console.error("Lỗi mạng:", error); return null; }
  };

  const fetchProjects = async () => {
    if (!user?.id) return;
    const response = await authenticatedFetch(`${API_URL}/api/projects?user_id=${user.id}`);
    if (response && response.ok) {
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProjects();
    }
    const socket = io(API_URL);
    socket.on('connect', () =>{
        socket.emit('register_user', String(user.id));
    });
    socket.on('server_update_data', () => fetchProjects());
    
    return () => socket.disconnect();
  }, [user]);


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

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    const response = await authenticatedFetch(`${API_URL}/api/projects/${deletingProject.id}`, { method: 'DELETE' });
        if (response && response.ok) {
      toast.success('Xóa project thành công!');
      setDeletingProject(null); 
      fetchProjects();
    } 
    else if (response && response.status === 403) {
      const data = await response.json();
      toast.warning(data.message || 'Bạn không có quyền xóa dự án này!');
      setDeletingProject(null); // Đóng modal lại
    }
    else { 
      toast.error('Lỗi xóa project! Vui lòng thử lại.'); 
    }
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <div className="app-container">
        
       <SideBar 
            activePage="projects" 
            onLogout={onLogout} 
            onChangePassword={() => setIsChangePasswordOpen(true)}
        />

        <main className="main-content" style={{paddingRight: '20px'}}>
            <header className="main-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                
                <div style={{minWidth: '200px'}}>
                   <h2 style={{margin:0, fontSize: '24px', color: '#172b4d'}}>Projects</h2>
                   <small style={{color:'#6b778c'}}>Quản lý các dự án của bạn</small>
                </div>
                
                <div style={{flex: 1, display: 'flex', justifyContent: 'center', margin: '0 20px'}}>
                   <div style={{position:'relative', width: '100%', maxWidth: '400px'}}>
                        <FaSearch style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#888'}} />
                        <input 
                            type="text" placeholder="Tìm dự án..." className="control-input"
                            style={{
                                padding: '10px 12px 10px 38px', fontSize: '14px', width: '100%', 
                                borderRadius: '8px', border: '1px solid #e0e0e0', background: '#f9fafb'
                            }}
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                   </div>
                </div>

                <div style={{display:'flex', alignItems:'center', gap:'10px', minWidth: '200px', justifyContent: 'flex-end'}}>
                   <button 
                       className="btn-add" onClick={() => setIsAddingProject(true)}
                       style={{
                           padding: '10px 20px', fontSize: '14px', display:'flex', alignItems:'center', gap:'8px',
                           background: '#0052cc', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
                       }}
                   >
                       <FaPlus /> Tạo mới
                   </button>

                   <Notification user={user} API_URL={API_URL} />

                </div>
            </header>

            <div className="content-scroll-area">
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
      
      </div>
      
      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} onSuccess={() => {}} />
      <ChatWidget user={user} API_URL={API_URL} />
      <AddProjectModal isOpen={isAddingProject} onClose={() => setIsAddingProject(false)} onSubmit={handleAddProject} name={newProjectName} setName={setNewProjectName} description={newProjectDescription} setDescription={setNewProjectDescription} deadline={newProjectDeadline} setDeadline={setNewProjectDeadline} />
      
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