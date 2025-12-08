export default function AddProjectModal({
  isOpen,
  onClose,
  onSubmit,
  name,
  setName,
  description,
  setDescription,
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
      <div className="modal-content modal-add-project" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Tạo Project Mới</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="add-task-form">
          <div className="form-group">
            <label>Tên Project</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="Nhập tên project..." 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label>Mô Tả</label>
            <textarea 
              className="form-control"
              rows="4" 
              placeholder="Mô tả project..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Hạn Chót (Deadline)</label>
            <input 
              type="date" 
              className="form-control"
              value={deadline} 
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="modal-btn modal-cancel">
              Hủy
            </button>
            <button type="submit" className="modal-btn modal-save">
              Tạo Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
