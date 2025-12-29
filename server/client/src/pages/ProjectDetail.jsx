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
import { FaHome, FaProjectDiagram, FaSignOutAlt, FaSearch, FaPlus, FaClock, FaUsers, FaKey } from "react-icons/fa";

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
        // Thêm option toastId để ngăn trùng lặp
        toast.error("Hết phiên đăng nhập!", {
            toastId: 'session-expired' // ID duy nhất, library sẽ tự check trùng
        });
        onLogout(); 
        return null;
    }
        return response;
    } catch (error) { console.error("Lỗi mạng:", error); return null; }
  };

  // --- HÀM QUAN TRỌNG: Format ngày để giữ nguyên giá trị khi gửi đi ---
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
            // Lấy thông tin dự án
            const projRes = await authenticatedFetch(`${API_URL}/api/projects?user_id=${user.id}`);
            if (projRes && projRes.ok) {
                const projects = await projRes.json();
                const current = projects.find(p => p.id == projectId);
                if (current) setProject(current);
                else { toast.error('Dự án không tồn tại'); navigate('/projects'); return; }
            }

            // --- SỬA QUAN TRỌNG: Chỉ dùng project_id để lấy toàn bộ task trong dự án ---
            const taskRes = await authenticatedFetch(`${API_URL}/api/tasks?project_id=${projectId}`);
            // ---------------------------------------------------------------------------
            if (taskRes && taskRes.ok) {
                const data = await taskRes.json();
                setTasks(Array.isArray(data) ? data : []);
            }
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    };

    if (user?.id) fetchData();

    const socket = io(API_URL);
    socket.on('server_update_data', () => {
        authenticatedFetch(`${API_URL}/api/tasks?project_id=${projectId}`)
            .then(res => res.json())
            .then(data => setTasks(Array.isArray(data) ? data : []));
    });

    return () => socket.disconnect();
  }, [projectId, user]);


  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) { toast.warning("Nhập tên công việc!"); return; }
    const response = await authenticatedFetch(`${API_URL}/api/tasks`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            user_id: user.id, 
            project_id: projectId, 
            title: newTaskTitle, 
            description: newTaskDescription, 
            priority: newTaskPriority, 
            deadline: newTaskDeadline 
        }),
    });
    if (response && response.ok) {
        toast.success("Thêm thành công!");
        setNewTaskTitle(""); setNewTaskDescription(""); setIsAddingTask(false);
        // --- SỬA TƯƠNG TỰ Ở ĐÂY ---
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
            title: editingTask.title, 
            status: editingTask.status, 
            priority: editingTask.priority, 
            deadline: deadlineToSend, 
            description: editingTask.description 
        }),
    });
    if (response && response.ok) {
        toast.success("Cập nhật thành công!"); setEditingTask(null);
        // --- SỬA TƯƠNG TỰ Ở ĐÂY ---
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
    
    // 1. Các kiểm tra cơ bản (giữ nguyên)
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    const task = tasks.find(t => t.id == draggableId); 
    if (!task) return;
    
    const newStatus = destination.droppableId;
    
    // 2. Cập nhật giao diện ngay lập tức (Optimistic Update)
    const newTasks = tasks.map(t => t.id == draggableId ? { ...t, status: newStatus } : t);
    setTasks(newTasks);

    // 3. Gọi API cập nhật
    const response = await authenticatedFetch(`${API_URL}/api/tasks/${draggableId}`, {
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            title: task.title, 
            description: task.description, 
            priority: task.priority, 
            deadline: formatDateLocal(task.deadline), 
            status: newStatus 
        }),
    });

    // 4. --- THÊM ĐOẠN NÀY: Hiển thị Toast ---
    if (response && response.ok) {
        // Tùy chỉnh thông báo cho thân thiện hơn
        let statusName = "";
        switch(newStatus) {
            case 'pending': statusName = "Chờ xử lý"; break;
            case 'processing': statusName = "Đang làm"; break;
            case 'completed': statusName = "Hoàn thành"; break;
            default: statusName = newStatus;
        }
        toast.success(`Đã chuyển sang: ${statusName}`);
    } else {
        // Nếu lỗi thì báo lỗi và (tuỳ chọn) có thể hoàn tác lại giao diện cũ
        toast.error("Lỗi khi cập nhật trạng thái!");
        // setTasks(tasks); // Nếu muốn chặt chẽ thì bỏ comment dòng này để revert lại vị trí cũ
    }
  };

  const filteredTasks = tasks.filter(task => task.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const columns = {
    pending: { title: "⏳ Chờ xử lý", color: "#f59e0b", items: filteredTasks.filter(t => t.status === 'pending') },
    processing: { title: "🔥 Đang làm", color: "#3b82f6", items: filteredTasks.filter(t => t.status === 'processing') },
    completed: { title: "✅ Hoàn thành", color: "#10b981", items: filteredTasks.filter(t => t.status === 'completed') }
  };
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('vi-VN') : "";

  return (
    <>
      <div className="app-container">
        
        <aside className="sidebar">
            <div className="sidebar-header">
               <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <div style={{width:'32px', height:'32px', background:'#6a11cb', borderRadius:'8px', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>A</div>
                  <div style={{fontWeight:'bold', fontSize:'15px', color:'#333'}}>ABCD Board</div>
               </div>
            </div>
            <nav className="sidebar-menu">
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

        <main className="main-content">
            {loading || !project ? (
                <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#666'}}>
                    <div className="loading-spinner" style={{width: '30px', height: '30px', border: '3px solid #eee', borderTop: '3px solid #6a11cb', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '10px'}}></div>
                    <p>Đang tải dữ liệu...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
                <>
                    <header className="main-header">
                        <div>
                           <h2 style={{margin:0, fontSize: '24px', color: '#172b4d'}}>{project.name}</h2>
                           <small style={{color:'#6b778c'}}>{project.description || "Không có mô tả"}</small>
                        </div>
                        
                        <div style={{display:'flex', gap:'10px'}}>
                           <div style={{position:'relative'}}>
                                <FaSearch style={{position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#888'}} />
                                <input 
                                    type="text" placeholder="Tìm việc..." className="control-input"
                                    style={{padding: '8px 12px 8px 35px', fontSize: '14px', width: '200px'}}
                                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                                />
                           </div>
                           <button className="btn-add" onClick={() => setIsAddingTask(true)} style={{padding: '8px 16px', fontSize: '14px', display:'flex', alignItems:'center', gap:'5px'}}>
                               <FaPlus /> Tạo mới
                           </button>
                           <button className="btn-member" onClick={() => setIsMembersModalOpen(true)} style={{padding: '8px 16px', fontSize: '14px'}}>
                               <FaUsers /> Thành viên
                           </button>
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

        <aside className="right-sidebar">
            {!loading && project && (
                <>
                    <div>
                        <div className="right-section-title">THÔNG TIN</div>
                        <div className="info-card">
                            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
                                <FaClock style={{color:'#0052cc'}}/> 
                                <span style={{fontSize:'13px', fontWeight:'600'}}>Hạn chót:</span>
                            </div>
                            <div style={{fontSize:'14px', color:'#333', marginLeft:'24px'}}>
                                {formatDate(project.deadline) || "Chưa đặt lịch"}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="right-section-title" style={{marginTop:'20px'}}>THỐNG KÊ</div>
                        <div className="info-card">
                            <div className="stats-row">
                                <span className="stats-label">Tổng task</span>
                                <span className="stats-value">{filteredTasks.length}</span>
                            </div>
                            <div className="progress-bar-mini">
                                <div className="progress-fill" style={{width: filteredTasks.length > 0 ? (columns.completed.items.length / filteredTasks.length * 100) + '%' : '0%'}}></div>
                            </div>
                            <p style={{fontSize:'12px', color:'#666', marginTop:'10px'}}>
                                Hoàn thành: {columns.completed.items.length}/{filteredTasks.length}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </aside>

      </div>
      <ChangePasswordModal
        isOpen={isChangePasswordOpen} 
        onClose={() => setIsChangePasswordOpen(false)} 
        onSuccess={() => {}} 
      />
      
      <ChatWidget 
          user={user} 
          projectId={projectId} 
          API_URL={API_URL} 
      />
      

      <AddTaskModal
        isOpen={isAddingTask} onClose={() => setIsAddingTask(false)} onSubmit={handleAddTask}
        title={newTaskTitle} setTitle={setNewTaskTitle} description={newTaskDescription} setDescription={setNewTaskDescription}
        priority={newTaskPriority} setPriority={setNewTaskPriority} deadline={newTaskDeadline} setDeadline={setNewTaskDeadline}
      />

      <EditTaskModal
        isOpen={!!editingTask} onClose={() => setEditingTask(null)} onSubmit={submitEditTask}
        task={editingTask} setTask={setEditingTask}
      />

      <DeleteConfirmModal
        isOpen={!!deletingTask} onClose={() => setDeletingTask(null)} onConfirm={confirmDelete}
        task={deletingTask}
      />

      <MembersModal
        isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)}
        projectId={projectId} API_URL={API_URL}
      />
    </>
  );
}