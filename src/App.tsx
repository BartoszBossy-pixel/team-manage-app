import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import AnimatedTooltip from './components/AnimatedTooltip';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const isUserManagementPage = location.pathname === '/users';

  return (
    <>
      {/* Navigation Sidebar */}
      <div className="navigation-sidebar">
        <AnimatedTooltip content="Dashboard" position="left">
          <div
            className={`nav-item ${!isUserManagementPage ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <i className="fas fa-tachometer-alt"></i>
          </div>
        </AnimatedTooltip>
        
        <AnimatedTooltip content="Zarządzanie użytkownikami" position="left">
          <div
            className={`nav-item ${isUserManagementPage ? 'active' : ''}`}
            onClick={() => navigate('/users')}
          >
            <i className="fas fa-users-cog"></i>
          </div>
        </AnimatedTooltip>
      </div>

      {/* Main Content */}
      <div className={`main-content ${isUserManagementPage ? 'user-management-page' : ''}`}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
        </Routes>
      </div>
    </>
  );
}

export default App;