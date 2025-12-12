import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import KanbanBoard from '../components/KanbanBoard';
import AddTaskModal from '../components/AddTaskModal';
import EditTaskModal from '../components/EditTaskModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function ProjectDetail({ user, onLogout }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
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

  // Lấy thông tin project
  const fetchProject = async () => {
    const response = await authenticatedFetch(`${API_URL}/projects?user_id=${user.id}`);
    if (response && response.ok) {
      const projects = await response.json();
      const currentProject = projects.find(p => p.id == projectId);
      if (currentProject) {
        setProject(currentProject);
      } else {
        toast.error('Không tìm thấy project!');
        navigate('/projects');
      }
    } else {
      toast.error('Lỗi tải project!');
    }
  };

  // Lấy danh sách tasks của project
  const fetchTasks = async () => {
    const response = await authenticatedFetch(`${API_URL}/tasks?user_id=${user.id}&project_id=${projectId}`);
    if (response && response.ok) {
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
    }
  };

  useEffect(() => {
    // Reset state khi chuyển sang project khác
    setTasks([]);
    setProject(null);
    setSearchTerm("");
    setIsAddingTask(false);
    setEditingTask(null);
    setDeletingTask(null);

    // Fetch project và tasks mới
    fetchProject();
    fetchTasks();

    // Socket connection
    const socket = io(API_URL);
    socket.on('server_update_data', () => {
      fetchTasks();
    });

    return () => socket.disconnect();
  }, [projectId]);

  // --- XỬ LÝ THÊM TASK ---
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
            project_id: projectId,
            title: newTaskTitle,
            description: newTaskDescription,
            priority: newTaskPriority,
            deadline: newTaskDeadline
        }),
    });

    if (response && response.ok) {
        toast.success("Thêm thành công!");
        setNewTaskTitle(""); 
        setNewTaskDescription("");
        setNewTaskPriority("medium");
        setNewTaskDeadline("");
        setIsAddingTask(false);
        fetchTasks();
    } else {
        const errorData = response ? await response.json() : {};
        toast.error(errorData?.error || "Lỗi thêm việc!");
        console.error("Error adding task:", errorData);
    }
  };

  // --- XỬ LÝ SỬA TASK ---
  const handleEditTask = async (e) => {
    if (!editingTask) return;

    const response = await authenticatedFetch(`${API_URL}/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: editingTask.title,
            status: editingTask.status,
            priority: editingTask.priority,
            deadline: editingTask.deadline,
            description: editingTask.description
        }),
    });

    if (response && response.ok) {
        toast.success("Cập nhật thành công!");
        setEditingTask(null);
        fetchTasks();
    } else {
        toast.error("Lỗi cập nhật!");
    }
  };

  // --- XỬ LÝ XÓA ---
  const confirmDelete = async () => {
    if (!deletingTask) return;

    const response = await authenticatedFetch(`${API_URL}/tasks/${deletingTask.id}`, {
        method: "DELETE",
    });

    if (response && response.ok) {
        toast.success("Xóa thành công!");
        setDeletingTask(null);
        fetchTasks();
    } else {
        toast.error("Lỗi xóa!");
    }
  };

  // --- XỬ LÝ DRAG & DROP ---
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const task = tasks.find(t => t.id == draggableId);
    if (!task) return;

    const newStatus = destination.droppableId;
    
    // Cập nhật UI ngay lập tức
    const newTasks = tasks.map(t => 
      t.id == draggableId ? { ...t, status: newStatus } : t
    );
    setTasks(newTasks);

    // Gửi request lên server
    await authenticatedFetch(`${API_URL}/tasks/${draggableId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
    });
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = {
    pending: { title: "⏳ Chờ xử lý", color: "#f59e0b", items: filteredTasks.filter(t => t.status === 'pending') },
    processing: { title: "🔥 Đang làm", color: "#3b82f6", items: filteredTasks.filter(t => t.status === 'processing') },
    completed: { title: "✅ Hoàn thành", color: "#10b981", items: filteredTasks.filter(t => t.status === 'completed') }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (!project) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <p>Đang tải project...</p>
      </div>
    );
  }

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
          background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
          marginRight: '10px'
        }}>
          ← Quay lại
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
                <h2>{project.name}</h2>
                <p style={{color: '#6b7280', margin:'5px 0 0'}}>Xin chào, <b>{user.name}</b> 👋</p>
                {project.deadline && (
                  <p style={{color: '#d97706', margin:'5px 0 0', fontSize: '14px'}}>⏰ Hạn chót: {formatDate(project.deadline)}</p>
                )}
            </div>
        </div>

        {/* Thanh điều khiển */}
        <div className="kanban-controls">
          <input
            type="text"
            placeholder="🔍 Tìm công việc..."
            className="control-input"
            style={{ flex: 1, minWidth: '200px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="btn-add"
            onClick={() => setIsAddingTask(true)}
          >
            ➕ Thêm Việc Mới
          </button>
        </div>

        {/* Kanban Board */}
        <KanbanBoard
          columns={columns}
          onDragEnd={handleDragEnd}
          onTaskClick={setEditingTask}
          onDeleteClick={setDeletingTask}
          formatDate={formatDate}
          isDraggable={true}
        />
      </div>

      {/* Add Task Modal */}
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

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={handleEditTask}
        task={editingTask}
        onTaskChange={setEditingTask}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={confirmDelete}
        taskName={deletingTask?.title || ""}
      />
    </>
  );
}
