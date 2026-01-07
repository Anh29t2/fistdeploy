import React, { useState, useEffect } from 'react';

export default function AddTaskModal({
  isOpen,
  onClose,
  onSubmit,
  title, setTitle,
  description, setDescription,
  priority, setPriority,
  deadline, setDeadline,
  // Các props mới (có thể bị thiếu ở trang ProjectDetail)
  projectId, setProjectId,
  assigneeId, setAssigneeId,
  currentUserId
}) {
  const [projects, setProjects] = useState([]); 
  const [members, setMembers] = useState([]);   
  const API_URL = 'http://localhost:3000';

  // 1. Load danh sách dự án (Chỉ chạy khi có currentUserId)
  useEffect(() => {
    if (isOpen && currentUserId && setProjectId) { 
       const token = localStorage.getItem('access_token');
       fetch(`${API_URL}/api/projects?user_id=${currentUserId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
       })
       .then(res => res.json())
       .then(data => {
           if(Array.isArray(data)) setProjects(data);
       })
       .catch(err => console.error(err));
    }
  }, [isOpen, currentUserId, setProjectId]);

  // 2. Load thành viên khi projectId thay đổi
  useEffect(() => {
      // Nếu có projectId thì mới load thành viên
      if (projectId) {
          const token = localStorage.getItem('access_token');
          fetch(`${API_URL}/api/projects/${projectId}/members`, {
              headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(res => res.json())
          .then(data => {
              if(Array.isArray(data)) setMembers(data);
          })
          .catch(err => console.error(err));
      } else {
          // Reset list thành viên
          setMembers([]);
          // 🔥 QUAN TRỌNG: Kiểm tra xem hàm này có tồn tại không trước khi gọi
          if (typeof setAssigneeId === 'function') {
              setAssigneeId("");
          }
      }
  }, [projectId]);

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
            <label>Tên Công Việc <span style={{color:'red'}}>*</span></label>
            <input 
              type="text" 
              className="modal-input" 
              placeholder="Nhập tên..." 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              autoFocus 
            />
          </div>

          {/* --- SỬA ĐỔI QUAN TRỌNG TẠI ĐÂY --- */}
          {/* Hiển thị dòng này nếu có setProjectId HOẶC setAssigneeId */}
          {(setProjectId || setAssigneeId) && (
            <div className="modal-row">
                
                {/* 1. Ô Chọn Dự Án: Chỉ hiện khi có hàm setProjectId (Home) */}
                {setProjectId && (
                    <div style={{flex: 1, marginRight: setAssigneeId ? '10px' : '0'}}>
                        <label>Thuộc Dự Án</label>
                        <select 
                            className="modal-input"
                            style={{width:'100%'}}
                            value={projectId || ""}
                            onChange={(e) => setProjectId(e.target.value)}
                        >
                            <option value="">-- Cá nhân --</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                
                {/* 2. Ô Chọn Người Thực Hiện: Hiện khi có setAssigneeId */}
                {setAssigneeId && (
                    <div style={{flex: 1}}>
                        <label>Người thực hiện</label>
                        <select 
                            className="modal-input"
                            style={{width:'100%'}}
                            value={assigneeId || ""}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            // Nếu ở Home mà chưa chọn Project thì disable
                            disabled={!projectId} 
                        >
                            <option value="">-- Chưa giao --</option>
                            {members.length > 0 ? (
                                members.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))
                            ) : (
                                <option disabled>Không có thành viên (hoặc chưa chọn DA)</option>
                            )}
                        </select>
                    </div>
                )}
            </div>
          )}
          {/* ---------------------------------- */}

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
            <button type="button" onClick={onClose} className="modal-btn modal-cancel">Hủy</button>
            <button type="submit" className="modal-btn modal-save">Thêm</button>
          </div>
        </form>
      </div>
    </div>
  );
}