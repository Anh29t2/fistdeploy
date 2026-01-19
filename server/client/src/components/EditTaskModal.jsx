import React, { useState, useEffect, useRef } from 'react';
import { toast } from "react-toastify";
import { FaPaperPlane, FaUserCircle, FaClock } from "react-icons/fa";
import io from 'socket.io-client'

export default function EditTaskModal({
  isOpen, onClose, onSubmit, task, setTask, currentUser
}) {
  const [members, setMembers] = useState([]);
  const [comments, setComments] = useState([]); // Danh sách comment
  const [newComment, setNewComment] = useState(""); // Nội dung comment đang nhập
  const [canEdit, setCanEdit] = useState(false);
  const [isLoadingPermission, setIsLoadingPermission] = useState(true);
  
  const commentsEndRef = useRef(null); // Để tự động cuộn xuống comment mới nhất
  const API_URL = 'http://localhost:3000';

  // Format ngày cho input date
  const formatDate = (dateString) => {
    if(!dateString) return '';
    const date = new Date(dateString);
    if(isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }

  // Format ngày giờ hiển thị ở comment (VD: 10:30 20/10/2023)
  const formatDateTime = (isoString) => {
    if(!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  }

  useEffect(() => {
    if (isOpen && task && task.project_id) {
        checkPermissionAndFetchData();
        fetchComments(); // Gọi thêm hàm lấy comment
    }
  }, [isOpen, task, currentUser]);

  useEffect(() => {
    if (!task || !task.project_id) return;

    const socket = io(API_URL);

    // 1. Tham gia vào phòng của Project này
    socket.emit('join_project', String(task.project_id));

    // 2. Lắng nghe comment mới
    socket.on('receive_comment', (incomingComment) => {
        // Chỉ nhận comment của đúng Task đang mở
        if (String(incomingComment.task_id) === String(task.id)) {
            setComments((prevComments) => {
                // Kiểm tra trùng lặp
                const exists = prevComments.find(c => c.id === incomingComment.id);
                if (exists) return prevComments;
                return [...prevComments, incomingComment];
            });
        }
    });

    return () => {
        socket.disconnect();
    };
  }, [task, API_URL]);

  // Tự động cuộn xuống cuối khi có comment mới
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const checkPermissionAndFetchData = async () => {
      setIsLoadingPermission(true);
      try {
          const token = localStorage.getItem('access_token');
          const headers = { 'Authorization': `Bearer ${token}` };
          
          let hasPermission = false;
          // Check quyền (giữ nguyên logic cũ của bạn)
          if (task.project_owner_id && currentUser) {
              if (String(task.project_owner_id) === String(currentUser.id)) hasPermission = true;
          } else {
              const resProject = await fetch(`${API_URL}/api/projects/${task.project_id}`, { headers });
              const rawData = await resProject.json();
              const projectData = Array.isArray(rawData) ? rawData[0] : rawData;
              if (projectData && currentUser && String(projectData.owner_id) === String(currentUser.id)) hasPermission = true;
          }
          // Nếu là assignee thì cũng có quyền sửa trạng thái (logic mở rộng)
          if(String(task.assignee_id) === String(currentUser?.id)) hasPermission = true;

          setCanEdit(hasPermission);

          const resMembers = await fetch(`${API_URL}/api/projects/${task.project_id}/members`, { headers });
          const membersData = await resMembers.json();
          if(Array.isArray(membersData)) setMembers(membersData);

      } catch (error) {
          console.error("Lỗi setup modal:", error);
      } finally {
          setIsLoadingPermission(false);
      }
  };

  // --- HÀM LẤY COMMENT ---
  const fetchComments = async () => {
      try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/api/comments/${task.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(res.ok) {
              const data = await res.json();
              setComments(data);
          }
      } catch (error) { console.error("Lỗi lấy comment:", error); }
  };

  // --- HÀM GỬI COMMENT ---
  const handleSendComment = async () => {
      if(!newComment.trim()) return;
      try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/api/comments`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ task_id: task.id, content: newComment })
          });

          if(res.ok) {
              const savedComment = await res.json();
              // Kiểm tra nếu socket chưa kịp bắn về thì mình tự thêm vào
              setComments(prev => {
                  const exists = prev.find(c => c.id === savedComment.id);
                  if (exists) return prev;
                  return [...prev, savedComment];
              });
              setNewComment(""); 
          }
      } catch (error) { toast.error("Lỗi gửi bình luận"); }
  };

  if (!isOpen || !task) return null;

 return (
    <div className="modal-overlay" onClick={onClose} style={{zIndex: 1000}}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '1000px', width: '90%', padding: 0, display: 'flex', flexDirection: 'column', height: '85vh'}}>
        
        {/* HEADER */}
        <div className="modal-header" style={{padding: '15px 20px', borderBottom: '1px solid #eee'}}>
          <div>
            <h3 style={{margin: 0}}> {canEdit ? "Chỉnh sửa công việc" : "Chi tiết công việc"}</h3>
            {task.project_name && <p style={{fontSize: '12px', color: '#6b7280', margin: '4px 0 0'}}>📁 Dự án: {task.project_name}</p>}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* BODY: CHIA 2 CỘT */}
        <div style={{display: 'flex', flex: 1, overflow: 'hidden'}}>
            
            {/* --- CỘT TRÁI: THÔNG TIN TASK (60%) --- */}
            <div style={{flex: 6, padding: '20px', overflowY: 'auto', borderRight: '1px solid #eee'}}>
                {!canEdit && (
                    <div style={{background: '#fff3cd', color: '#856404', padding: '8px 12px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px'}}>
                        ⚠️ Bạn chỉ có quyền xem nội dung hoặc cập nhật trạng thái.
                    </div>
                )}
                
                <div style={{marginBottom: 15}}>
                    <label style={{fontWeight: 600, display: 'block', marginBottom: 5}}>Tên công việc</label>
                    <input 
                    type="text" className="modal-input" style={{width: '100%'}}
                    value={task.title} onChange={(e) => setTask({...task, title: e.target.value})}
                    disabled={!canEdit} 
                    />
                </div>
                
                <div className="modal-row" style={{display: 'flex', gap: 15, marginBottom: 15}}>
                    <div style={{flex: 1}}>
                        <label style={{fontWeight: 600, display: 'block', marginBottom: 5}}>Người thực hiện</label>
                        <select 
                        className="modal-input" style={{width:'100%'}} 
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
                        <label style={{fontWeight: 600, display: 'block', marginBottom: 5}}>Trạng thái</label>
                        <select 
                        className="modal-input" style={{width:'100%'}} 
                        value={task.status} 
                        onChange={(e) => setTask({...task, status: e.target.value})}
                        >
                        <option value="pending">⏳ Chờ xử lý</option>
                        <option value="processing">🔥 Đang làm</option>
                        <option value="completed">✅ Hoàn thành</option>
                        </select>
                    </div>
                </div>  

                <div className="modal-row" style={{display: 'flex', gap: 15, marginBottom: 15}}>
                    <div style={{flex: 1}}>
                        <label style={{fontWeight: 600, display: 'block', marginBottom: 5}}>Độ ưu tiên</label>
                        <select 
                        className="modal-input" style={{width:'100%'}} 
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
                        <label style={{fontWeight: 600, display: 'block', marginBottom: 5}}>Hạn chót</label>
                        <input 
                        type="date" className="modal-input" style={{width: '100%'}}
                        value={formatDate(task.deadline)} 
                        onChange={(e) => setTask({...task, deadline: e.target.value})} 
                        disabled={!canEdit}
                        />
                    </div>
                </div>

                <div style={{marginBottom: 15}}>
                    <label style={{fontWeight: 600, display: 'block', marginBottom: 5}}>Mô tả chi tiết</label>
                    <textarea 
                    className="modal-input" rows="6" style={{width: '100%', resize: 'vertical'}}
                    placeholder="Nhập mô tả..." 
                    value={task.description || ''} 
                    onChange={(e) => setTask({...task, description: e.target.value})}
                    disabled={!canEdit}
                    />
                </div>
            </div>

            {/* --- CỘT PHẢI: HOẠT ĐỘNG & BÌNH LUẬN (40%) --- */}
            <div style={{flex: 4, display: 'flex', flexDirection: 'column', background: '#f9fafb'}}>
                <div style={{padding: '15px', borderBottom: '1px solid #eee', background: '#fff'}}>
                    <h4 style={{margin: 0, color: '#44546f'}}>💬 Thảo luận</h4>
                </div>

                {/* Danh sách Comment */}
                <div style={{flex: 1, padding: '15px', overflowY: 'auto'}}>
                    {comments.length === 0 ? (
                        <div style={{textAlign: 'center', color: '#999', marginTop: 20, fontSize: 13}}>Chưa có bình luận nào.</div>
                    ) : (
                        comments.map((cmt, index) => (
                            <div key={cmt.id || index} style={{marginBottom: 15, display: 'flex', gap: 10}}>
                                {/* Avatar */}
                                <div style={{width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0}}>
                                    {cmt.user_avatar ? (
                                        <img src={`${API_URL}${cmt.user_avatar}`} alt="Avt" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                                    ) : (
                                        <FaUserCircle size={32} color="#ccc" />
                                    )}
                                </div>
                                {/* Nội dung */}
                                <div style={{flex: 1}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2}}>
                                        <span style={{fontWeight: 600, fontSize: 13, color: '#172b4d'}}>{cmt.user_name}</span>
                                        <span style={{fontSize: 11, color: '#6b778c'}}>{formatDateTime(cmt.created_at)}</span>
                                    </div>
                                    <div style={{background: '#fff', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: 14, color: '#172b4d', border: '1px solid #eee'}}>
                                        {cmt.content}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={commentsEndRef} />
                </div>

                {/* Ô nhập Comment */}
                <div style={{padding: '15px', background: '#fff', borderTop: '1px solid #eee'}}>
                    <div style={{display: 'flex', gap: 10}}>
                        <input 
                            type="text" 
                            placeholder="Viết bình luận..." 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                            style={{flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none'}}
                        />
                        <button 
                          onClick={handleSendComment}
                          disabled={!newComment.trim()} 
                          style={{
                              background: 'transparent', 
                              border: 'none', 
                              color: newComment.trim() ? '#0052cc' : '#ccc', 
                              padding: '8px 12px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              cursor: newComment.trim() ? 'pointer' : 'default',
                              transition: 'color 0.2s'
                          }}
                      >
                          <FaPaperPlane size={18} style={{transform: 'translateX(-2px)'}} /> 
                      </button>
                    </div>
                </div>
            </div>

        </div>

        {/* FOOTER */}
        <div className="modal-actions" style={{padding: '15px 20px', borderTop: '1px solid #eee', justifyContent: 'flex-end', background: '#fff'}}>
          <button onClick={onClose} className="modal-btn modal-cancel" style={{marginRight: 10}}>Đóng</button>
          <button onClick={onSubmit} className="modal-btn modal-save">Lưu</button>
        </div>
      </div>
    </div>
  );
}