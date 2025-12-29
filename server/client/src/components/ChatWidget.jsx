import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify'; // Import Toast
import { FaTimes, FaPaperPlane, FaArrowLeft, FaCommentDots } from 'react-icons/fa';

export default function ChatWidget({ user, projectId, API_URL }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // State giao diện
  const [currentProjectId, setCurrentProjectId] = useState(projectId || null);
  const [myProjects, setMyProjects] = useState([]); 
  const [activeTab, setActiveTab] = useState('project'); // 'project' | 'members'
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [members, setMembers] = useState([]);
  const [privatePartner, setPrivatePartner] = useState(null);
  
  const socketRef = useRef();
  const messagesEndRef = useRef(null);

  // Giúp socket đọc được giá trị mới nhất mà không cần reconnect
  const stateRef = useRef({ isOpen, currentProjectId, privatePartner, user, myProjects });

  // Cập nhật Ref mỗi khi State thay đổi
  useEffect(() => {
      stateRef.current = { isOpen, currentProjectId, privatePartner, user, myProjects };
  }, [isOpen, currentProjectId, privatePartner, user, myProjects]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

    const formatTime = (dateString) => {
      if (!dateString) return "";
      let date;
      if (typeof dateString === 'string' && !dateString.endsWith('Z')) {
          date = new Date(dateString + 'Z');
      } else {
          date = new Date(dateString);
      }
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Auto scroll khi có tin nhắn mới hoặc mở tab
  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, activeTab, privatePartner, isOpen]);

  // 1. KẾT NỐI SOCKET (CHỈ CHẠY 1 LẦN DUY NHẤT KHI MOUNT)
  useEffect(() => {
    if (!user?.id) return;

    // Khởi tạo kết nối
    socketRef.current = io(API_URL, { transports: ['websocket'] });
    
    // Đăng ký user
    socketRef.current.emit('register_user', String(user.id));

    // Lắng nghe tin nhắn (Xử lý cả Chat & Toast ở đây)
    socketRef.current.on('receive_message', (newMsg) => {
        const { isOpen, currentProjectId, privatePartner, user, myProjects } = stateRef.current;
        const msgWithTime = { ...newMsg, created_at: newMsg.created_at || new Date().toISOString() };

        // Logic kiểm tra: Tin nhắn này có thuộc về màn hình chat đang mở không?
        let isRelevant = false;

        // TH1: Đang chat riêng
        if (privatePartner) {
            isRelevant = 
                (String(newMsg.senderId) === String(privatePartner.id)) || 
                (String(newMsg.senderId) === String(user.id) && String(newMsg.receiverId) === String(privatePartner.id));
        } 
        // TH2: Đang chat chung dự án
        else if (currentProjectId) {
            // Tin nhắn phải thuộc project này VÀ không phải tin nhắn riêng
            isRelevant = (String(newMsg.projectId) === String(currentProjectId)) && !newMsg.receiverId;
        }

        // QUYẾT ĐỊNH: Update State hay hiện Toast
        if (isOpen && isRelevant) {
            // Nếu đang mở đúng cửa sổ -> Thêm vào list
            setMessages((prev) => [...prev, msgWithTime]);
            setTimeout(scrollToBottom, 100);
        } else {
            // Nếu đang đóng, hoặc đang chat người khác -> Hiện Toast
            if (String(newMsg.senderId) !== String(user.id)) {
                if(newMsg.projectId){
                    const project = myProjects.find(p => String(p.id) === String(newMsg.projectId));
                    const projectName = project ? project.name : 'nhóm dự án';
                    toast.info(` ${newMsg.senderName || 'Ai đó'} đã nhắn tin trong ${projectName}`, {
                        position: "top-right",
                        autoClose: 4000,
                        toastId: `msg-${newMsg.id || new Date().getTime()}` // Tránh trùng lặp
                    });
                } else {
                toast.info(` ${newMsg.senderName || 'Ai đó'} đã nhắn tin cho bạn`, {
                    position: "top-right",
                    autoClose: 4000,
                    toastId: `msg-${newMsg.id || new Date().getTime()}` // Tránh trùng lặp
                });
            }
        }
    }
    });

    return () => {
        socketRef.current.disconnect();
    };
  }, [API_URL, user.id]); // Chỉ phụ thuộc vào user.id

  // 2. LOGIC JOIN ROOM KHI ĐỔI DỰ ÁN (KHÔNG CẦN DISCONNECT SOCKET)
  useEffect(() => {
      if (projectId) setCurrentProjectId(projectId);

      if (currentProjectId) {
          // Gửi sự kiện tham gia phòng project
          if(socketRef.current) {
            socketRef.current.emit('join_project', currentProjectId);
          }
          
          // Reset và tải lại dữ liệu nếu không phải chat riêng
          if (!privatePartner) {
             setMessages([]); 
             fetchMessagesAndMembers(); 
          }
      }
  }, [currentProjectId, projectId, privatePartner]); // Bỏ socketRef ra khỏi dependency

  // Hàm tải dữ liệu
  const fetchMessagesAndMembers = async () => {
      if (!currentProjectId) return;
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        // Lấy tin nhắn chung
        const msgRes = await fetch(`${API_URL}/api/messages/project/${currentProjectId}`, { headers });
        const msgData = await msgRes.json();
        if(Array.isArray(msgData)) {
             setMessages(msgData); 
             setTimeout(scrollToBottom, 100);
        }

        // Lấy thành viên
        const memRes = await fetch(`${API_URL}/api/projects/${currentProjectId}/members`, { headers });
        const memData = await memRes.json();
        if(Array.isArray(memData)) setMembers(memData.filter(m => m.id !== user.id));
      } catch (err) {
          console.error("Lỗi tải chat:", err);
      }
  };

  // 3. FETCH PROJECT LIST KHI MỞ WIDGET TỪ TRANG HOME
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

  const startPrivateChat = (partner) => {
    setMessages([]);
    setPrivatePartner(partner);
    
    // Gọi API lấy tin nhắn riêng
    const token = localStorage.getItem('access_token');
    fetch(`${API_URL}/api/messages/private/${partner.id}`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    })
    .then(res => res.json())
    .then(data => { if(Array.isArray(data)) setMessages(data); setTimeout(scrollToBottom, 100); });
  };

  const handleSend = () => {
      if (!inputMsg.trim()) return;
      
      const msgData = {
          senderId: user.id,
          content: inputMsg,
          senderName: user.name, 
          projectId: (privatePartner) ? null : currentProjectId,
          receiverId: privatePartner ? privatePartner.id : null,
          created_at: new Date().toISOString()
      };
      
      // Chỉ Gửi lên server
      socketRef.current.emit('send_message', msgData);
      
      // Chỉ Reset ô nhập liệu (Việc hiện tin nhắn để Socket lo)
      setInputMsg("");
  };

  const handleBack = () => {
      if (privatePartner) {
          setPrivatePartner(null);
          setActiveTab('members');
          // useEffect số 2 sẽ tự chạy để load lại tin nhắn chung
      } else {
          setCurrentProjectId(null);
      }
  };

  return (
    <>
      <button className="chat-widget-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <FaTimes size={24} /> : <FaCommentDots size={28} />}
      </button>

      {isOpen && (
        <div className="chat-window">
          
          {/* HEADER */}
          <div className="chat-header" style={{display: 'flex', flexDirection: 'column', padding: '15px 15px 0 15px'}}>
             <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '10px'}}>
                
                <div style={{width: '30px', display: 'flex', justifyContent: 'flex-start'}}>
                    {(privatePartner || (!projectId && currentProjectId)) && (
                         <button onClick={handleBack} style={{background:'none', border:'none', cursor:'pointer', color:'#333', fontSize:'16px'}} title="Quay lại">
                             <FaArrowLeft />
                         </button>
                    )}
                </div>

                <div style={{flex: 1, textAlign: 'center'}}>
                    <h4 style={{margin: 0, fontSize: '16px', color: '#333'}}>
                        {!currentProjectId ? "Danh sách dự án" : (privatePartner ? `💬 ${privatePartner.name}` : `📂 Chat Nhóm`)}
                    </h4>
                </div>

                <div style={{width: '30px', display: 'flex', justifyContent: 'flex-end'}}>
                    <button onClick={() => setIsOpen(false)} style={{background:'none', border:'none', cursor:'pointer', color:'#f31818ff', fontSize:'16px'}} title="Đóng chat">
                        <FaTimes />
                    </button>
                </div>
             </div>

             {/* TABS (Chỉ hiện khi ở trong Project và chưa chat riêng) */}
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
                // LIST DỰ ÁN
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
                    {/* LIST THÀNH VIÊN */}
                    {!privatePartner && activeTab === 'members' ? (
                        members.map(mem => (
                            <div key={mem.id} className="member-item" onClick={() => startPrivateChat(mem)} style={{padding:'10px', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', borderBottom: '1px solid #f0f0f0'}}>
                                <div className="member-avatar" style={{width:'32px', height:'32px', background:'#0052cc', color:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>{mem.name.charAt(0).toUpperCase()}</div>
                                <div style={{fontWeight:'bold'}}>{mem.name}</div>
                                <div style={{marginLeft: 'auto', fontSize:'12px', color:'#888'}}>Nhắn tin</div>
                            </div>
                        ))
                    ) : (
                        // DANH SÁCH TIN NHẮN
                        messages.map((msg, index) => {
                            const isMine = String(msg.senderId || msg.sender_id) === String(user.id);
                            return (
                                <div key={index} className={`message-bubble ${isMine ? 'mine' : 'other'}`}>
                                    {!isMine && (activeTab === 'project' && !privatePartner) && (
                                        <span className="message-sender">{msg.senderName || msg.sender_name}</span>
                                    )}
                                    <div style={{wordBreak: 'break-word'}}>{msg.content}</div>
                                    <div style={{fontSize: '10px', marginTop: '4px', textAlign: 'right', opacity: 0.7}}>
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

          {/* FOOTER - INPUT */}
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