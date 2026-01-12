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
import { FaHome, FaProjectDiagram, FaKey, FaSignOutAlt, FaSearch, FaPlus, FaChartPie } from "react-icons/fa";
import ChatWidget from "./components/ChatWidget";
import Notification from "./components/Notification";
import SideBar from "./components/SideBar";

function Home({ user, onLogout }) {
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

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
        toast.error("Hết phiên đăng nhập!", {
            toastId: 'session-expired' // ID duy nhất, library sẽ tự check trùng
        });
        onLogout(); 
        return null;
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
        // authenticatedFetch(`${API_URL}/api/notifications`)
        //     .then(res => res.json())
        //     .then(data => { if(Array.isArray(data)) setNotifications(data); })
        //     .catch(err => console.error("Lỗi tải thông báo:", err));
    }
  }, [user]);

  // --- SOCKET IO ---
  useEffect(() => {
    if (!user?.id) return;

    const socket = io(API_URL);
    
    socket.on('connect', () => {
        socket.emit('register_user', String(user.id)); 
    });
    
    socket.on('server_update_data', () => {
        if (!document.body.classList.contains('is-dragging')) fetchTasks(); 
    });

    return () => { socket.disconnect(); };
  }, [user]);

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
      <div className="app-container">
        
        <SideBar
        activePage="home"
        onLogout={onLogout}
        onChangePassword={() => setIsChangePasswordOpen(true)}
        />

        <main className="main-content">
            <header className="main-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                
                {/* 1. BÊN TRÁI: Tiêu đề & Slogan */}
                <div style={{minWidth: '200px'}}>
                   <h2 style={{margin:0, fontSize: '24px', color: '#172b4d'}}>Your Work</h2>
                   <small style={{color:'#6b778c'}}>Các công việc gần đây</small>
                </div>
                
                {/* 2. Ở GIỮA: Thanh tìm kiếm (Căn giữa màn hình) */}
                <div style={{flex: 1, display: 'flex', justifyContent: 'center', margin: '0 20px'}}>
                   <div style={{position:'relative', width: '100%', maxWidth: '400px'}}>
                        <FaSearch style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#888'}} />
                        <input 
                            type="text" 
                            placeholder="Tìm nhanh..." 
                            className="control-input"
                            style={{
                                padding: '10px 12px 10px 38px', 
                                fontSize: '14px', 
                                width: '100%', // Để input giãn hết khung chứa maxWidth
                                borderRadius: '8px',
                                border: '1px solid #e0e0e0',
                                background: '#f9fafb'
                            }}
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                   </div>
                </div>

                {/* 3. BÊN PHẢI: Nút Tạo mới -> Rồi đến Thông báo */}
                <div style={{display:'flex', alignItems:'center', gap:'15px', minWidth: '200px', justifyContent: 'flex-end'}}>
                   
                   {/* Nút Tạo Mới (Đưa lên trước) */}
                   <button 
                        className="btn-add" 
                        onClick={() => setIsAddingTask(true)} 
                        style={{
                            padding: '10px 20px', 
                            fontSize: '14px', 
                            display:'flex', 
                            alignItems:'center', 
                            gap:'8px',
                            background: '#0052cc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                   >
                       <FaPlus /> Tạo mới
                   </button>

                   {/* Chuông Thông Báo (Đưa xuống cuối) */}
                   <Notification user = {user} API_URL = {API_URL} />
                </div>
            </header>

            <div className="content-scroll-area">
                <KanbanBoard 
                  columns={columns} onDragEnd={handleDragEnd} onTaskClick={setEditingTask}
                  onDeleteClick={setDeletingTask} formatDate={formatDate} isDraggable={false}
                />
            </div>
        </main>

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