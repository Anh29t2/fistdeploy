import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import KanbanBoard from '../components/KanbanBoard';
import AddTaskModal from '../components/AddTaskModal';
import EditTaskModal from '../components/EditTaskModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import MembersModal from '../components/MembersModal';
import ChatWidget from '../components/ChatWidget';
import ChangePasswordModal from '../components/ChangePasswordModal';
import Notification from '../components/Notification';
import { FaHome, FaProjectDiagram, FaSignOutAlt, FaSearch, FaPlus, FaClock, FaUsers, FaKey, FaCheckCircle, FaHourglassHalf, FaFire } from "react-icons/fa";

export default function ProjectDetail({ user, onLogout }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // State Modals
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");

  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const API_URL = 'http://localhost:3000';
  const getToken = () => localStorage.getItem('access_token');

  const authenticatedFetch = async (url, options = {}) => {
    const token = getToken();
    if (!token) { onLogout(); return null; }
    const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };

    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            toast.error("Hết phiên đăng nhập!", { toastId: 'session-expired' });
            onLogout(); 
            return null;
        }
        return response;
    } catch (error) { console.error("Lỗi mạng:", error); return null; }
  };

  const formatDateLocal = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const projRes = await authenticatedFetch(`${API_URL}/api/projects?user_id=${user.id}`);
            if (projRes && projRes.ok) {
                const projects = await projRes.json();
                const current = projects.find(p => p.id == projectId);
                if (current) setProject(current);
                else { toast.error('Dự án không tồn tại'); navigate('/projects'); return; }
            }
            const taskRes = await authenticatedFetch(`${API_URL}/api/tasks?project_id=${projectId}`);
            if (taskRes && taskRes.ok) {
                const data = await taskRes.json();
                setTasks(Array.isArray(data) ? data : []);
            }
            const notifRes = await authenticatedFetch(`${API_URL}/api/notifications`)
            if(notifRes && notifRes.ok){
                const notifData = await notifRes.json();
                if(Array.isArray(notifData)) setNotifications(notifData);
            }
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    };
    if (user?.id) fetchData();

    const socket = io(API_URL);
    socket.on('connect', () => {
        socket.emit('register_user', String(user.id));
    });
    socket.on('server_update_data', () => {
        authenticatedFetch(`${API_URL}/api/tasks?project_id=${projectId}`)
            .then(res => res.json())
            .then(data => setTasks(Array.isArray(data) ? data : []));
    });
    socket.on('new_notification', (newNotif) => {
        setNotifications(prev => [newNotif, ...prev]);
        toast.info(`${newNotif.content}`)
    });
    return () => socket.disconnect();
  }, [projectId, user]);

//   const unreadCount = notifications.filter(n => !n.is_read).length;

//   const handleBellClick = () => {
//     setShowNotifDropdown(!showNotifDropdown);
//     if(!showNotifDropdown && unreadCount > 0){
//         setNotifications(prev => prev.map(n => ({...n,is_read: 1})));
//         authenticatedFetch(`${API_URL}/api/notifications/read-all`, {method: 'PUT'});
//     }
//   };

//   const handleNotificationClick = (notif) => {
//     if(notif.link) {navigate(notif.link); setShowNotifDropdown(false); }
//   };

