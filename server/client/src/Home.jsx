import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import './App.css';

function Home({ user, onLogout }) {
  const [searchTerm, setSearchTerm] = useState(""); //luu tu khoa tim kiem
  const [filterStatus, setFilterStatus] = useState("all"); // luu trang thai loc
  const [tasks, setTasks] = useState([]); 
  const [newTask, setNewTask] = useState("");
  
  // State quản lý popup Sửa
  const [editingTask, setEditingTask] = useState(null); 
  // State quản lý popup Xóa (Mới thêm)
  const [deletingTask, setDeletingTask] = useState(null);

  const filteredTasks = tasks.filter(task => {
    // Điều kiện 1: Tên công việc phải chứa từ khóa tìm kiếm
    const matchSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Điều kiện 2: Trạng thái phải khớp (nếu chọn 'all' thì luôn đúng)
    const matchStatus = filterStatus === 'all' || task.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const fetchTasks = async () => {
    try {
      const response = await fetch(`http://localhost:3000/tasks?user_id=${user.id}`);
      const data = await response.json();
      setTasks(data); 
    } catch (error) { console.error("Lỗi lấy task:", error); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      const response = await fetch("http://localhost:3000/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, title: newTask }),
      });
      if (response.ok) {
        toast.success("Đã thêm việc mới!");
        setNewTask(""); 
        fetchTasks(); 
      }
    } catch (error) { toast.error("Lỗi thêm việc!"); }
  };

  // --- HÀM XÓA THẬT (Được gọi khi bấm nút trong Popup) ---
  const confirmDelete = async () => {
    if (!deletingTask) return;

    try {
      const response = await fetch(`http://localhost:3000/tasks/${deletingTask.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success("Đã xóa thành công !");
        setDeletingTask(null); // Tắt popup xóa
        fetchTasks();
      }
    } catch (error) { toast.error("Lỗi xóa việc!"); }
  };

  const handleSaveEdit = async () => {
    if (!editingTask.title.trim()) return;
    try {
      const response = await fetch(`http://localhost:3000/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTask.title, status: editingTask.status })
      });
      if (response.ok) {
        toast.info("Đã cập nhật công việc!");
        setEditingTask(null);
        fetchTasks();
      }
    } catch (error) { toast.error("Lỗi cập nhật!"); }
  };

  const getStatusColor = (status) => {
    if (status === 'completed') return '#d4edda'; 
    if (status === 'processing') return '#fff3cd'; 
    return '#f8f9fa'; 
  };

  return (
    <>
      <button 
        onClick={onLogout} 
        style={{ 
          position: 'fixed', top: '80px', right: '30px',        
          background: "#ff4d4f", color: "white", border: "none", 
          padding: "10px 20px", borderRadius: "5px", cursor: "pointer",
          zIndex: 9999, fontWeight: "bold", boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          display: "flex", alignItems: "center", gap: "5px"
        }}
      >
        Đăng xuất
      </button>

      <div className="auth-container home-container" style={{ maxWidth: '700px' }}>
        <div className="home-header" style={{textAlign: 'center', marginBottom: '20px'}}>
          <h2 style={{margin: 0}}>Danh sách công việc</h2>
        </div>

        <p style={{textAlign: 'center', color: '#666'}}>Xin chào, <b>{user.name}</b>!</p>

        {/* --- 3. GIAO DIỆN TÌM KIẾM & LỌC --- */}
        <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
            <input 
                type="text" 
                placeholder="🔍 Tìm nhanh công việc..." 
                className="form-input"
                style={{flex: 2}}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <select 
                className="form-input" 
                style={{flex: 1, cursor: 'pointer'}}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
            >
                <option value="all">📝 Tất cả</option>
                <option value="pending">⏳ Chờ xử lý</option>
                <option value="processing">🔥 Đang làm</option>
                <option value="completed">✅ Đã xong</option>
            </select>
        </div>

        <form onSubmit={handleAddTask} className="add-form">
            <input type="text" placeholder="Nhập công việc mới..." value={newTask} onChange={(e) => setNewTask(e.target.value)} className="form-input" />
            <button type="submit" className="btn-submit">Thêm</button>
        </form>

        <ul className="task-list">
            {/* --- 4. HIỂN THỊ DANH SÁCH ĐÃ LỌC --- */}
            {filteredTasks.map((task) => (
            <li key={task.id} className="task-item" 
                onClick={() => setEditingTask(task)}
                style={{ 
                    backgroundColor: getStatusColor(task.status),
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '15px', borderBottom: '1px solid #eee', cursor: 'pointer',
                    transition: '0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.01)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span className="task-title" style={{ 
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        fontSize: '18px', fontWeight: 'bold'
                    }}>
                        {task.title}
                    </span>
                    <span style={{fontSize: '12px', color: '#666'}}>
                        {task.status === 'completed' ? '✅ Đã xong' : task.status === 'processing' ? '🔥 Đang làm' : '⏳ Chờ xử lý'}
                    </span>
                </div>
                
                <button 
                    onClick={(e) => {
                        e.stopPropagation(); 
                        setDeletingTask(task); 
                    }} 
                    style={{ background: "#ff4d4f", color: "white", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer" }}
                >
                    Xóa
                </button>
            </li>
            ))}
        </ul>
        
        {/* Thông báo nếu không tìm thấy */}
        {filteredTasks.length === 0 && <p className="empty-state">Không tìm thấy công việc nào.</p>}
      </div>
      {/* --- 1. POPUP SỬA (EDIT MODAL) --- */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chỉnh sửa công việc</h3>
                <button className="modal-close" onClick={() => setEditingTask(null)}>×</button>
              </div>

              <label>Tên công việc:</label>
                <input 
                    type="text" className="modal-input"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                />

                <label>Trạng thái:</label>
                <select 
                    className="modal-input"
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({...editingTask, status: e.target.value})}
                >
                    <option value="pending">⏳ Chờ xử lý</option>
                    <option value="processing">🔥 Đang làm</option>
                    <option value="completed">✅ Hoàn thành</option>
                </select>

                <div className="modal-actions">
                  <button onClick={() => setEditingTask(null)} className="modal-btn modal-cancel">Hủy</button>
                  <button onClick={handleSaveEdit} className="modal-btn modal-save">Lưu Thay Đổi</button>
                </div>
            </div>
        </div>
      )}

      {/* --- 2. POPUP XÓA (DELETE MODAL - MỚI) --- */}
      {deletingTask && (
        <div className="modal-overlay" onClick={() => setDeletingTask(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '400px'}}>
              
              <div className="modal-header">
                <h3 style={{color: '#ff4d4f'}}>⚠️ Xác nhận xóa</h3>
                <button className="modal-close" onClick={() => setDeletingTask(null)}>×</button>
              </div>

              <p style={{fontSize: '16px', lineHeight: '1.5'}}>
                Bạn có chắc chắn muốn xóa công việc: <br/>
                <b style={{color: '#333'}}>{deletingTask.title}</b>?
              </p>
              
              <p style={{fontSize: '14px', color: '#666', marginTop: '-10px'}}>
                Hành động này không thể hoàn tác.
              </p>

              <div className="modal-actions">
                  <button onClick={() => setDeletingTask(null)} className="modal-btn modal-cancel">
                    Hủy
                  </button>
                  <button onClick={confirmDelete} className="modal-btn modal-delete-confirm">
                    Xóa luôn
                  </button>
              </div>

            </div>
        </div>
      )}

    </>
  );
}

export default Home;