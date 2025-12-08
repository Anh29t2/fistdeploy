import { useState, useEffect } from 'react';
import './App.css';
import Register from './Register';
import Login from './Login';
import Home from './Home';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user_data');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false); // Báo hiệu đã tải xong
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user_data', JSON.stringify(userData));
    navigate('/projects'); 
  }

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user_data');
    navigate('/login');
  }

  // === THÊM ĐOẠN NÀY VÀO ===
  // Nếu đang tải dữ liệu cũ lên thì hiển thị màn hình chờ, chưa vẽ Router vội
  if (isLoading) {
    return <div style={{textAlign: "center", marginTop: "20%"}}>Đang tải dữ liệu...</div>;
  }
  // ==========================

  return (
    <div className="App">
      <ToastContainer position="top-right" autoClose={3000} />

      <Routes>
        <Route path="/" element={ user ? <Navigate to="/projects" /> : <Navigate to="/login" /> } />

        {/* Cải tiến: Nếu đã có user thì không cho vào trang Login nữa, đá về Projects luôn */}
        <Route path="/login" element={ user ? <Navigate to="/projects" /> : <Login onLoginSuccess={handleLoginSuccess} /> } />

        <Route path="/register" element={ <Register /> } />

        <Route path="/home" element={ user ? <Home user={user} onLogout={handleLogout} /> : <Navigate to="/login" /> } />

        <Route path="/projects" element={ user ? <Projects user={user} onLogout={handleLogout} /> : <Navigate to="/login" /> } />

        <Route path="/projects/:projectId" element={ user ? <ProjectDetail user={user} onLogout={handleLogout} /> : <Navigate to="/login" /> } />
      </Routes>
    </div>
  );
}

export default App;