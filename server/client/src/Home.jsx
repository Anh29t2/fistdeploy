import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import './App.css';
import io from "socket.io-client";
import { useNavigate } from 'react-router-dom';
import KanbanBoard from "./components/KanbanBoard";
import AddTaskModal from "./components/AddTaskModal";
import EditTaskModal from "./components/EditTaskModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import ChangePasswordModal from "./components/ChangePasswordModal";
import { FaHome, FaProjectDiagram, FaKey, FaSignOutAlt, FaSearch, FaPlus } from "react-icons/fa";
import ChatWidget from "./components/ChatWidget";

function Home({ user, onLogout }) {
  const navigate = useNavigate();
  
  // --- BỎ state isSidebarOpen ---
  
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  
  // State form
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");

  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

  const API_URL = 'http://localhost:3000';

  // --- HELPER & FETCH ---
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
    } catch (error) { console.error(error); return null; }
  };

  const fetchTasks = async () => {
    if (!user?.id) return;
    const response = await authenticatedFetch(`${API_URL}/api/tasks?user_id=${user.id}`);
    if (response && response.ok) {
        const data = await response.json();
        setTasks(Array.isArray(data) ? data : []);
    }
  };

  useEffect(() => {
    if(user?.id) fetchTasks(); 
    const socket = io(API_URL);
    socket.on('server_update_data', () => {
        if (!document.body.classList.contains('is-dragging')) fetchTasks(); 
    });
    return () => { socket.disconnect(); };
  }, [user]);

  // --- DRAG DROP ---
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const updatedTasks = tasks.map(task => 
        task.id.toString() === draggableId ? { ...task, status: newStatus } : task
    );
    setTasks(updatedTasks);

    await authenticatedFetch(`${API_URL}/api/tasks/${draggableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: tasks.find(t => t.id.toString() === draggableId)?.title, 
            status: newStatus 
        })
    });
  };

  // --- CRUD ACTIONS ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) { toast.warning("Nhập tên công việc!"); return; }
    const response = await authenticatedFetch(`${API_URL}/api/tasks`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, title: newTaskTitle, description: newTaskDescription, priority: newTaskPriority, deadline: newTaskDeadline }),
    });
    if (response && response.ok) {
        toast.success("Thêm thành công!");
        setNewTaskTitle(""); setNewTaskDescription(""); setIsAddingTask(false); fetchTasks();
    } else { toast.error("Lỗi thêm việc!"); }
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    const response = await authenticatedFetch(`${API_URL}/api/tasks/${deletingTask.id}`, { method: 'DELETE' });
    if (response && response.ok) { toast.success("Đã xóa!"); setDeletingTask(null); } 
    else { toast.error("Lỗi xóa!"); }
  };

  const handleSaveEdit = async () => {
    if (!editingTask.title.trim()) return;
    const response = await authenticatedFetch(`${API_URL}/api/tasks/${editingTask.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTask.title, status: editingTask.status, priority: editingTask.priority, deadline: editingTask.deadline, description: editingTask.description })
    });
    if (response && response.ok) { toast.success("Cập nhật xong!"); setEditingTask(null); await fetchTasks(); }
    else { toast.error("Lỗi cập nhật!"); }
  };

  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const columns = {
    pending: { title: "⏳ Chờ xử lý", color: "#f59e0b", items: filteredTasks.filter(t => t.status === 'pending') },
    processing: { title: "🔥 Đang làm", color: "#3b82f6", items: filteredTasks.filter(t => t.status === 'processing') },
    completed: { title: "✅ Hoàn thành", color: "#10b981", items: filteredTasks.filter(t => t.status === 'completed') }
  };
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('vi-VN') : "";

  // --- THỐNG KÊ (Dùng cho Cột Phải) ---
  const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length
  };
  const completionRate = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);

  return (
    <>
      <div className="app-container">
        
        {/* 1. SIDEBAR TRÁI (CỐ ĐỊNH - KHÔNG CÓ NÚT TOGGLE) */}
        <aside className="sidebar">
            <div className="sidebar-header">
               <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <div style={{width:'32px', height:'32px', background:'#2f352dff', borderRadius:'8px', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>
  
                  </div>
                  <div style={{ alignItems:'center' , fontWeight:'bold', fontSize:'18px', color:'#333'}}>ABCD Project</div>
               </div>
            </div>

            <nav className="sidebar-menu">
                <div className="menu-item active">
                    <span className="menu-icon"><FaHome size={18} /></span>
                    <span className="menu-text">Trang chủ</span>
                </div>
                <div className="menu-item" onClick={() => navigate('/projects')}>
                    <span className="menu-icon"><FaProjectDiagram size={18} /></span>
                    <span className="menu-text">Dự án</span>
                </div>
            </nav>

            <div className="sidebar-footer">
                <div className="menu-item" onClick={() => setIsChangePasswordOpen(true)}>
                    <span className="menu-icon"><FaKey size={18} /></span>
                    <span className="menu-text">Đổi mật khẩu</span>
                </div>
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
                   <h2 style={{margin:0, fontSize: '24px', color: '#172b4d'}}>Your Work</h2>
                   <small style={{color:'#6b778c'}}>Các công việc gần đây</small>
                </div>
                
                <div style={{display:'flex', gap:'10px'}}>
                   <div style={{position:'relative'}}>
                        <FaSearch style={{position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#888'}} />
                        <input 
                            type="text" 
                            placeholder="Tìm nhanh..." 
                            className="control-input"
                            style={{padding: '8px 12px 8px 35px', fontSize: '14px', width: '200px'}}
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                   </div>
                   <button className="btn-add" onClick={() => setIsAddingTask(true)} style={{padding: '8px 16px', fontSize: '14px', display:'flex', alignItems:'center', gap:'5px'}}>
                       <FaPlus /> Tạo mới
                   </button>
                </div>
            </header>

            <div className="content-scroll-area">
                <KanbanBoard 
                  columns={columns} onDragEnd={handleDragEnd} onTaskClick={setEditingTask}
                  onDeleteClick={setDeletingTask} formatDate={formatDate} isDraggable={false}
                />
            </div>
        </main>

        {/* 3. RIGHT SIDEBAR */}
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

            {/* Thống kê Tiến độ */}
            <div>
                <div className="right-section-title" style={{marginTop: '20px'}}>TIẾN ĐỘ CÔNG VIỆC</div>
                <div className="info-card">
                    <div className="stats-row">
                        <span className="stats-label">Hoàn thành</span>
                        <span className="stats-value">{completionRate}%</span>
                    </div>
                    <div className="progress-bar-mini">
                        <div className="progress-fill" style={{width: `${completionRate}%`}}></div>
                    </div>
                    <div style={{marginTop:'15px', display:'flex', flexDirection:'column', gap:'8px'}}>
                        <div className="stats-row">
                            <span className="stats-label">Tổng số việc</span>
                            <span className="stats-value">{stats.total}</span>
                        </div>
                        <div className="stats-row">
                            <span className="stats-label">🔥 Đang làm</span>
                            <span className="stats-value">{stats.processing}</span>
                        </div>
                        <div className="stats-row">
                            <span className="stats-label">⏳ Chờ xử lý</span>
                            <span className="stats-value">{stats.pending}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thông báo Updates */}
            <div>
                <div className="right-section-title" style={{marginTop: '20px'}}>CẬP NHẬT GẦN ĐÂY</div>
                <div className="info-card" style={{marginBottom:'10px'}}>
                    <div style={{display:'flex', gap:'10px', alignItems:'start'}}>
                        <span style={{fontSize:'16px'}}>🚀</span>
                        <div>
                            <h4 style={{marginBottom: '4px'}}>Dự án ABCD</h4>
                            <p style={{fontSize: '12px'}}>Bạn có {stats.pending} công việc cần xử lý ngay.</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

      </div>

      {/* --- CÁC MODALS GIỮ NGUYÊN --- */}
      <AddTaskModal
        isOpen={isAddingTask} onClose={() => setIsAddingTask(false)} onSubmit={handleAddTask}
        title={newTaskTitle} setTitle={setNewTaskTitle}
        description={newTaskDescription} setDescription={setNewTaskDescription}
        priority={newTaskPriority} setPriority={setNewTaskPriority}
        deadline={newTaskDeadline} setDeadline={setNewTaskDeadline}
      />

      <EditTaskModal
        isOpen={!!editingTask} onClose={() => setEditingTask(null)} onSubmit={handleSaveEdit}
        task={editingTask} setTask={setEditingTask}
      />

      <DeleteConfirmModal
        isOpen={!!deletingTask} onClose={() => setDeletingTask(null)} onConfirm={confirmDelete} task={deletingTask}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} onSuccess={fetchTasks}
      />
      <ChatWidget user={user} API_URL={API_URL} />
    </>
  );
}

export default Home;