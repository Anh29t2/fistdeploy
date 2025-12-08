export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  task
}) {
  if (!isOpen || !task) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '350px', textAlign: 'center'}}>
        <div className="modal-header" style={{justifyContent: 'center', borderBottom: 'none'}}>
          <h3 style={{color: '#ef4444', fontSize: '22px'}}>⚠️ Xác nhận xóa?</h3>
        </div>
        <p style={{fontSize: '16px', color: '#374151'}}>
          Bạn có chắc muốn xóa công việc: <br/>
          <b style={{color: '#111'}}>{task.title}</b>?
        </p>
        
        <div className="modal-actions" style={{justifyContent: 'center', marginTop: '20px'}}>
          <button onClick={onClose} className="modal-btn modal-cancel">
            Hủy
          </button>
          <button onClick={onConfirm} className="modal-btn modal-delete-confirm">
            Xóa luôn
          </button>
        </div>
      </div>
    </div>
  );
}
