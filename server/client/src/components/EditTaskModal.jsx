export default function EditTaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  setTask
}) {
  if (!isOpen || !task) return null;

  // Hàm chuyển đổi múi giờ thành giờ địa phương
  const formatDate = (dateString) => {
    if(!dateString) return '';  // Nếu không có dateString thì trả về chuỗi rỗng
    const date = new Date(dateString);

    // Lấy múi giờ hiện tại của người dùng
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Chỉnh sửa</h3>
            {task.project_name && <p style={{fontSize: '12px', color: '#6b7280', margin: '4px 0 0'}}>📁 {task.project_name}</p>}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <label>Tên công việc</label>
        <input 
          type="text" 
          className="modal-input" 
          value={task.title} 
          onChange={(e) => setTask({...task, title: e.target.value})} 
        />
        
        <div className="modal-row">
          <div style={{flex: 1}}>
            <label>Độ ưu tiên</label>
            <select 
              className="modal-input" 
              style={{width:'100%'}} 
              value={task.priority || 'medium'} 
              onChange={(e) => setTask({...task, priority: e.target.value})}
            >
              <option value="high">🔴 Cao</option>
              <option value="medium">🟡 Trung bình</option>
              <option value="low">🟢 Thấp</option>
            </select>
          </div>
          <div style={{flex: 1}}>
            <label>Trạng thái</label>
            <select 
              className="modal-input" 
              style={{width:'100%'}} 
              value={task.status} 
              onChange={(e) => setTask({...task, status: e.target.value})}
            >
              <option value="pending">⏳ Chờ xử lý</option>
              <option value="processing">🔥 Đang làm</option>
              <option value="completed">✅ Hoàn thành</option>
            </select>
          </div>
        </div>  

        <label>Hạn chót</label>
        <input 
          type="date" 
          className="modal-input" 
          value={formatDate(task.deadline)} 
          onChange={(e) => setTask({...task, deadline: e.target.value})} 
        />

        <label>Mô tả chi tiết</label>
        <textarea 
          className="modal-input" 
          rows="4" 
          placeholder="Nhập mô tả..." 
          value={task.description || ''} 
          onChange={(e) => setTask({...task, description: e.target.value})}
        />

        <div className="modal-actions">
          <button onClick={onClose} className="modal-btn modal-cancel">
            Hủy
          </button>
          <button onClick={onSubmit} className="modal-btn modal-save">
            Lưu Thay Đổi
          </button>
        </div>
      </div>
    </div>
  );
}
