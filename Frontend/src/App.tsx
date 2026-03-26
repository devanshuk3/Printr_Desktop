import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CODVerification from './components/CODVerification';
import PrinterConfig from './components/PrinterConfig';
import Auth from './components/Auth';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'cod':
        return <CODVerification />;
      case 'config':
      case 'upi':
      case 'settings':
        return <PrinterConfig />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="layout">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
      />
      <main className="main-viewport">
        {renderContent()}
      </main>

      <style>{`
        .layout {
          display: flex;
          width: 100vw;
          height: 100vh;
          background: #F8F9FA;
          overflow: hidden;
        }

        .main-viewport {
          flex: 1;
          height: 100vh;
          overflow-y: auto;
          position: relative;
        }
      `}</style>
    </div>
  );
}

export default App;
