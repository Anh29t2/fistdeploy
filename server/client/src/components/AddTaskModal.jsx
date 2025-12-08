export default function AddTaskModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  deadline,
  setDeadline
}) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Thêm Công Việc Mới</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="add-task-form">
          <div className="form-group">
            <label>Tên Công Việc</label>
            <input 
              type="text" 
              className="modal-input" 
              placeholder="Nhập tên..." 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              autoFocus 
            />
          </div>

          <div className="form-group">
            <label>Mô Tả</label>
            <textarea 
              className="modal-input" 
              rows="3" 
              placeholder="Chi tiết..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          <div className="modal-row">
            <div style={{flex: 1}}>
              <label>Độ Ưu Tiên</label>
              <select 
                className="modal-input" 
                style={{width:'100%'}} 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">🟢 Thấp</option>
                <option value="medium">🟡 Trung Bình</option>
                <option value="high">🔴 Cao</option>
              </select>
            </div>
            <div style={{flex: 1}}>
              <label>Hạn Chót</label>
              <input 
                type="date" 
                className="modal-input" 
                value={deadline} 
                onChange={(e) => setDeadline(e.target.value)} 
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="modal-btn modal-cancel">
              Hủy
            </button>
            <button type="submit" className="modal-btn modal-save">
              Thêm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