//   const formatNotifTime = (dateString) => {
//       if (!dateString) return "";
//       const date = new Date(dateString.endsWith("Z") ? dateString : dateString + "Z");
//       return date.toLocaleString('vi-VN', { 
//           hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' 
//       });
//   };

  

 const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) { toast.warning("Nhập tên công việc!"); return; }
    
    // 2. GỬI KÈM assignee_id KHI TẠO TASK
    const response = await authenticatedFetch(`${API_URL}/api/tasks`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            user_id: user.id, 
            project_id: projectId, 
            title: newTaskTitle, 
            description: newTaskDescription, 
            priority: newTaskPriority, 
            deadline: newTaskDeadline,
            assignee_id: newTaskAssigneeId || null // <--- Thêm dòng này
        }),
    });

    if (response && response.ok) {
        toast.success("Thêm thành công!");
        // Reset form
        setNewTaskTitle(""); 
        setNewTaskDescription(""); 
        setNewTaskAssigneeId(""); // <--- Reset assignee
        setIsAddingTask(false);
        
        const tRes = await authenticatedFetch(`${API_URL}/api/tasks?project_id=${projectId}`);
        const tData = await tRes.json();
        setTasks(tData);
    } else { toast.error("Lỗi thêm việc!"); }
  };

  const submitEditTask = async () => {
     if (!editingTask) return;
     let deadlineToSend = editingTask.deadline;
     if (deadlineToSend && deadlineToSend.includes('T')) {
         deadlineToSend = formatDateLocal(deadlineToSend);
     }
     const response = await authenticatedFetch(`${API_URL}/api/tasks/${editingTask.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            title: editingTask.title, status: editingTask.status, priority: editingTask.priority, 
            deadline: deadlineToSend, description: editingTask.description, assignee_id: editingTask.assignee_id 
        }),
    });
    if (response && response.ok) {
        toast.success("Cập nhật thành công!"); setEditingTask(null);
        const tRes = await authenticatedFetch(`${API_URL}/api/tasks?project_id=${projectId}`);
        setTasks(await tRes.json());
    }
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    const response = await authenticatedFetch(`${API_URL}/api/tasks/${deletingTask.id}`, { method: "DELETE" });
    if (response && response.ok) { toast.success("Xóa thành công!"); setDeletingTask(null); 
        setTasks(prevTasks => prevTasks.filter(t => t.id !== deletingTask.id));
    } else { toast.error("Lỗi xóa task!"); }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    const task = tasks.find(t => t.id == draggableId); 
    if (!task) return;
    const newStatus = destination.droppableId;
    
    const newTasks = tasks.map(t => t.id == draggableId ? { ...t, status: newStatus } : t);
    setTasks(newTasks);

    const response = await authenticatedFetch(`${API_URL}/api/tasks/${draggableId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            title: task.title, description: task.description, priority: task.priority, 
            deadline: formatDateLocal(task.deadline), status: newStatus, assignee_id: task.assignee_id
        }),
    });

    if (response && response.ok) {
        let statusName = "";
        switch(newStatus) {
            case 'pending': statusName = "Chờ xử lý"; break;
            case 'processing': statusName = "Đang làm"; break;
            case 'completed': statusName = "Hoàn thành"; break;
            default: statusName = newStatus;
        }
        toast.success(`Đã chuyển sang: ${statusName}`);
    } else { toast.error("Lỗi khi cập nhật trạng thái!"); }
  };

  const filteredTasks = tasks.filter(task => task.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const columns = {
    pending: { title: "⏳ Chờ xử lý", color: "#f59e0b", items: filteredTasks.filter(t => t.status === 'pending') },
    processing: { title: "🔥 Đang làm", color: "#3b82f6", items: filteredTasks.filter(t => t.status === 'processing') },
    completed: { title: "✅ Hoàn thành", color: "#10b981", items: filteredTasks.filter(t => t.status === 'completed') }
  };
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('vi-VN') : "";

  // Tính toán thống kê
  const totalTasks = filteredTasks.length;
  const completedTasks = columns.completed.items.length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
   <>
      <div className="app-container">
        
        <aside className="sidebar" style={{display: 'flex', flexDirection: 'column', width: '260px', background: '#fff', borderRight: '1px solid #eee'}}>
            <div className="sidebar-header" style={{padding: '20px', borderBottom: '1px solid #f0f0f0'}}>
               <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <div style={{width:'36px', height:'36px', background:'#6a11cb', borderRadius:'8px', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'18px'}}>A</div>
                  <div style={{fontWeight:'bold', fontSize:'16px', color:'#333'}}>ABCD Board</div>
               </div>
            </div>
            
            <nav className="sidebar-menu" style={{padding: '10px 0'}}>
                <div className="menu-item" onClick={() => navigate('/home')}>
                    <span className="menu-icon"><FaHome size={18} /></span>
                    <span className="menu-text">Trang chủ</span>
                </div>
                <div className="menu-item active">
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

        <main className="main-content" style={{paddingRight: '20px'}}> 
            {loading || !project ? (
                <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#666'}}>
                    <p>Đang tải dữ liệu...</p>
                </div>
            ) : (
                <>
                    <header className="main-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        
                        <div style={{minWidth: '200px'}}>
                           <h2 style={{margin:0, fontSize: '24px', color: '#172b4d'}}>{project.name}</h2>
                           <small style={{color:'#6b778c'}}>{project.description || "Không có mô tả"}</small>
                        </div>
                        
                        <div style={{flex: 1, display: 'flex', justifyContent: 'center', margin: '0 20px'}}>
                           <div style={{position:'relative', width: '100%', maxWidth: '400px'}}>
                                <FaSearch style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#888'}} />
                                <input 
                                    type="text" placeholder="Tìm việc trong dự án..." className="control-input"
                                    style={{
                                        padding: '10px 12px 10px 38px', fontSize: '14px', width: '100%', 
                                        borderRadius: '8px', border: '1px solid #e0e0e0', background: '#f9fafb'
                                    }}
                                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                                />
                           </div>
                        </div>

                        <div style={{display:'flex', alignItems:'center', gap:'10px', minWidth: '200px', justifyContent: 'flex-end'}}>
                           <button className="btn-add" onClick={() => setIsAddingTask(true)} style={{padding: '10px 20px', fontSize: '14px', display:'flex', alignItems:'center', gap:'8px', background: '#0052cc', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}>
                               <FaPlus /> Tạo mới
                           </button>
                           
                           <button className="btn-member" onClick={() => setIsMembersModalOpen(true)} style={{padding: '10px 16px', fontSize: '14px', background:'#f0f0f0', border:'1px solid #ddd', borderRadius:'6px', cursor:'pointer', color:'#333'}}>
                               <FaUsers />
                           </button>

                           {/* 3. THAY THẾ TOÀN BỘ CODE CHUÔNG CŨ */}
                           <Notification user={user} API_URL={API_URL} />

                        </div>
                    </header>

                    <div className="content-scroll-area">
                        <KanbanBoard
                          columns={columns} onDragEnd={handleDragEnd} onTaskClick={setEditingTask}
                          onDeleteClick={setDeletingTask} formatDate={formatDate} isDraggable={true}
                        />
                    </div>
                </>
            )}
        </main>
      </div>

      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} onSuccess={() => {}} />
      <ChatWidget user={user} projectId={projectId} API_URL={API_URL} />
      <AddTaskModal isOpen={isAddingTask} onClose={() => setIsAddingTask(false)}
                    onSubmit={handleAddTask} title={newTaskTitle} setTitle={setNewTaskTitle}
                    description={newTaskDescription} setDescription={setNewTaskDescription}
                    priority={newTaskPriority} setPriority={setNewTaskPriority}
                    deadline={newTaskDeadline} setDeadline={setNewTaskDeadline}
                    projectId={projectId}
                    assigneeId={newTaskAssigneeId}
                    setAssigneeId={setNewTaskAssigneeId} />
      <EditTaskModal isOpen={!!editingTask} onClose={() => setEditingTask(null)} onSubmit={submitEditTask} task={editingTask} setTask={setEditingTask} currentUser={user} />
      <DeleteConfirmModal isOpen={!!deletingTask} onClose={() => setDeletingTask(null)} onConfirm={confirmDelete} task={deletingTask} />
      <MembersModal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} projectId={projectId} API_URL={API_URL} />
    </>
  );
}