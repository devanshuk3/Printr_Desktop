import React from 'react';
import { 
  Home, 
  Printer, 
  CheckCircle, 
  Wallet, 
  LogOut, 
} from 'lucide-react';
import logo from '../assets/Printr_Logo_transparent_White.png';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'config', label: 'Printer Config', icon: Printer },
    { id: 'cod', label: 'COD Verification', icon: CheckCircle },
    { id: 'upi', label: 'UPI Setup', icon: Wallet },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <img src={logo} alt="Printr" className="sidebar-logo-img" />
          <h2 className="admin-title">Printr Admin</h2>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          width: 280px;
          height: 100vh;
          background: var(--sidebar-bg);
          display: flex;
          flex-direction: column;
          padding: 32px 16px;
          color: white;
          z-index: 100;
        }

        .sidebar-header {
          margin-bottom: 48px;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-left: 4px;
        }

        .sidebar-logo-img {
          width: 32px;
          height: 32px;
          background: #000;
          padding: 6px;
          border-radius: 8px;
        }

        .admin-title {
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          font-weight: 700;
          margin: 0;
          color: white;
          letter-spacing: -0.5px;
        }

        .sidebar-nav {
          flex: 1;
        }

        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 8px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 14px;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .nav-item.active {
          background: #121212;
          color: white;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .sidebar-footer {
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px;
          border: none;
          background: #D32F2F;
          color: white;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #B71C1C;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
