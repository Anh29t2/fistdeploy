import { useState, useEffect } from "react";
// 1. Import ToastContainer và CSS
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; 

import './App.css';
import io from "socket.io-client";
import { useNavigate } from 'react-router-dom';
import KanbanBoard from "./components/KanbanBoard";
import AddTaskModal from "./components/AddTaskModal";
import EditTaskModal from "./components/EditTaskModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import ChangePasswordModal from "./components/ChangePasswordModal";
import { FaHome, FaProjectDiagram, FaKey, FaSignOutAlt, FaSearch, FaPlus, FaBell } from "react-icons/fa";
import ChatWidget from "./components/ChatWidget";

function Home({ user, onLogout }) {
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  
  const [newTaskProjectId, setNewTaskProjectId] = useState(""); 
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");

  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

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
    if(user?.id) {
        fetchTasks(); 
        authenticatedFetch(`${API_URL}/api/notifications`)
            .then(res => res.json())
            .then(data => { if(Array.isArray(data)) setNotifications(data); })
            .catch(err => console.error("Lỗi tải thông báo:", err));
    }
  }, [user]);

  // --- SOCKET IO ---
  useEffect(() => {
    if (!user?.id) return;

    const socket = io(API_URL);
    
    socket.on('connect', () => {
        console.log("🟢 Socket Connected:", socket.id);
        socket.emit('register_user', String(user.id)); 
    });
    
    socket.on('server_update_data', () => {
        if (!document.body.classList.contains('is-dragging')) fetchTasks(); 
    });

    // 1. THÔNG BÁO HỆ THỐNG (Task, Deadline...) -> Vẫn vào Chuông + Toast
    socket.on('new_notification', (newNotif) => {
        setNotifications(prev => [newNotif, ...prev]);
        toast.info(`🔔 ${newNotif.content}`); 
    });

    // 2. TIN NHẮN (CHAT) -> CHỈ HIỆN TOAST, KHÔNG VÀO CHUÔNG
    socket.on('receive_message', (data) => {
        // Chỉ hiện Toast nếu người gửi KHÔNG PHẢI là mình
        if (String(data.senderId) !== String(user.id)) {
             toast.info(` ${data.senderName || 'Ai đó'} đã nhắn tin cho bạn}`, {
                position: "top-right",
                autoClose: 4000,      // Tự đóng sau 4s
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
             });
        }
    });
    
    return () => { socket.disconnect(); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleBellClick = () => {
      setShowNotifDropdown(!showNotifDropdown);
      if (!showNotifDropdown && unreadCount > 0) {
          setNotifications(prev => prev.map(n => ({...n, is_read: 1}))); 
          authenticatedFetch(`${API_URL}/api/notifications/read-all`, { method: 'PUT' }); 
      }
  };

  const handleNotificationClick = (notif) => {
      if (notif.link) {
          navigate(notif.link);
          setShowNotifDropdown(false);
      }
  };

  const formatNotifTime = (dateString) => {
      if (!dateString) return "";
      return new Date(dateString).toLocaleString('vi-VN', { 
          hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' 
      });
  };

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

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) { toast.warning("Nhập tên công việc!"); return; }
    
    const response = await authenticatedFetch(`${API_URL}/api/tasks`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            user_id: user.id, 
            title: newTaskTitle, 
            description: newTaskDescription, 
            priority: newTaskPriority, 
            deadline: newTaskDeadline,
            project_id: newTaskProjectId || null,
            assignee_id: newTaskAssigneeId || null
        }),
    });

    if (response && response.ok) {
        toast.success("Thêm thành công!");
        setNewTaskTitle(""); 
        setNewTaskDescription(""); 
        setNewTaskProjectId(""); 
        setNewTaskAssigneeId(""); 
        setIsAddingTask(false); 
        fetchTasks();
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
        body: JSON.stringify({ 
            title: editingTask.title, 
            status: editingTask.status, 
            priority: editingTask.priority, 
            deadline: editingTask.deadline, 
            description: editingTask.description,
            assignee_id: editingTask.assignee_id 
        })
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
  const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length
  };
  const completionRate = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);

  return (
    <>
      {/* 2. [QUAN TRỌNG] Thêm ToastContainer vào đây để popup hiện ra */}
      <ToastContainer 
        position="top-right"
        autoClose={3000}
      />

      <div className="app-container">
        
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

        <main className="main-content">
            <header className="main-header">
                <div>
                   <h2 style={{margin:0, fontSize: '24px', color: '#172b4d'}}>Your Work</h2>
                   <small style={{color:'#6b778c'}}>Các công việc gần đây</small>
                </div>
                
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
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

                   <div style={{position: 'relative', cursor: 'pointer'}} onClick={handleBellClick}>
                        <div style={{
                            width: '36px', height: '36px', 
                            background: showNotifDropdown ? '#e6f0ff' : 'white', 
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid #ddd', transition: 'all 0.2s'
                        }}>
                             <FaBell size={18} color={showNotifDropdown ? '#0052cc' : '#555'} />
                        </div>
                        
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: -2, right: -2,
                                background: '#e05d5d', color: 'white', fontSize: '10px', fontWeight: 'bold',
                                width: '16px', height: '16px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid white'
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}

                        {showNotifDropdown && (
                            <div style={{
                                position: 'absolute', right: -60, top: 45, width: '320px',
                                background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                borderRadius: '12px', zIndex: 1000, overflow: 'hidden', border: '1px solid #eee'
                            }} onClick={(e) => e.stopPropagation()}>
                                <div style={{padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '15px', color:'#333', background:'#fafafa'}}>
                                    Thông báo
                                </div>
                                <div style={{maxHeight: '350px', overflowY: 'auto'}}>
                                    {notifications.length === 0 ? (
                                        <p style={{padding: '30px', textAlign: 'center', color: '#999', fontSize: '13px'}}>Chưa có thông báo nào</p>
                                    ) : (
                                        notifications.map((notif, idx) => (
                                            <div key={idx} 
                                                 onClick={() => handleNotificationClick(notif)}
                                                 style={{
                                                    padding: '12px 16px', 
                                                    borderBottom: '1px solid #f5f5f5',
                                                    background: notif.is_read ? 'white' : '#f0f7ff',
                                                    cursor: 'pointer',
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px'
                                                 }}
                                                 onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                                 onMouseLeave={(e) => e.currentTarget.style.background = notif.is_read ? 'white' : '#f0f7ff'}
                                            >
                                                <div style={{flex: 1, fontSize: '13px', color: '#333', lineHeight: '1.4'}}>
                                                    {notif.content}
                                                </div>
                                                <div style={{fontSize: '11px', color: '#999', whiteSpace: 'nowrap', marginTop: '2px'}}>
                                                    {formatNotifTime(notif.created_at)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
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

        <aside className="right-sidebar">
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
                    </div>
                </div>
            </div>

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

      <AddTaskModal
        isOpen={isAddingTask} onClose={() => setIsAddingTask(false)} onSubmit={handleAddTask}
        title={newTaskTitle} setTitle={setNewTaskTitle}
        description={newTaskDescription} setDescription={setNewTaskDescription}
        priority={newTaskPriority} setPriority={setNewTaskPriority}
        deadline={newTaskDeadline} setDeadline={setNewTaskDeadline}
        projectId={newTaskProjectId} setProjectId={setNewTaskProjectId}
        assigneeId={newTaskAssigneeId} setAssigneeId={setNewTaskAssigneeId}
        currentUserId={user?.id}
      />

      <EditTaskModal
        isOpen={!!editingTask} onClose={() => setEditingTask(null)} onSubmit={handleSaveEdit}
        task={editingTask} setTask={setEditingTask}
        currentUser={user}
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