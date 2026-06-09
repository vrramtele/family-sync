import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Users, 
  Bell, 
  LogOut, 
  User, 
  Home,
  Check,
  MessageSquare
} from 'lucide-react';
import API from './services/api';
import LoginRegister from './components/LoginRegister';
import Dashboard from './components/Dashboard';
import TodoList from './components/TodoList';
import CalendarView from './components/CalendarView';
import FamilyManager from './components/FamilyManager';
import FamilyChat from './components/FamilyChat';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('family_sync_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [token, setToken] = useState(() => {
    return localStorage.getItem('family_sync_token') || null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [familyData, setFamilyData] = useState(null);
  const [loadingFamily, setLoadingFamily] = useState(false);

  // Authenticate user login session
  const handleLogin = (userData, userToken) => {
    localStorage.setItem('family_sync_token', userToken);
    localStorage.setItem('family_sync_user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
    setActiveTab('dashboard');
  };

  // Logout session
  const handleLogout = () => {
    localStorage.removeItem('family_sync_token');
    localStorage.removeItem('family_sync_user');
    setToken(null);
    setUser(null);
    setFamilyData(null);
    setNotifications([]);
    setShowNotifications(false);
  };

  // Sync user information when family status changes
  const updateFamilyStatus = (familyId, role) => {
    const updatedUser = { ...user, familyId, role };
    localStorage.setItem('family_sync_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    fetchFamilyDetails();
  };

  // Fetch Family details
  const fetchFamilyDetails = async () => {
    if (!token || !user?.familyId) return;
    setLoadingFamily(true);
    try {
      const response = await API.get('/family/members');
      setFamilyData(response.data);
    } catch (err) {
      console.error('Error fetching family details:', err);
    } finally {
      setLoadingFamily(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await API.get('/notifications');
      setNotifications(response.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Mark single notification as read
  const markNotificationRead = async (id, e) => {
    e.stopPropagation();
    try {
      await API.put(`/notifications/${id}`);
      setNotifications(prev => 
        prev.map(notif => notif.id === id ? { ...notif, isRead: true } : notif)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications read
  const markAllNotificationsRead = async () => {
    try {
      await API.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  // Load profile and start polling notifications
  useEffect(() => {
    if (token) {
      fetchFamilyDetails();
      fetchNotifications();

      // Poll notifications every 10 seconds for mock real-time
      const interval = setInterval(() => {
        fetchNotifications();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [token, user?.familyId]);

  // Click outside to close notifications dropdown
  useEffect(() => {
    const handleClickOutside = () => {
      setShowNotifications(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  if (!token) {
    return <LoginRegister onLogin={handleLogin} />;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="d-flex">
      {/* Sidebar Navigation */}
      <div className="nav-sidebar">
        <div className="nav-sidebar-brand d-flex align-items-center gap-2 mb-4 px-3 py-2">
          <Home className="text-cyan" size={24} />
          <span className="fs-4 fw-bold text-white glow-text-purple">FamSync</span>
        </div>
        
        <div className="flex-grow-1">
          <a 
            href="#" 
            onClick={() => setActiveTab('dashboard')} 
            className={`nav-sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </a>
          
          <a 
            href="#" 
            onClick={() => setActiveTab('todo')} 
            className={`nav-sidebar-link ${activeTab === 'todo' ? 'active' : ''}`}
          >
            <CheckSquare size={20} />
            <span>To-Do Lists</span>
          </a>
          
          <a 
            href="#" 
            onClick={() => setActiveTab('calendar')} 
            className={`nav-sidebar-link ${activeTab === 'calendar' ? 'active' : ''}`}
          >
            <CalendarIcon size={20} />
            <span>Calendar</span>
          </a>
          
          <a 
            href="#" 
            onClick={() => setActiveTab('family')} 
            className={`nav-sidebar-link ${activeTab === 'family' ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>Family Portal</span>
          </a>

          <a 
            href="#" 
            onClick={() => setActiveTab('chat')} 
            className={`nav-sidebar-link ${activeTab === 'chat' ? 'active' : ''}`}
          >
            <MessageSquare size={20} />
            <span>Family Chat</span>
          </a>
        </div>

        <div className="mt-auto pt-3 border-top border-secondary">
          <div className="d-flex align-items-center gap-2 mb-3 px-3">
            <div className="avatar-circle bg-purple text-white">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <h6 className="mb-0 text-white text-truncate" style={{ fontSize: '0.9rem' }}>{user.name}</h6>
              <span className="text-muted d-block text-truncate" style={{ fontSize: '0.75rem' }}>{user.role}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content w-100">
        
        {/* Top Header Bar */}
        <div className="header-bar">
          <div className="position-relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifications(!showNotifications);
              }} 
              className="bell-btn"
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </button>

            {showNotifications && (
              <div 
                className="notifications-dropdown glass-panel shadow"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
                  <h6 className="mb-0 text-white font-weight-bold">Notifications</h6>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllNotificationsRead} 
                      className="btn btn-link btn-sm text-cyan p-0 text-decoration-none"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted">No notifications</div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`notification-item d-flex align-items-start gap-2 ${!notif.isRead ? 'unread' : ''}`}
                      >
                        <div className="flex-grow-1">
                          <p className="mb-1 text-white-50">{notif.message}</p>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {new Date(notif.timestamp || notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(notif.timestamp || notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {!notif.isRead && (
                          <button 
                            onClick={(e) => markNotificationRead(notif.id, e)} 
                            className="btn btn-sm btn-outline-success p-1 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: '22px', height: '22px' }}
                            title="Mark as read"
                          >
                            <Check size={12} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-2 bg-secondary bg-opacity-25 py-2 px-3 rounded-pill">
            <User className="text-purple" size={16} />
            <span className="text-white fw-bold" style={{ fontSize: '0.85rem' }}>
              {familyData?.familyName || 'No Family Joined'}
            </span>
          </div>
        </div>

        {/* Dynamic Route View Content */}
        {!user.familyId && activeTab !== 'family' ? (
          <div className="glass-panel p-5 text-center my-5 animate-slide-up">
            <Users size={64} className="text-purple mb-4" />
            <h2 className="text-white mb-3 glow-text-purple">Join a Family Group!</h2>
            <p className="text-muted mx-auto mb-4" style={{ maxWidth: '500px' }}>
              FamSync revolves around shared activities and coordination. Create a new family group or enter an invitation code to access tasks, calendars, and dashboards.
            </p>
            <button onClick={() => setActiveTab('family')} className="btn btn-purple px-4 py-2">
              Go to Family Setup
            </button>
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'dashboard' && <Dashboard user={user} familyData={familyData} onRefreshNotifications={fetchNotifications} />}
            {activeTab === 'todo' && <TodoList user={user} familyData={familyData} onRefreshNotifications={fetchNotifications} />}
            {activeTab === 'calendar' && <CalendarView user={user} familyData={familyData} onRefreshNotifications={fetchNotifications} />}
            {activeTab === 'family' && <FamilyManager user={user} familyData={familyData} onFamilyUpdate={updateFamilyStatus} />}
            {activeTab === 'chat' && <FamilyChat user={user} familyData={familyData} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
