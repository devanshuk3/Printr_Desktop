import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Eye, 
  X, 
  RefreshCcw,
  Loader2,
  CheckCircle
} from 'lucide-react';
import logo from '../assets/Printr_Logo_transparent_White.png';

import { API_BASE_URL, getHeaders } from '../config';

interface PrintJob {
  id: number;
  file_key?: string;
  file_name?: string;
  sender_name?: string;
  page_count?: number;
  status: string;
}

interface DashboardProps {
  vendorId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ vendorId }) => {
  const [queueData, setQueueData] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const fetchQueue = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s for Render wakes

    try {
      const resp = await fetch(`${API_BASE_URL}/api/r2/files?vendor_id=${vendorId}`, {
        headers: getHeaders(),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!resp.ok) {
        if (resp.status === 403) {
            console.warn("Authorization failed or CORS block detected.");
        }
        throw new Error(`Server responded with ${resp.status}`);
      }

      const data = await resp.json();
      if (data.files) {
        setQueueData(data.files);
        setConnectionError(null);
        if (data.files.length > 0) {
            console.log('Sample Data Structure (First Entry):');
            console.dir(data.files[0]);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        const msg = 'Connection timed out. The server might be waking up or is unreachable.';
        console.error(msg);
        setConnectionError(msg);
      } else {
        console.error('Error fetching queue:', error);
        setConnectionError(`Failed to load queue: ${error.message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [vendorId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  const handleViewOrPrint = async (job: PrintJob, isPrint: boolean) => {
    const key = job.file_key || (job as any).fileKey || job.file_name || (job as any).fileName;
    const name = job.file_name || (job as any).fileName || 'document';

    if (!key) {
        alert("Operation aborted: Identifer (file_key) is missing for this record.");
        return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/r2/download`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          file_key: key,
          id: job.id 
        })
      });
      
      const data = await response.json();
      if (!response.ok || !data.downloadUrl) {
        throw new Error(data.message || 'Failed to get secure link from backend.');
      }

      // Download the actual file from Cloudflare
      const fileResp = await fetch(data.downloadUrl);
      if (!fileResp.ok) {
        throw new Error('Cloudflare R2 Access Denied. Your secure link was rejected by the storage server.');
      }

      const arrayBuffer = await fileResp.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const path = (window as any).require('path');
      const fs = (window as any).require('fs');
      const os = (window as any).require('os');
      const { shell } = (window as any).require('electron');

       const tempPath = path.join(os.tmpdir(), `printr_${name}`);
      fs.writeFileSync(tempPath, buffer);
      shell.openPath(tempPath);

      // If it was a print action, also mark as printed in DB
      if (isPrint) {
        await fetch(`${API_BASE_URL}/api/r2/printed`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ 
            file_key: key,
            id: job.id
          })
        });
        setQueueData(prev => prev.map(item => 
          item.id === job.id ? { ...item, status: 'Printed' } : item
        ));
      }
    } catch (error: any) {
      console.error('Operation failed:', error);
      alert(`Operation failed for Row ${job.id} (Key: ${key})\nError: ${error.message}`);
    }
  };

  const handleCancel = async (job: PrintJob) => {
    const key = job.file_key || (job as any).fileKey || job.file_name || (job as any).fileName;
    const name = job.file_name || (job as any).fileName || 'document';

    if (!confirm(`Cancel order for "${name}" from ${job.sender_name}?`)) return;

    if (!key) {
        alert("Operation aborted: Missing file key.");
        return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/r2/delete`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          file_key: key,
          id: job.id
        })
      });
      
      if (response.ok) {
        setQueueData(prev => prev.map(item => 
          item.id === job.id ? { ...item, status: 'Cancelled' } : item
        ));
        alert('Order successfully marked as cancelled.');
      } else {
        const data = await response.json();
        alert(`Cancel Error: ${data.message || 'Failed to cancel'}`);
      }
    } catch (error: any) {
      console.error('Delete failed:', error);
      alert(`Network Error: ${error.message}`);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <header className="system-header">
        <div className="header-brand">
          <img src={logo} alt="Printr" className="header-logo-tiny" />
          <p>Printr | Cloud Print Enterprise v2.0</p>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="content-intro">
          <div className="title-area">
            <h1>System Dashboard</h1>
            <p>Welcome back! Here's what's happening with your print queue today.</p>
          </div>
           <button 
            className="refresh-btn-premium" 
            onClick={handleRefresh}
            style={refreshing ? { pointerEvents: 'none', opacity: 0.7 } : {}}
          >
            <RefreshCcw size={18} className={refreshing ? 'spinning' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh List'}</span>
          </button>
        </div>

        <section className="stats-grid">
          <div className="stat-card glass-glow blue">
            <div className="stat-card-inner">
               <div className="stat-card-header">
                 <div className="stat-icon-box">
                   <Printer size={20} />
                 </div>
                 <span>PENDING JOBS</span>
               </div>
               <div className="stat-card-value">{queueData.length}</div>
               <div className="stat-card-footer">Jobs ready for processing</div>
            </div>
          </div>

          <div className="stat-card glass-glow green">
            <div className="stat-card-inner">
               <div className="stat-card-header">
                 <div className="stat-icon-box">
                   <CheckCircle size={20} />
                 </div>
                 <span>SYSTEM STATUS</span>
               </div>
               <div className="stat-card-value">Online</div>
               <div className="stat-card-footer">Node connection is active</div>
            </div>
          </div> 

          <div className="stat-card glass-glow grey">
            <div className="stat-card-inner">
               <div className="stat-card-header">
                 <div className="stat-icon-box">
                   <RefreshCcw size={20} />
                 </div>
                 <span>LATEST SYNC</span>
               </div>
               <div className="stat-card-value">Live</div>
               <div className="stat-card-footer">Syncing in real-time</div>
            </div>
          </div>
        </section>

        <section className="queue-main-area">
          <div className="queue-card-container">
            <div className="queue-header">
              <div className="queue-title">
                <h3>Active Print Queue</h3>
                <span className="queue-count">{queueData.length} Items</span>
              </div>
            </div>

            {loading ? (
              <div className="loader-box-premium">
                <Loader2 className="spinning" size={40} />
                <p>Establishing secure connection...</p>
                <div style={{ fontSize: '12px', color: '#BBB', marginTop: '10px' }}>
                  Targeting: {API_BASE_URL}
                </div>
              </div>
            ) : connectionError ? (
              <div className="empty-box-premium error-box">
                <div className="empty-icon-wrap" style={{ color: '#EF4444' }}>
                  <X size={48} />
                </div>
                <h3>Connection Error</h3>
                <p>{connectionError}</p>
                <button 
                  onClick={fetchQueue} 
                  className="refresh-btn-premium" 
                  style={{ margin: '20px auto', background: '#EF4444' }}
                >
                  <RefreshCcw size={16} />
                  <span>Try Again</span>
                </button>
              </div>
            ) : queueData.length === 0 ? (
              <div className="empty-box-premium">
                <div className="empty-icon-wrap">
                  <Printer size={48} />
                </div>
                <h3>All Caught Up!</h3>
                <p>Your print queue is currently empty. New orders will appear here automatically.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="queue-table-premium">
                  <thead>
                    <tr>
                      <th>FILE NAME</th>
                      <th>SENDER INFO</th>
                      <th>PAGES</th>
                      <th>EST. COST</th>
                      <th>STATUS</th>
                      <th className="text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueData.map((row) => (
                      <tr key={row.id} className="queue-row">
                        <td className="file-cell">
                          <div className="file-name-info">
                            <span className="file-primary">{row.file_name || (row as any).fileName || (row as any).file}</span>
                            <span className="file-key">{(row.file_key || (row as any).fileKey || row.file_name || (row as any).fileName || 'No-Key').substring(0, 10)}...</span>
                          </div>
                        </td>
                        <td className="sender-cell">
                          <span className="sender-name">{row.sender_name || (row as any).senderName || (row as any).customer}</span>
                        </td>
                        <td className="pages-cell">
                          <span className="page-count-badge">{row.page_count || (row as any).pageCount || (row as any).pages}</span>
                        </td>
                        <td className="cost-cell">
                          <span className="cost-value">₹{((row.page_count || (row as any).pageCount || (row as any).pages || 0) * 5).toFixed(2)}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${row.status || 'pending'}`}>
                            {row.status || 'pending'}
                          </span>
                        </td>
                        <td className="actions-cell-premium">
                          <div className="action-button-group">
                            <button className="icon-action-btn print" title="Print & Mark Done" onClick={() => handleViewOrPrint(row, true)}>
                              <Printer size={16} />
                            </button>
                            <button className="icon-action-btn view" title="Quick View" onClick={() => handleViewOrPrint(row, false)}>
                              <Eye size={16} />
                            </button>
                            <button className="icon-action-btn cancel" title="Cancel Order" onClick={() => handleCancel(row)}>
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .dashboard-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #FAFBFC;
          height: 100vh;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
        }

        .system-header {
          background: #000000;
          color: rgba(255, 255, 255, 0.6);
          padding: 10px 24px;
          font-size: 11px;
          display: flex;
          justify-content: center;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .header-brand { display: flex; align-items: center; gap: 10px; }
        .header-logo-tiny { height: 20px; background: #000; padding: 4px; border-radius: 6px; }

        .dashboard-content {
          flex: 1;
          padding: 40px 60px;
          overflow-y: auto;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .content-intro {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 40px;
        }

        .title-area h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 36px;
          font-weight: 800;
          color: #111;
          margin: 0 0 8px 0;
          letter-spacing: -1px;
        }

        .title-area p {
          color: #666;
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }

        .refresh-btn-premium {
          background: #000;
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .refresh-btn-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          background: #111;
        }

        .refresh-btn-premium:active { transform: translateY(0); }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-bottom: 48px;
        }

        .stat-card {
          border-radius: 24px;
          padding: 32px;
          border: 1px solid rgba(0,0,0,0.05);
          background: white;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.06);
          border-color: rgba(0,0,0,0.1);
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          color: #999;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .stat-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F8F9FA;
          color: #111;
          transition: 0.3s;
        }

        .stat-card.blue .stat-icon-box { background: #EBF2FF; color: #3B82F6; }
        .stat-card.green .stat-icon-box { background: #E6FFFA; color: #10B981; }

        .stat-card-value {
          font-family: 'Outfit';
          font-size: 38px;
          font-weight: 800;
          color: #111;
          line-height: 1;
          margin-bottom: 8px;
        }

        .stat-card-footer {
          color: #888;
          font-size: 14px;
          font-weight: 500;
        }

        .queue-card-container {
          background: white;
          border-radius: 28px;
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          overflow: hidden;
        }

        .queue-header {
          padding: 32px 40px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .queue-title h3 {
          font-family: 'Outfit';
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          color: #111;
        }

        .queue-count {
          font-size: 13px;
          color: #888;
          font-weight: 600;
          display: block;
          margin-top: 4px;
        }

        .table-responsive { width: 100%; overflow-x: auto; }

        .queue-table-premium {
          width: 100%;
          border-collapse: collapse;
        }

        .queue-table-premium th {
          text-align: left;
          padding: 24px 40px;
          font-size: 11px;
          font-weight: 800;
          color: #AAA;
          letter-spacing: 1px;
          background: #FDFFFF;
        }

        .queue-row {
          transition: 0.2s;
          border-bottom: 1px solid rgba(0,0,0,0.03);
        }

        .queue-row:hover { background: #F9FBFF; }
        .queue-row:last-child { border-bottom: none; }

        .queue-row td { padding: 24px 40px; }

        .file-name-info { display: flex; flex-direction: column; gap: 4px; }
        .file-primary { font-weight: 700; color: #111; font-size: 15px; }
        .file-key { font-size: 12px; color: #AAA; font-weight: 500; font-family: monospace; }

        .sender-name { font-weight: 600; color: #444; font-size: 15px; }

        .page-count-badge {
          background: #F0F2F5;
          color: #111;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
        }

        .cost-value { font-weight: 800; color: #111; font-size: 15px; font-family: 'Outfit'; }

        .status-pill {
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .status-pill.pending { background: #FFF4E6; color: #D9480F; }
        .status-pill.printed { background: #EBFBEE; color: #2B8A3E; }

        .actions-cell-premium { text-align: right; }
        .action-button-group {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .icon-action-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0,0,0,0.08);
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          color: #555;
        }

        .icon-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          color: #111;
          border-color: #111;
        }

        .icon-action-btn.print:hover { background: #000; color: white; border-color: #000; }
        .icon-action-btn.done:hover { background: #10B981; color: white; border-color: #10B981; }
        .icon-action-btn.cancel:hover { background: #EF4444; color: white; border-color: #EF4444; }

        .loader-box-premium, .empty-box-premium {
          padding: 100px 40px;
          text-align: center;
          color: #666;
        }

        .empty-icon-wrap {
          width: 90px;
          height: 90px;
          background: #F8F9FA;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: #DDD;
        }

        .empty-box-premium h3 { font-family: 'Outfit'; font-size: 24px; color: #111; margin-bottom: 8px; }
        .empty-box-premium p { max-width: 400px; margin: 0 auto; line-height: 1.6; }

        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .text-right { text-align: right; }
      `}</style>
    </div>
  );
};

export default Dashboard;
