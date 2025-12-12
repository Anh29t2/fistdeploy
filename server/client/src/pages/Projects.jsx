import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';
import AddProjectModal from '../components/AddProjectModal';

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
  // const API_URL = window.location.hostname === 'localhost' 
  //   ? 'http://localhost:3000' 
  //   : 'https://fistdeploy.onrender.com';

  const getToken = () => localStorage.getItem('access_token');

  const authenticatedFetch = async (url, options = {}) => {
    const token = getToken();
    if (!token) {
      onLogout();
      return null;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401 || response.status === 403) {
        toast.error("Hết phiên đăng nhập!");
        onLogout();
        return null;
      }
      return response;
    } catch (error) {
      console.error("Lỗi mạng:", error);
      return null;
    }
  };

  // Lấy danh sách projects
  const fetchProjects = async () => {
    const response = await authenticatedFetch(`${API_URL}/projects?user_id=${user.id}`);
    if (response && response.ok) {
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    }
  };

  useEffect(() => {
    fetchProjects();

    // Socket connection
    const socket = io(API_URL);
    socket.on('server_update_data', () => {
      fetchProjects();
    });

    return () => socket.disconnect();
  }, []);

  // Thêm project mới
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      toast.warning('Vui lòng nhập tên project!');
      return;
    }

    const response = await authenticatedFetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        name: newProjectName,
        description: newProjectDescription,
        deadline: newProjectDeadline
      })
    });

    if (response && response.ok) {
      toast.success('Tạo project thành công!');
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectDeadline('');
      setIsAddingProject(false);
      fetchProjects();
    } else {
      toast.error('Lỗi tạo project!');
    }
  };

  // Xóa project
  const handleDeleteProject = async () => {
    if (!deletingProject) return;

    const response = await authenticatedFetch(`${API_URL}/projects/${deletingProject.id}`, {
      method: 'DELETE'
    });

    if (response && response.ok) {
      toast.success('Xóa project thành công!');
      setDeletingProject(null);
      fetchProjects();
    } else {
      toast.error('Lỗi xóa project!');
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Navigation Buttons */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 999,
        display: 'flex',
        gap: '10px'
      }}>
        <button onClick={() => navigate('/home')} className="btn-logout-fixed" style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
          marginRight: '10px'
        }}>
          ✓ Công việc
        </button>
        <button onClick={onLogout} className="btn-logout-fixed">
          🚪 Đăng xuất
        </button>
      </div>

      <div className="dashboard-container">
        {/* Header */}
        <div className="home-header">
          <div>
            <h2>Project</h2>
            <p style={{ color: '#6b7280', margin: '5px 0 0' }}>
              Xin chào, <b>{user.name}</b> 👋
            </p>
          </div>
        </div>

        {/* Thanh điều khiển */}
        <div className="kanban-controls">
          <input
            type="text"
            placeholder="🔍 Tìm project..."
            className="control-input"
            style={{ flex: 1, minWidth: '200px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="btn-add"
            onClick={() => setIsAddingProject(true)}
          >
            ➕ Tạo Project Mới
          </button>
        </div>

        {/* Grid Projects */}
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: '18px', color: '#9ca3af', marginTop: '60px' }}>
              {searchTerm ? '❌ Không tìm thấy project' : '📁 Chưa có project nào. Hãy tạo project đầu tiên! 🚀'}
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

      {/* Modal Thêm Project */}
      <AddProjectModal
        isOpen={isAddingProject}
        onClose={() => setIsAddingProject(false)}
        onSubmit={handleAddProject}
        name={newProjectName}
        setName={setNewProjectName}
        description={newProjectDescription}
        setDescription={setNewProjectDescription}
        deadline={newProjectDeadline}
        setDeadline={setNewProjectDeadline}
      />

      {/* Modal Xóa Xác Nhận */}
      {deletingProject && (
        <div className="modal-overlay" onClick={() => setDeletingProject(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '350px', textAlign: 'center' }}
          >
            <div
              className="modal-header"
              style={{ justifyContent: 'center', borderBottom: 'none' }}
            >
              <h3 style={{ color: '#ef4444', fontSize: '22px' }}>
                ⚠️ Xác nhận xóa?
              </h3>
            </div>
            <p style={{ fontSize: '16px', color: '#374151' }}>
              Bạn có chắc muốn xóa project: <br />
              <b style={{ color: '#111' }}>{deletingProject.name}</b>?
            </p>

            <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setDeletingProject(null)}
                className="modal-btn modal-cancel"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteProject}
                className="modal-btn modal-delete-confirm"
              >
                Xóa luôn
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
