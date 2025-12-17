import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
export default function MembersModal({
    isOpen,
    onClose,
    projectId,
    API_URL
}) {
    const [members, setMembers] = useState([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [memberToRemove, setMemberToRemove] = useState(null);
    
    const authenticatedFetch = async (url, options = {}) => {
        const token = localStorage.getItem('access_token');
        return fetch(url,{
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
    };
    const fetchMembers = async () => {
        try {
            const res = await authenticatedFetch(`${API_URL}/projects/${projectId}/members`);
            const data = await res.json();
            if(Array.isArray(data)) setMembers(data);
        }catch(err){
            toast.error("Lỗi khi tải thành viên!");
        }
    };
    useEffect(() => {
        if(isOpen) fetchMembers();
    }, [isOpen, projectId]);
    
    const handleInvite = async (e) => {
        e.preventDefault();
        if(!inviteEmail) {
            toast.warning("Vui lòng nhập email!");
            return;
        }

        const res = await authenticatedFetch(`${API_URL}/projects/${projectId}/members`, {
            method: 'POST',
            body: JSON.stringify({ email: inviteEmail })
        });
        const data = await res.json();
        if(res.ok) {
            toast.success("Mời thành viên thành công!");
            setInviteEmail("");
            fetchMembers();
        } else {
            toast.error("Lỗi: " + (data.message || data.error));
        }
    };
    const handleRemove = async (member) => {
        setMemberToRemove(member);
    };

    const confirmRemove = async () => {
        if(!memberToRemove) return;
        const res = await authenticatedFetch(`${API_URL}/projects/${projectId}/members/${memberToRemove.id}`, {
            method: 'DELETE'
        });
        if(res.ok) {
            toast.success("Xóa thành viên thành công!");
            setMemberToRemove(null);
            fetchMembers();
        } else {
            toast.error("Lỗi khi xóa thành viên!");
            setMemberToRemove(null);
        }
    };

    const cancelRemove = () => {
        setMemberToRemove(null);
    };

    if(!isOpen) return null;

    return (
      <>
        {/* Modal thành viên chính */}
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="modal-header">
              <h3>Thành Viên Dự Án ({members.length})</h3>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: '10px 0' }}>
                
                {/* Form mời - Dùng class 'form-group' và 'modal-input' */}
                <form onSubmit={handleInvite} className="form-group" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <input 
                        type="email" 
                        className="modal-input" 
                        placeholder="Nhập email thành viên..."
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="modal-btn modal-save" style={{ width: 'auto', padding: '0 20px' , height: '36px'}}>
                        Mời +
                    </button>
                </form>

                {/* Danh sách thành viên */}
                <div style={{ maxHeight: '300px', overflowY: 'auto', borderTop: '1px solid #eee' }}>
                    {members.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>Chưa có thành viên nào.</p>
                    ) : (
                        members.map(mem => (
                            <div key={mem.id} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                
                                padding: '12px 0', 
                                borderBottom: '1px solid #f0f0f0' 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {/* Avatar */}
                                    <div style={{ 
                                        width: '36px', height: '36px', 
                                        background: '#4a80d6ff', color: 'white', 
                                        borderRadius: '50%', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        fontWeight: 'bold'
                                    }}>
                                        {mem.name ? mem.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#333' }}>{mem.name}</div>
                                        <div style={{ fontSize: '12px', color: '#888' }}>{mem.email}</div>
                                    </div>
                                </div>
                                
                                {/* Nút xóa */}
                                <button 
                                    onClick={() => handleRemove(mem)}
                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}
                                    title="Xóa"
                                >
                                    Xóa
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="modal-btn modal-cancel">
                Đóng
              </button>
            </div>

          </div>
        </div>

        {/* Modal xác nhận xóa */}
        {memberToRemove && (
          <div className="modal-overlay" onClick={cancelRemove}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3>⚠️ Xóa Thành Viên</h3>
                <button className="modal-close" onClick={cancelRemove}>×</button>
              </div>
              
              <div style={{ padding: '20px' }}>
                <p style={{ color: '#333', marginBottom: '10px' }}>
                  Bạn có chắc muốn xóa <strong>{memberToRemove.name}</strong> khỏi dự án này?
                </p>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  {memberToRemove.email}
                </p>
              </div>

              <div className="modal-actions">
                <button onClick={cancelRemove} className="modal-btn modal-cancel">
                  Hủy
                </button>
                <button onClick={confirmRemove} className="modal-btn modal-delete-confirm">
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
}