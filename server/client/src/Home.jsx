import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import './App.css';
// 1. Import các thành phần Kéo Thả
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"; 
import io from "socket.io-client";

function Home({ user, onLogout }) {
  const [tasks, setTasks] = useState([]); 
  const [newTask, setNewTask] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); 
  
  const [editingTask, setEditingTask] = useState(null); 
  const [deletingTask, setDeletingTask] = useState(null);

  // === 1. HÀM HỖ TRỢ GỌI API (QUAN TRỌNG NHẤT) ===
  // Hàm này tự động thêm Token và tự động Logout nếu token hết hạn
  const authenticatedFetch = async (url, options = {}) => {
    const token = localStorage.getItem('access_token');
    
    // Nếu không có token trong máy -> Đá ra ngay
    if (!token) {
        onLogout();
        return null;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        ...options.headers // Gộp với các header khác (nếu có)
    };

    try {
        const response = await fetch(url, { ...options, headers });

        // Nếu Server trả về 401 (Chưa đăng nhập) hoặc 403 (Hết hạn)
        if (response.status === 401 || response.status === 403) {
            toast.error("Hết phiên đăng nhập! Vui lòng đăng nhập lại.");
            onLogout(); // Gọi hàm đăng xuất từ App.jsx
            return null;
        }

        return response; // Trả về kết quả nếu ổn
    } catch (error) {
        console.error("Lỗi mạng:", error);
        return null;
    }
  };

  // --- 2. LẤY DỮ LIỆU ---
  const fetchTasks = async () => {
    // Dùng hàm fetch thông minh ở trên
    const response = await authenticatedFetch(`https://fistdeploy.onrender.com/tasks?user_id=${user.id}`);
    
    if (response && response.ok) {
        const data = await response.json();
        // Kiểm tra kỹ dữ liệu để tránh sập app
        if (Array.isArray(data)) {
            setTasks(data);
        } else {
            setTasks([]);
        }
    }
  };

  // --- 3. KẾT NỐI REAL-TIME ---
  useEffect(() => {
    fetchTasks(); 

    const API_URL = "https://fistdeploy.onrender.com"; 
    const socket = io(API_URL);

    socket.on('server_update_data', () => {
        // Chỉ fetch lại nếu người dùng KHÔNG đang kéo thả (để tránh giật)
        if (!document.body.classList.contains('is-dragging')) {
            fetchTasks(); 
        }
    });

    return () => { socket.disconnect(); };
  }, []);

  // --- 4. XỬ LÝ KHI KÉO THẢ XONG ---
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId; 

    // Cập nhật giao diện NGAY LẬP TỨC (Optimistic UI)
    const updatedTasks = tasks.map(task => {
        if (task.id.toString() === draggableId) {
            return { ...task, status: newStatus };
        }
        return task;
    });
    setTasks(updatedTasks);

    // Gọi API cập nhật ngầm
    await authenticatedFetch(`https://fistdeploy.onrender.com/tasks/${draggableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: tasks.find(t => t.id.toString() === draggableId)?.title, 
            status: newStatus 
        })
    });
  };

  // --- 5. THÊM MỚI ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const response = await authenticatedFetch("https://fistdeploy.onrender.com/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, title: newTask }),
    });

    if (response && response.ok) {
        toast.success("Thêm thành công!");
        setNewTask(""); 
    } else {
        toast.error("Lỗi thêm việc!");
    }
  };

  // --- 6. XÓA ---
  const confirmDelete = async () => {
    if (!deletingTask) return;

    const response = await authenticatedFetch(`https://fistdeploy.onrender.com/tasks/${deletingTask.id}`, { 
        method: 'DELETE'
    });

    if (response && response.ok) {
        toast.success("Đã xóa!");
        setDeletingTask(null); 
    } else {
        toast.error("Lỗi xóa!");
    }
  };

  // --- 7. SỬA ---
  const handleSaveEdit = async () => {
    if (!editingTask.title.trim()) return;

    const response = await authenticatedFetch(`https://fistdeploy.onrender.com/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTask.title, status: editingTask.status })
    });

    if (response && response.ok) {
        toast.info("Đã cập nhật!");
        setEditingTask(null);
    } else {
        toast.error("Lỗi cập nhật!");
    }
  };

  // --- CHUẨN BỊ DỮ LIỆU CHO 3 CỘT ---
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const columns = {
    pending: { title: "⏳ Chờ xử lý", items: filteredTasks.filter(t => t.status === 'pending'), color: "#ff9f1a" },
    processing: { title: "🔥 Đang làm", items: filteredTasks.filter(t => t.status === 'processing'), color: "#0052cc" },
    completed: { title: "✅ Hoàn thành", items: filteredTasks.filter(t => t.status === 'completed'), color: "#36b37e" }
  };

  return (
    <>
      <button onClick={onLogout} className="btn-logout-fixed">
        Đăng xuất
      </button>

      <div className="dashboard-container">
        
        <div className="home-header">
            <h2>Bảng công việc</h2>
            <p style={{color: '#666'}}>Xin chào, <b>{user.name}</b></p>
        </div>

        {/* Thanh tìm kiếm & Thêm mới */}
        <div className="kanban-controls">
            <input 
                type="text" placeholder="🔍 Tìm kiếm..." 
                className="control-input form-input"
                style={{flex: 1}}
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
            <form onSubmit={handleAddTask} className="add-form">
                <input 
                    type="text" placeholder="Việc mới..." 
                    className="control-input form-input"
                    value={newTask} onChange={(e) => setNewTask(e.target.value)}
                />
                <button type="submit" className="btn-submit">Thêm</button>
            </form>
        </div>

        {/* --- KHU VỰC BẢNG KANBAN (3 CỘT) --- */}
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="kanban-board">
                {Object.entries(columns).map(([columnId, column]) => (
                    <Droppable key={columnId} droppableId={columnId}>
                        {(provided, snapshot) => (
                            <div 
                                className="kanban-column"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{
                                    backgroundColor: snapshot.isDraggingOver ? '#e3f2fd' : undefined
                                }}
                            >
                                <div className="column-header" style={{color: column.color}}>
                                    {column.title} ({column.items.length})
                                </div>
                                
                                {column.items.map((task, index) => (
                                    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="task-card"
                                                onClick={() => setEditingTask(task)}
                                                style={{
                                                    ...provided.draggableProps.style,
                                                    borderLeft: `4px solid ${column.color}`, 
                                                    opacity: snapshot.isDragging ? 0.8 : 1
                                                }}
                                            >
                                                <div className="task-content">{task.title}</div>
                                                <button 
                                                    className="btn-delete-mini"
                                                    onClick={(e) => { e.stopPropagation(); setDeletingTask(task); }}
                                                >
                                                    X
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                ))}
            </div>
        </DragDropContext>
      </div>

      {/* --- POPUP SỬA --- */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Chỉnh sửa</h3><button className="modal-close" onClick={() => setEditingTask(null)}>×</button></div>
              <label>Tên công việc</label>
              <input type="text" className="modal-input" value={editingTask.title} onChange={(e) => setEditingTask({...editingTask, title: e.target.value})} />
              <label>Trạng thái</label>
              <select className="modal-input" value={editingTask.status} onChange={(e) => setEditingTask({...editingTask, status: e.target.value})}>
                  <option value="pending">⏳ Chờ xử lý</option>
                  <option value="processing">🔥 Đang làm</option>
                  <option value="completed">✅ Hoàn thành</option>
              </select>
              <div className="modal-actions">
                  <button onClick={() => setEditingTask(null)} className="modal-btn modal-cancel">Hủy</button>
                  <button onClick={handleSaveEdit} className="modal-btn modal-save">Lưu</button>
              </div>
            </div>
        </div>
      )}

      {/* --- POPUP XÓA --- */}
      {deletingTask && (
        <div className="modal-overlay" onClick={() => setDeletingTask(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '400px'}}>
              <div className="modal-header"><h3 style={{color: '#ff4d4f'}}>Xác nhận xóa?</h3><button className="modal-close" onClick={() => setDeletingTask(null)}>×</button></div>
              <p>Bạn muốn xóa: <b>{deletingTask.title}</b>?</p>
              <div className="modal-actions">
                  <button onClick={() => setDeletingTask(null)} className="modal-btn modal-cancel">Thôi</button>
                  <button onClick={confirmDelete} className="modal-btn modal-delete-confirm">Xóa luôn</button>
              </div>
            </div>
        </div>
      )}
    </>
  );
}

export default Home;