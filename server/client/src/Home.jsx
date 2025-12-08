import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import './App.css';
import io from "socket.io-client";
import { useNavigate } from 'react-router-dom';
import KanbanBoard from "./components/KanbanBoard";
import AddTaskModal from "./components/AddTaskModal";
import EditTaskModal from "./components/EditTaskModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";

function Home({ user, onLogout }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State cho Form Thêm mới
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");

  // State cho Modal Sửa & Xóa
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

  // Tự động nhận diện URL Backend (Local hoặc Render)
  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://fistdeploy.onrender.com';

  // --- 1. HÀM HELPER TOKEN & FETCH ---
  const getToken = () => localStorage.getItem('access_token');

  const authenticatedFetch = async (url, options = {}) => {
    const token = getToken();
    
    // Nếu không có token -> Logout ngay
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

        // Xử lý lỗi Token hết hạn (401/403)
        if (response.status === 401 || response.status === 403) {
            toast.error("Hết phiên đăng nhập! Vui lòng đăng nhập lại.");
            onLogout();
            return null;
        }

        return response;
    } catch (error) {
        console.error("Lỗi mạng:", error);
        return null;
    }
  };

  // --- 2. HÀM LẤY DỮ LIỆU ---
  const fetchTasks = async () => {
    const response = await authenticatedFetch(`${API_URL}/tasks?user_id=${user.id}`);
    
    if (response && response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
            setTasks(data);
        } else {
            setTasks([]);
        }
    }
  };

  // --- 3. SOCKET & INITIALIZATION ---
  useEffect(() => {
    fetchTasks(); 

    const socket = io(API_URL);

    // Lắng nghe tín hiệu từ Server
    socket.on('server_update_data', () => {
        // Chỉ fetch lại nếu người dùng KHÔNG đang kéo thả (để tránh giật lag)
        if (!document.body.classList.contains('is-dragging')) {
            fetchTasks(); 
        }
    });

    return () => {
        socket.disconnect();
    };
  }, []);

  // --- 4. XỬ LÝ KÉO THẢ (DRAG & DROP) ---
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Nếu thả ra ngoài bảng hoặc thả về chỗ cũ thì không làm gì
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId; // Cột mới chính là trạng thái mới

    // Cập nhật giao diện NGAY LẬP TỨC (Optimistic UI)
    const updatedTasks = tasks.map(task => {
        if (task.id.toString() === draggableId) {
            return { ...task, status: newStatus };
        }
        return task;
    });
    setTasks(updatedTasks);

    // Gọi API cập nhật ngầm
    await authenticatedFetch(`${API_URL}/tasks/${draggableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: tasks.find(t => t.id.toString() === draggableId)?.title, 
            status: newStatus 
        })
    });
  };

  // --- 5. XỬ LÝ THÊM MỚI ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
        toast.warning("Vui lòng nhập tên công việc!");
        return;
    }

    const response = await authenticatedFetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            user_id: user.id, 
            title: newTaskTitle,
            description: newTaskDescription,
            priority: newTaskPriority,
            deadline: newTaskDeadline
        }),
    });

    if (response && response.ok) {
        toast.success("Thêm thành công!");
        // Reset form
        setNewTaskTitle(""); 
        setNewTaskDescription("");
        setNewTaskPriority("medium");
        setNewTaskDeadline("");
        setIsAddingTask(false); // Đóng modal sau khi thêm
        // Refresh task list
        fetchTasks();
    } else {
        const errorData = response ? await response.json() : {};
        toast.error(errorData?.error || "Lỗi thêm việc!");
        console.error("Error adding task:", errorData);
    }
  };

  // --- 6. XỬ LÝ XÓA ---
  const confirmDelete = async () => {
    if (!deletingTask) return;

    const response = await authenticatedFetch(`${API_URL}/tasks/${deletingTask.id}`, { 
        method: 'DELETE'
    });

    if (response && response.ok) {
        toast.success("Đã xóa!");
        setDeletingTask(null); 
    } else {
        toast.error("Lỗi xóa!");
    }
  };

  // --- 7. XỬ LÝ SỬA ---
  const handleSaveEdit = async () => {
    if (!editingTask.title.trim()) return;

    const response = await authenticatedFetch(`${API_URL}/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: editingTask.title, 
            status: editingTask.status,
            priority: editingTask.priority,
            deadline: editingTask.deadline,
            description: editingTask.description
        })
    });

    if (response && response.ok) {
        toast.info("Đã cập nhật!");
        setEditingTask(null);
    } else {
        toast.error("Lỗi cập nhật!");
    }
  };

  // --- CHUẨN BỊ DỮ LIỆU HIỂN THỊ ---
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const columns = {
    pending: { title: "⏳ Chờ xử lý", color: "#f59e0b", items: filteredTasks.filter(t => t.status === 'pending') },
    processing: { title: "🔥 Đang làm", color: "#3b82f6", items: filteredTasks.filter(t => t.status === 'processing') },
    completed: { title: "✅ Hoàn thành", color: "#10b981", items: filteredTasks.filter(t => t.status === 'completed') }
  };

  // Helper format ngày
  const formatDate = (dateString) => {
      if (!dateString) return "";
      return new Date(dateString).toLocaleDateString('vi-VN');
  };

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
        <button onClick={() => navigate('/projects')} className="btn-logout-fixed" style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          marginRight: '10px'
        }}>
          📁 Dự án
        </button>
        <button onClick={onLogout} className="btn-logout-fixed">
          🚪 Đăng xuất
        </button>
      </div>

      {/* Container Chính */}
      <div className="dashboard-container">
        
        {/* Header */}
        <div className="home-header">
            <div>
                <h2>Bảng công việc</h2>
                <p style={{color: '#6b7280', margin:'5px 0 0'}}>Xin chào, <b>{user.name}</b> 👋</p>
            </div>
        </div>

        {/* Thanh Điều Khiển */}
        <div className="kanban-controls">
            <input 
                type="text" 
                placeholder="🔍 Tìm nhanh..." 
                className="control-input" 
                style={{flex: 1, minWidth: '200px'}} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
            />
            <button 
                type="button" 
                className="btn-add" 
                onClick={() => setIsAddingTask(true)}
            >
                ➕ Thêm Việc Mới
            </button>
        </div>

        {/* Bảng Kanban Kéo Thả */}
        <KanbanBoard 
          columns={columns}
          onDragEnd={handleDragEnd}
          onTaskClick={setEditingTask}
          onDeleteClick={setDeletingTask}
          formatDate={formatDate}
          isDraggable={false}
        />
      </div>

      {/* --- MODALS --- */}
      <AddTaskModal
        isOpen={isAddingTask}
        onClose={() => setIsAddingTask(false)}
        onSubmit={handleAddTask}
        title={newTaskTitle}
        setTitle={setNewTaskTitle}
        description={newTaskDescription}
        setDescription={setNewTaskDescription}
        priority={newTaskPriority}
        setPriority={setNewTaskPriority}
        deadline={newTaskDeadline}
        setDeadline={setNewTaskDeadline}
      />

      <EditTaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={handleSaveEdit}
        task={editingTask}
        setTask={setEditingTask}
      />

      <DeleteConfirmModal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={confirmDelete}
        task={deletingTask}
      />
    </>
  );
}

export default Home;