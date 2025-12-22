import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import io from 'socket.io-client'; 

export default function MembersModal({
    isOpen,
    onClose,
    projectId,
    API_URL
}) {
    const [members, setMembers] = useState([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [memberToRemove, setMemberToRemove] = useState(null);
    
    // Lấy thông tin người đang đăng nhập để check quyền hiển thị
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;

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
            // Thêm timestamp để tránh cache trình duyệt
            const res = await authenticatedFetch(`${API_URL}/api/projects/${projectId}/members?t=${new Date().getTime()}`);
            const data = await res.json();
            if(Array.isArray(data)) setMembers(data);
        } catch(err){
            toast.error("Lỗi khi tải thành viên!");
        }
    };

    // --- 2. THÊM SOCKET ĐỂ ĐỒNG BỘ REAL-TIME ---
    useEffect(() => {
        if (!isOpen) return;
        
        fetchMembers(); 

        const socket = io(API_URL);
        
        // Lắng nghe sự kiện đổi role từ server
        socket.on('server_update_member_role', (data) => {
        
            if (data.projectId == projectId) { 
                setMembers(prevMembers => prevMembers.map(mem => 
                    mem.id == data.memberId ? { ...mem, role: data.newRole } : mem
                ));
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [isOpen, projectId, API_URL]);


    const handleInvite = async (e) => {
        e.preventDefault();
        if(!inviteEmail) {
            toast.warning("Vui lòng nhập email!");
            return;
        }

        const res = await authenticatedFetch(`${API_URL}/api/projects/${projectId}/members`, {
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

    const handleChangeRole = async (memberId, newRole) => {
        const oldMembers = [...members];
        setMembers(prevMembers => prevMembers.map(mem => 
            mem.id === memberId ? { ...mem, role: newRole } : mem
        ));

        try {
            const res = await authenticatedFetch(`${API_URL}/api/projects/${projectId}/members/${memberId}`, {
                method: 'PUT',
                body: JSON.stringify({ newRole: newRole }) 
            });

            if (res.ok) {
                toast.success("Đã cập nhật quyền!");
            } else {
                const data = await res.json();
                toast.error(data.message || "Lỗi cập nhật!");
                setMembers(oldMembers); // Hoàn tác nếu lỗi
            }
        } catch (error) {
            toast.error("Lỗi mạng!");
            setMembers(oldMembers);
        }
    };

    const handleRemove = async (member) => {
        setMemberToRemove(member);
    };

    const confirmRemove = async () => {
        if(!memberToRemove) return;
        const res = await authenticatedFetch(`${API_URL}/api/projects/${projectId}/members/${memberToRemove.id}`, {
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

    // --- LOGIC CHECK QUYỀN HIỂN THỊ ---
    // Tìm xem người đang đăng nhập (currentUser) có phải là Owner của dự án này không
    const ownerOfProject = members.find(m => m.role === 'owner');
    
    // Sử dụng String() để ép kiểu về chuỗi trước khi so sánh, tránh lỗi 1 !== "1"
    const isMeOwner = currentUser && ownerOfProject && String(currentUser.id) === String(ownerOfProject.id);
    
    console.log("=== DEBUG CHECK QUYỀN ===");
    console.log("1. User đang đăng nhập (currentUser):", currentUser);
    console.log("2. Chủ dự án (ownerOfProject):", ownerOfProject);
    console.log("3. Kết quả isMeOwner:", isMeOwner);

    return (
      <>
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <h3>Thành Viên Dự Án ({members.length})</h3>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>

            <div style={{ padding: '10px 0' }}>
                
                {/* Form mời */}
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
                        Mời 
                    </button>
                </form>

                {/* Danh sách thành viên */}
                <div style={{ maxHeight: '300px', overflowY: 'auto', borderTop: '1px solid #eee' }}>
                    {members.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>Chưa có thành viên nào.</p>
                    ) : (
                        members.map(mem => (
                            <div key={mem.id} style={{ 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                padding: '12px 0', borderBottom: '1px solid #f0f0f0' 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ 
                                        width: '36px', height: '36px', 
                                        background: '#4a80d6', color: 'white', borderRadius: '50%', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                    }}>
                                        {mem.name ? mem.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {mem.name}

                                            {/* --- HIỂN THỊ ROLE --- */}
                                            {mem.role === 'owner' ? (
                                                <span style={{fontSize:'10px', background:'#ef4444', color:'white', padding:'2px 6px', borderRadius:'4px'}}>
                                                     Owner
                                                </span>
                                            ) : (
                                                // CHỈ HIỆN DROPDOWN NẾU TÔI LÀ OWNER
                                                isMeOwner ? (
                                                    <select 
                                                        value={mem.role} 
                                                        onChange={(e) => handleChangeRole(mem.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            fontSize: '12px', padding: '2px', borderRadius: '4px', border: '1px solid #ccc',
                                                            background: mem.role === 'admin' ? '#fffbeb' : '#eff6ff',
                                                            color: mem.role === 'admin' ? '#b45309' : '#1d4ed8',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="member"> Member</option>
                                                        <option value="admin"> Admin</option>
                                                    </select>
                                                ) : (
                                                    // NẾU TÔI KHÔNG PHẢI OWNER -> CHỈ HIỆN BADGE TĨNH
                                                    mem.role === 'admin' ? (
                                                        <span style={{fontSize:'10px', background:'#f59e0b', color:'white', padding:'2px 6px', borderRadius:'4px'}}>Admin</span>
                                                    ) : (
                                                        <span style={{fontSize:'10px', background:'#3b82f6', color:'white', padding:'2px 6px', borderRadius:'4px'}}>Member</span>
                                                    )
                                                )
                                            )}
                                            {/* --------------------- */}

                                        </div>
                                        <div style={{ fontSize: '12px', color: '#888' }}>{mem.email}</div>
                                    </div>
                                </div>
                                
                                {/* Nút xóa: ẨN NẾU LÀ OWNER HOẶC TÔI KHÔNG PHẢI OWNER */}
                                {mem.role !== 'owner' && isMeOwner && (
                                    <button 
                                        onClick={() => handleRemove(mem)}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}
                                        title="Xóa thành viên"
                                    >
                                        Xóa
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="modal-btn modal-cancel">Đóng</button>
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
                <p style={{ color: '#6b7280', fontSize: '14px' }}>{memberToRemove.email}</p>
              </div>
              <div className="modal-actions">
                <button onClick={cancelRemove} className="modal-btn modal-cancel">Hủy</button>
                <button onClick={confirmRemove} className="modal-btn modal-delete-confirm">Xác nhận</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
}