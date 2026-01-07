import React, { useState, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

// Import dayjs từ utils
import dayjs from '../utils/dayjs';

export default function Notification({ user, API_URL }) {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // --- HÀM XỬ LÝ THỜI GIAN (FIX LỖI 7 TIẾNG) ---
    // const formatNotifTime = (dateString) => {
    //     if (!dateString) return "";

    //     // 1. Logic quan trọng nhất: Thêm 'Z' để ép thành giờ UTC
    //     // Nếu chuỗi từ DB (ví dụ "2026-01-07 08:00:00") thiếu 'Z', ta tự thêm vào.
    //     // Kết quả thành "2026-01-07 08:00:00Z" -> Trình duyệt hiểu là UTC -> Tự cộng 7 tiếng -> Đúng giờ VN.
    //     let normalized = dateString;
    //     if (typeof dateString === 'string') {
    //          normalized = dateString.replace(" ", "T"); // Thay khoảng trắng bằng T cho chuẩn ISO
    //          if (!normalized.endsWith("Z")) {
    //              normalized += "Z";
    //          }
    //     }

    //     // 2. Tạo đối tượng dayjs từ chuỗi đã chuẩn hóa
    //     const date = dayjs(normalized);
    //     const now = dayjs();

    //     // 3. Logic hiển thị: Cùng ngày thì hiện giờ, khác ngày hiện ngày tháng
    //     if (date.isSame(now, 'day')) {
    //         return date.fromNow(); // "Vừa xong", "5 phút trước"
    //     } else {
    //         return date.format('HH:mm DD/MM'); // "14:30 07/01"
    //     }
    // };
    const formatNotifTime = (dateString) => {
    if (!dateString) return "";
    // Chuẩn hóa: thay khoảng trắng bằng 'T', và đảm bảo kết thúc bằng 'Z' nếu chưa có.
    let normalized = dateString;
    if (typeof dateString === 'string') {
        normalized = dateString.replace(" ", "T");
        if (!normalized.endsWith("Z")) {
            normalized += "Z";
        }
    }

    // Sửa ở đây: dùng dayjs.utc() để parse chuỗi đã được chuẩn hóa (có 'Z')
    const date = dayjs.utc(normalized); // <-- Sửa thành dayjs.utc()
    // Chuyển về múi giờ local để so sánh với 'now' (cũng là local)
    const dateLocal = date.local();

    const now = dayjs(); // now là local time

    if (dateLocal.isSame(now, 'day')) {
        const result = dateLocal.fromNow();
        return result;
    } else {
        const result = dateLocal.format('HH:mm DD/MM');
        return result;
    }
};
    // -----------------------------------------------------------

    useEffect(() => {
        if (!user?.id) return;
        const token = localStorage.getItem('access_token');
        
        fetch(`${API_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => { if(Array.isArray(data)) setNotifications(data); })
        .catch(err => console.error("Lỗi notification:", err));

        const socket = io(API_URL);
        socket.emit('register_user', String(user.id));
        
        socket.on('new_notification', (newNotif) => {
            setNotifications(prev => [newNotif, ...prev]);
            toast.info(`🔔 ${newNotif.content}`);
        });

        return () => socket.disconnect();
    }, [user?.id, API_URL]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleBellClick = () => {
        setShowDropdown(!showDropdown);
        if (!showDropdown && unreadCount > 0) {
            const token = localStorage.getItem('access_token');
            setNotifications(prev => prev.map(n => ({...n, is_read: 1}))); 
            fetch(`${API_URL}/api/notifications/read-all`, { 
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
    };

    return (
        <div style={{position: 'relative', cursor: 'pointer', marginLeft:'5px'}} onClick={handleBellClick}>
            <div style={{
                width: '40px', height: '40px', 
                background: showDropdown ? '#e6f0ff' : 'white', 
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid #ddd', transition: 'all 0.2s'
            }}>
                 <FaBell size={20} color={showDropdown ? '#0052cc' : '#555'} />
            </div>
            
            {unreadCount > 0 && (
                <span style={{
                    position: 'absolute', top: -2, right: -2,
                    background: '#e05d5d', color: 'white', fontSize: '10px', fontWeight: 'bold',
                    width: '18px', height: '18px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white'
                }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}

            {showDropdown && (
                <div style={{
                    position: 'absolute', right: 0, top: 50, width: '320px', 
                    background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    borderRadius: '12px', zIndex: 1000, overflow: 'hidden', border: '1px solid #eee'
                }} onClick={(e) => e.stopPropagation()}>
                    <div style={{padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: '15px', color:'#333', background:'#fafafa'}}>
                        Thông báo
                    </div>
                    <div style={{maxHeight: '350px', overflowY: 'auto'}}>
                        {notifications.length === 0 ? (
                            <p style={{padding: '30px', textAlign: 'center', color: '#999', fontSize: '13px'}}>Chưa có thông báo nào</p>
                        ) : (
                            notifications.map((notif, idx) => (
                                <div key={idx} 
                                     onClick={() => {
                                         if (notif.link) { 
                                             navigate(notif.link); 
                                             setShowDropdown(false); 
                                         }
                                     }}
                                     style={{
                                        padding: '12px 16px', 
                                        borderBottom: '1px solid #f5f5f5',
                                        background: notif.is_read ? 'white' : '#f0f7ff',
                                        cursor: 'pointer',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px'
                                     }}
                                     onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                     onMouseLeave={(e) => e.currentTarget.style.background = notif.is_read ? 'white' : '#f0f7ff'}
                                >
                                    <div style={{flex: 1, fontSize: '13px', color: '#333', lineHeight: '1.4'}}>
                                        {notif.content}
                                    </div>
                                    <div style={{fontSize: '11px', color: '#999', whiteSpace: 'nowrap', marginTop: '2px'}}>
                                        {formatNotifTime(notif.created_at)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}