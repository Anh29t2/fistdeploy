import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { FaCommentDots, FaTimes, FaPaperPlane, FaUsers, FaArrowLeft } from 'react-icons/fa';

export default function ChatWidget({ user, projectId, API_URL }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('project'); // 'project' | 'members'
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [members, setMembers] = useState([]);
  const [privatePartner, setPrivatePartner] = useState(null); // Người đang chat riêng
  
  const socketRef = useRef();
  const messagesEndRef = useRef(null);

  // Helper: Cuộn xuống cuối tin nhắn
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Kết nối Socket & Lấy Member khi component load
  useEffect(() => {
    socketRef.current = io(API_URL);

    // Join các phòng
    socketRef.current.emit('register_user', user.id);
    if (projectId) {
      socketRef.current.emit('join_project', projectId);
    }

    // Lắng nghe tin nhắn đến
    socketRef.current.on('receive_message', (newMsg) => {
        setMessages((prev) => {
            // TH1: Nếu đang ở tab Chung và tin nhắn này có projectId (Chat chung) -> Hiện
            if (activeTab === 'project' && newMsg.projectId == projectId && !newMsg.receiverId) {
                return [...prev, newMsg];
            }
            
            // TH2: Nếu đang chat Private và tin nhắn này đúng người (Chat riêng) -> Hiện
            if (privatePartner && 
               ((newMsg.senderId === privatePartner.id && newMsg.receiverId === user.id) || 
                (newMsg.senderId === user.id && newMsg.receiverId === privatePartner.id))) {
                return [...prev, newMsg];
            }
            return prev;
        });
        setTimeout(scrollToBottom, 100);
    });

    return () => socketRef.current.disconnect();
  }, [projectId, user.id, activeTab, privatePartner, API_URL]);

  // 2. Fetch dữ liệu khi chuyển Tab
  useEffect(() => {
    if (!isOpen) return;

    const token = localStorage.getItem('access_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    if (activeTab === 'project' && !privatePartner) {
        // Lấy tin nhắn dự án
        fetch(`${API_URL}/api/messages/project/${projectId}`, { headers })
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) setMessages(data);
                setTimeout(scrollToBottom, 100);
            })
            .catch(err => console.error("Lỗi tải tin nhắn:", err));
    } else if (activeTab === 'members') {
        // --- SỬA Ở ĐÂY: Thêm /api vào đường dẫn ---
        fetch(`${API_URL}/api/projects/${projectId}/members`, { headers })
            .then(res => res.json())
            .then(data => {
                // Lọc bỏ chính mình
                if(Array.isArray(data)) setMembers(data.filter(m => m.id !== user.id));
            })
            .catch(err => console.error("Lỗi tải thành viên:", err));
    }
  }, [isOpen, activeTab, projectId, privatePartner, API_URL, user.id]);

  // 3. Khi chọn Chat Riêng với 1 người
  const startPrivateChat = (partner) => {
      setPrivatePartner(partner);
      const token = localStorage.getItem('access_token');
      // Lấy lịch sử chat riêng
      fetch(`${API_URL}/api/messages/private/${partner.id}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
      })
      .then(res => res.json())
      .then(data => {
          if(Array.isArray(data)) setMessages(data);
          setTimeout(scrollToBottom, 100);
      })
      .catch(err => console.error("Lỗi tải tin nhắn riêng:", err));
  };

  // 4. Gửi tin nhắn
  const handleSend = () => {
      if (!inputMsg.trim()) return;

      const msgData = {
          senderId: user.id,
          content: inputMsg,
          senderName: user.name, 
          // Logic: Nếu đang chat riêng thì projectId phải là null
          projectId: (activeTab === 'project' && !privatePartner) ? projectId : null,
          receiverId: privatePartner ? privatePartner.id : null
      };

      // Gửi qua Socket
      socketRef.current.emit('send_message', msgData);
      
      setInputMsg("");
  };

  return (
    <>
      {/* Nút Mở Chat */}
      <button className="chat-widget-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <FaTimes /> : <FaCommentDots />}
      </button>

      {/* Cửa Sổ Chat */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div>
                {privatePartner ? (
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <button onClick={() => { setPrivatePartner(null); setActiveTab('members'); }} style={{border:'none', background:'none', cursor:'pointer'}}><FaArrowLeft/></button>
                        <h4 style={{margin:0}}>{privatePartner.name}</h4>
                    </div>
                ) : (
                    <h4 style={{margin:0}}>Thảo luận</h4>
                )}
            </div>
            
            {/* Tabs chọn chế độ (Chỉ hiện khi ko chat riêng) */}
            {!privatePartner && (
                <div className="chat-tabs">
                    <button 
                        className={`chat-tab ${activeTab === 'project' ? 'active' : ''}`}
                        onClick={() => setActiveTab('project')}
                    >
                        Chung
                    </button>
                    <button 
                        className={`chat-tab ${activeTab === 'members' ? 'active' : ''}`}
                        onClick={() => setActiveTab('members')}
                    >
                        <FaUsers/> Thành viên
                    </button>
                </div>
            )}
          </div>

          {/* Body */}
          <div className="chat-body">
            {/* TRƯỜNG HỢP 1: Hiện danh sách thành viên */}
            {!privatePartner && activeTab === 'members' ? (
                members.length > 0 ? (
                    members.map(mem => (
                        <div key={mem.id} className="member-item" onClick={() => startPrivateChat(mem)}>
                            <div className="member-avatar">{mem.name.charAt(0).toUpperCase()}</div>
                            <div>
                                <div style={{fontWeight:'bold'}}>{mem.name}</div>
                                <div style={{fontSize:'12px', color:'#888'}}>{mem.email}</div>
                            </div>
                        </div>
                    ))
                ) : ( <p style={{textAlign:'center', color:'#888', marginTop:'20px'}}>Chưa có thành viên nào khác.</p> )
            ) : (
                /* TRƯỜNG HỢP 2: Hiện tin nhắn (Chung hoặc Riêng) */
                messages.map((msg, index) => {
                    const isMine = msg.sender_id === user.id || msg.senderId === user.id;
                    return (
                        <div key={index} className={`message-bubble ${isMine ? 'mine' : 'other'}`}>
                            {!isMine && <span className="message-sender">{msg.sender_name || msg.senderName}</span>}
                            {msg.content}
                        </div>
                    );
                })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer: Nhập liệu (Chỉ hiện khi không ở tab danh sách thành viên) */}
          {(activeTab === 'project' || privatePartner) && (
              <div className="chat-footer">
                <input 
                    type="text" 
                    className="chat-input" 
                    placeholder="Nhập tin nhắn..." 
                    value={inputMsg}
                    onChange={e => setInputMsg(e.target.value)}
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