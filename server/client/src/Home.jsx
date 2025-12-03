import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import './App.css';
import io from "socket.io-client";

function Home({ user, onLogout }) {
  const [tasks, setTasks] = useState([]); 
  const [newTask, setNewTask] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Chỉ cần tìm kiếm, bỏ bộ lọc dropdown
  
  const [editingTask, setEditingTask] = useState(null); 
  const [deletingTask, setDeletingTask] = useState(null);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`https://fistdeploy.onrender.com/tasks?user_id=${user.id}`);
      const data = await response.json();
      setTasks(data); 
    } catch (error) { console.error("Lỗi:", error); }
  };

    useEffect(() => {
    // 1. Gọi dữ liệu lần đầu tiên khi vào trang
    fetchTasks();

    // 2. Kết nối tới Server Socket
    const API_URL = "https://fistdeploy.onrender.com"; 
    const socket = io(API_URL);

    // 3. Lắng nghe sự kiện "server_update_data" từ Backend
    socket.on('server_update_data', () => {
        console.log(" Có thay đổi dữ liệu, đang tải lại...");
        fetchTasks(); // Tự động gọi lại API lấy danh sách mới
    });

    // 4. Dọn dẹp: Ngắt kết nối khi thoát trang (để tránh lag máy)
    return () => {
        socket.disconnect();
    };
  }, []); const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      const response = await fetch("https://fistdeploy.onrender.com/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, title: newTask }),
      });
      if (response.ok) {
        toast.success("Thêm thành công!");
        setNewTask(""); 
        fetchTasks(); 
      }
    } catch (error) { toast.error("Lỗi thêm việc!"); }
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    try {
      const response = await fetch(`https://fistdeploy.onrender.com/tasks/${deletingTask.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success("Đã xóa!");
        setDeletingTask(null); 
        fetchTasks();
      }
    } catch (error) { toast.error("Lỗi xóa!"); }
  };

  const handleSaveEdit = async () => {
    if (!editingTask.title.trim()) return;
    try {
      const response = await fetch(`https://fistdeploy.onrender.com/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTask.title, status: editingTask.status })
      });
      if (response.ok) {
        toast.info("Đã cập nhật!");
        setEditingTask(null);
        fetchTasks();
      }
    } catch (error) { toast.error("Lỗi cập nhật!"); }
  };

  // --- LOGIC KANBAN: Lọc và chia 3 nhóm ---
  // 1. Lọc theo từ khóa tìm kiếm trước
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
  
  // 2. Chia về 3 cột
  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const processingTasks = filteredTasks.filter(t => t.status === 'processing');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  // Hàm hiển thị Card (Dùng chung cho 3 cột)
  const renderTaskCard = (task, borderColors) => (
    <div key={task.id} className="task-card" 
         onClick={() => setEditingTask(task)}
         style={{borderLeftColor: borderColors}} // Màu viền trái theo trạng thái
    >
        <div className="task-content">{task.title}</div>
        <button 
            className="btn-delete-mini"
            onClick={(e) => { e.stopPropagation(); setDeletingTask(task); }}
        >
            ×
        </button>
    </div>
  );

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
            <form onSubmit={handleAddTask} style={{display: 'flex', gap: '10px', flex: 1}}>
                <input 
                    type="text" placeholder="Việc mới..." 
                    className="control-input form-input"
                    value={newTask} onChange={(e) => setNewTask(e.target.value)}
                />
                <button type="submit" className="btn-add">Thêm</button>
            </form>
        </div>

        {/* --- BẢNG KANBAN 3 CỘT --- */}
        <div className="kanban-board">
            
            {/* Cột 1: Chờ xử lý */}
            <div className="kanban-column">
                <div className="column-header" style={{color: '#ff9f1a'}}>
                    <span>⏳</span> Chờ xử lý ({pendingTasks.length})
                </div>
                {pendingTasks.map(t => renderTaskCard(t, '#ff9f1a'))}
                {pendingTasks.length === 0 && <p style={{fontSize:12, color:'#999', fontStyle:'italic'}}>Trống</p>}
            </div>

            {/* Cột 2: Đang làm */}
            <div className="kanban-column">
                <div className="column-header" style={{color: '#0052cc'}}>
                    <span>🔥</span> Đang làm ({processingTasks.length})
                </div>
                {processingTasks.map(t => renderTaskCard(t, '#0052cc'))}
            </div>

            {/* Cột 3: Hoàn thành */}
            <div className="kanban-column">
                <div className="column-header" style={{color: '#36b37e'}}>
                    <span>✅</span> Hoàn thành ({completedTasks.length})
                </div>
                {completedTasks.map(t => renderTaskCard(t, '#36b37e'))}
            </div>

        </div>
      </div>

      {/* --- POPUP SỬA --- */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chỉnh sửa</h3>
                <button className="modal-close" onClick={() => setEditingTask(null)}>×</button>
              </div>
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
              <div className="modal-header">
                <h3 style={{color: '#ff4d4f'}}>Xác nhận xóa?</h3>
                <button className="modal-close" onClick={() => setDeletingTask(null)}>×</button>
              </div>
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