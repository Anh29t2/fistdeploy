import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { FaTimes, FaPaperPlane, FaArrowLeft, FaList, FaCommentDots } from 'react-icons/fa';

export default function ChatWidget({ user, projectId, API_URL }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // State quản lý dự án
  const [currentProjectId, setCurrentProjectId] = useState(projectId || null);
  const [myProjects, setMyProjects] = useState([]); 

  const [activeTab, setActiveTab] = useState('project'); 
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [members, setMembers] = useState([]);
  const [privatePartner, setPrivatePartner] = useState(null);
  
  const socketRef = useRef();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- SỬA LỖI LỆCH GIỜ ---
  const formatTime = (dateString) => {
      if (!dateString) return "";
      
      let date;
      // Nếu chuỗi thời gian chưa có chữ 'Z' ở cuối (đặc điểm của giờ UTC), 
      // ta tự thêm vào để trình duyệt hiểu đây là giờ Quốc tế và tự cộng thêm 7 tiếng cho VN.
      if (typeof dateString === 'string' && !dateString.endsWith('Z')) {
          date = new Date(dateString + 'Z');
      } else {
          date = new Date(dateString);
      }

      // Kiểm tra nếu date bị lỗi
      if (isNaN(date.getTime())) return "";

      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // 1. KẾT NỐI SOCKET
  useEffect(() => {
    socketRef.current = io(API_URL, { transports: ['websocket'] });
    socketRef.current.emit('register_user', user.id);

    socketRef.current.on('receive_message', (newMsg) => {
        // Khi nhận tin nhắn mới, dùng new Date().toISOString() để đảm bảo có format chuẩn ngay lập tức
        const msgWithTime = { ...newMsg, created_at: newMsg.created_at || new Date().toISOString() };
        setMessages((prev) => [...prev, msgWithTime]);
        setTimeout(scrollToBottom, 100);
    });

    return () => socketRef.current.disconnect();
  }, [API_URL, user.id]);

  // 2. JOIN PROJECT
  useEffect(() => {
      if (projectId) setCurrentProjectId(projectId);
      if (currentProjectId && socketRef.current) {
          socketRef.current.emit('join_project', currentProjectId);
          fetchMessagesAndMembers(); 
      }
  }, [currentProjectId, projectId]);

  // 3. FETCH PROJECTS (HOME)
  useEffect(() => {
      if (isOpen && !projectId) {
          const token = localStorage.getItem('access_token');
          fetch(`${API_URL}/api/projects?user_id=${user.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(res => res.json())
          .then(data => { if(Array.isArray(data)) setMyProjects(data); })
          .catch(err => console.error(err));
      }
  }, [isOpen, projectId, API_URL, user.id]);

  const fetchMessagesAndMembers = () => {
      if (!currentProjectId) return;
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      fetch(`${API_URL}/api/messages/project/${currentProjectId}`, { headers })
        .then(res => res.json())
        .then(data => { if(Array.isArray(data)) setMessages(data); setTimeout(scrollToBottom, 100); });

      fetch(`${API_URL}/api/projects/${currentProjectId}/members`, { headers })
        .then(res => res.json())
        .then(data => { if(Array.isArray(data)) setMembers(data.filter(m => m.id !== user.id)); });
  };

  const startPrivateChat = (partner) => {
      setPrivatePartner(partner);
      const token = localStorage.getItem('access_token');
      fetch(`${API_URL}/api/messages/private/${partner.id}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
      })
      .then(res => res.json())
      .then(data => { if(Array.isArray(data)) setMessages(data); setTimeout(scrollToBottom, 100); });
  };

  const handleSend = () => {
      if (!inputMsg.trim() || !currentProjectId) return;
      const msgData = {
          senderId: user.id,
          content: inputMsg,
          senderName: user.name, 
          projectId: (activeTab === 'project' && !privatePartner) ? currentProjectId : null,
          receiverId: privatePartner ? privatePartner.id : null,
          created_at: new Date().toISOString() // Gửi kèm giờ chuẩn ISO
      };
      socketRef.current.emit('send_message', msgData);
      setInputMsg("");
  };

  return (
    <>
      <button className="chat-widget-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <FaTimes size={24} /> : <FaCommentDots size={28} />}
      </button>

      {isOpen && (
        <div className="chat-window">
          
          {/* HEADER 3 CỘT (Căn chỉnh chuẩn) */}
          <div className="chat-header" style={{display: 'flex', flexDirection: 'column', padding: '15px 15px 0 15px'}}>
             <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '10px'}}>
                
                {/* TRÁI: Nút Back */}
                <div style={{width: '30px', display: 'flex', justifyContent: 'flex-start'}}>
                    {!projectId && currentProjectId ? (
                         <button onClick={() => { setCurrentProjectId(null); setPrivatePartner(null); }} style={{background:'none', border:'none', cursor:'pointer', color:'#333', fontSize:'16px'}}>
                             <FaList title="Danh sách dự án" />
                         </button>
                    ) : privatePartner ? (
                         <button onClick={() => { setPrivatePartner(null); setActiveTab('members'); }} style={{background:'none', border:'none', cursor:'pointer', color:'#333', fontSize:'16px'}}>
                             <FaArrowLeft title="Quay lại" />
                         </button>
                    ) : null}
                </div>

                {/* GIỮA: Tiêu đề */}
                <div style={{flex: 1, textAlign: 'center'}}>
                    <h4 style={{margin: 0, fontSize: '16px', color: '#333'}}>
                        {!currentProjectId ? "Chọn dự án" : (privatePartner ? privatePartner.name : "Tin Nhắn")}
                    </h4>
                </div>

                {/* PHẢI: Nút Đóng (X) */}
                <div style={{width: '30px', display: 'flex', justifyContent: 'flex-end'}}>
                    <button onClick={() => setIsOpen(false)} style={{background:'none', border:'none', cursor:'pointer', color:'#f31818ff', fontSize:'16px'}} title="Đóng chat">
                        <FaTimes />
                    </button>
                </div>
             </div>

             {/* Tabs */}
             {currentProjectId && !privatePartner && (
                <div className="chat-tabs" style={{display: 'flex', width: '100%', borderBottom: '1px solid #eee'}}>
                    <button className={`chat-tab ${activeTab === 'project' ? 'active' : ''}`} onClick={() => setActiveTab('project')} style={{flex: 1, padding: '8px', background: activeTab === 'project' ? '#e6f0ff' : 'transparent', border: 'none', color: activeTab === 'project' ? '#0052cc' : '#666', cursor: 'pointer', fontWeight: activeTab === 'project' ? 'bold' : 'normal', borderBottom: activeTab === 'project' ? '2px solid #0052cc' : 'none'}}>Chung</button>
                    <button className={`chat-tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')} style={{flex: 1, padding: '8px', background: activeTab === 'members' ? '#e6f0ff' : 'transparent', border: 'none', color: activeTab === 'members' ? '#0052cc' : '#666', cursor: 'pointer', fontWeight: activeTab === 'members' ? 'bold' : 'normal', borderBottom: activeTab === 'members' ? '2px solid #0052cc' : 'none'}}>Thành viên</button>
                </div>
             )}
          </div>

          {/* BODY */}
          <div className="chat-body" style={{flex: 1, overflowY: 'auto', padding: '10px'}}>
            {!currentProjectId ? (
                <div>
                    {myProjects.length > 0 ? (
                        myProjects.map(p => (
                            <div key={p.id} onClick={() => setCurrentProjectId(p.id)} style={{padding:'12px', borderBottom:'1px solid #eee', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px'}}>
                                <div style={{width:'36px', height:'36px', background:'#eee', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>📂</div>
                                <div><div style={{fontWeight:'bold', fontSize:'14px'}}>{p.name}</div></div>
                            </div>
                        ))
                    ) : (<p style={{textAlign:'center', color:'#999', marginTop:'20px'}}>Chưa có dự án nào.</p>)}
                </div>
            ) : (
                <>
                    {!privatePartner && activeTab === 'members' ? (
                        members.map(mem => (
                            <div key={mem.id} className="member-item" onClick={() => startPrivateChat(mem)} style={{padding:'10px', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px'}}>
                                <div className="member-avatar" style={{width:'32px', height:'32px', background:'#0052cc', color:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>{mem.name.charAt(0).toUpperCase()}</div>
                                <div style={{fontWeight:'bold'}}>{mem.name}</div>
                            </div>
                        ))
                    ) : (
                        messages.filter(msg => {
                            if (privatePartner) {
                                return (String(msg.sender_id) === String(privatePartner.id) && String(msg.receiver_id) === String(user.id)) || 
                                       (String(msg.sender_id) === String(user.id) && String(msg.receiver_id) === String(privatePartner.id)) ||
                                       (String(msg.senderId) === String(privatePartner.id) && String(msg.receiverId) === String(user.id)) || 
                                       (String(msg.senderId) === String(user.id) && String(msg.receiverId) === String(privatePartner.id));
                            } else {
                                return (msg.project_id == currentProjectId || msg.projectId == currentProjectId) && !msg.receiver_id && !msg.receiverId;
                            }
                        }).map((msg, index) => {
                            // Ép kiểu về String để so sánh chính xác 100%
                            const isMine = String(msg.sender_id) === String(user.id) || String(msg.senderId) === String(user.id);
                            
                            return (
                                <div key={index} className={`message-bubble ${isMine ? 'mine' : 'other'}`}>
                                    {!isMine && <span className="message-sender">{msg.sender_name || msg.senderName}</span>}
                                    
                                    <div>{msg.content}</div>

                                    <div style={{
                                        fontSize: '10px', 
                                        marginTop: '4px', 
                                        textAlign: 'right',
                                        color: isMine ? 'rgba(255, 255, 255, 0.7)' : '#888'
                                    }}>
                                        {formatTime(msg.created_at || msg.createdAt)}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </>
            )}
          </div>

          {/* FOOTER */}
          {(currentProjectId && (activeTab === 'project' || privatePartner)) && (
              <div className="chat-footer">
                <input 
                    type="text" className="chat-input" placeholder="Nhập tin nhắn..." 
                    value={inputMsg} onChange={e => setInputMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button className="chat-send-btn" onClick={handleSend}><FaPaperPlane/></button>
              </div>
          )}
        </div>
      )}
    </>
  );
}