import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CODVerification from './components/CODVerification';
import PrinterConfig from './components/PrinterConfig';
import Auth from './components/Auth';
import './App.css';

function App() {
  const [vendorId, setVendorId] = useState<string | null>(() => {
    const storedId = localStorage.getItem('printr_vendor_id');
    const storedToken = localStorage.getItem('printr_token');
    return (storedId && storedToken) ? storedId : null;
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogin = (id: string) => {
    setVendorId(id);
  };

  const handleLogout = () => {
    localStorage.removeItem('printr_token');
    localStorage.removeItem('printr_vendor_id');
    setVendorId(null);
    setActiveTab('dashboard');
  };

  if (!vendorId) {
    return <Auth onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard vendorId={vendorId} />;
      case 'cod':
        return <CODVerification vendorId={vendorId} />;
      case 'config':
      case 'upi':
      case 'settings':
        return <PrinterConfig activeTab={activeTab} />;
      default:
        return <Dashboard vendorId={vendorId} />;
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
          background: var(--primary-bg);
          overflow: hidden;
        }

        .main-viewport {
          flex: 1;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }
      `}</style>
    </div>
  );
}

export default App;
