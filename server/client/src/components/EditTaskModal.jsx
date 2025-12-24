// 🔥 QUAN TRỌNG: Dòng này bắt buộc phải có ở trên cùng
import React, { useState, useEffect } from 'react';
import { toast } from "react-toastify";

export default function EditTaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  setTask,
  currentUser // Nhận từ Home để phân quyền
}) {
  // Khai báo state
  const [members, setMembers] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const API_URL = 'http://localhost:3000';

  // Hàm format ngày tháng
  const formatDate = (dateString) => {
    if(!dateString) return '';
    const date = new Date(dateString);
    if(isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Effect 1: Kiểm tra quyền và lấy danh sách thành viên khi mở modal
  useEffect(() => {
    if (isOpen && task && task.project_id) {
        fetchProjectData();
    }
  }, [isOpen, task]);

  const fetchProjectData = async () => {
      try {
          const token = localStorage.getItem('access_token');
          const headers = { 'Authorization': `Bearer ${token}` };
          
          // Lấy thông tin dự án
          const resProject = await fetch(`${API_URL}/api/projects/${task.project_id}`, { headers });
          const projectData = await resProject.json();

          // Lấy danh sách thành viên
          const resMembers = await fetch(`${API_URL}/api/projects/${task.project_id}/members`, { headers });
          const membersData = await resMembers.json();
          if(Array.isArray(membersData)) setMembers(membersData);

          // Logic phân quyền: Chỉ Owner mới được sửa
          let hasPermission = false;
          if (projectData && String(projectData.owner_id) === String(currentUser?.id)) {
              hasPermission = true;
          }
          setCanEdit(hasPermission);

      } catch (error) {
          console.error("Lỗi tải dữ liệu dự án:", error);
      }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{canEdit ? "Chỉnh sửa công việc" : "Chi tiết (Chỉ xem)"}</h3>
            {task.project_name && <p style={{fontSize: '12px', color: '#6b7280', margin: '4px 0 0'}}>📁 {task.project_name}</p>}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {!canEdit && (
            <div style={{background: '#fff3cd', color: '#856404', padding: '8px 12px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px'}}>
                ⚠️ Bạn chỉ có quyền xem nội dung công việc này.
            </div>
        )}
        
        <label>Tên công việc</label>
        <input 
          type="text" 
          className="modal-input" 
          value={task.title} 
          onChange={(e) => setTask({...task, title: e.target.value})}
          disabled={!canEdit} 
        />
        
        <div className="modal-row">
           <div style={{flex: 1}}>
            <label>Người thực hiện</label>
            <select 
              className="modal-input" 
              style={{width:'100%'}} 
              value={task.assignee_id || ""}
              onChange={(e) => setTask({...task, assignee_id: e.target.value})}
              disabled={!canEdit}
            >
              <option value="">-- Chưa giao --</option>
              {members.map(mem => (
                  <option key={mem.id} value={mem.id}>{mem.name}</option>
              ))}
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

        <div className="modal-row">
          <div style={{flex: 1}}>
            <label>Độ ưu tiên</label>
            <select 
              className="modal-input" 
              style={{width:'100%'}} 
              value={task.priority || 'medium'} 
              onChange={(e) => setTask({...task, priority: e.target.value})}
              disabled={!canEdit}
            >
              <option value="high">🔴 Cao</option>
              <option value="medium">🟡 Trung bình</option>
              <option value="low">🟢 Thấp</option>
            </select>
          </div>
           <div style={{flex: 1}}>
             <label>Hạn chót</label>
             <input 
              type="date" 
              className="modal-input" 
              value={formatDate(task.deadline)} 
              onChange={(e) => setTask({...task, deadline: e.target.value})} 
              disabled={!canEdit}
            />
          </div>
        </div>

        <label>Mô tả chi tiết</label>
        <textarea 
          className="modal-input" 
          rows="4" 
          placeholder="Nhập mô tả..." 
          value={task.description || ''} 
          onChange={(e) => setTask({...task, description: e.target.value})}
          disabled={!canEdit}
        />

        <div className="modal-actions">
          <button onClick={onClose} className="modal-btn modal-cancel">Đóng</button>
          {canEdit && (
             <button onClick={onSubmit} className="modal-btn modal-save">Lưu Thay Đổi</button>
          )}
        </div>
      </div>
    </div>
  );
}