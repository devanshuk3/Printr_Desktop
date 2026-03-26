import React from 'react';
import { 
  Printer, 
  Eye, 
  Check, 
  X, 
  RefreshCcw 
} from 'lucide-react';
import logo from '../assets/Printr_Logo_transparent_White.png';

const Dashboard: React.FC = () => {
  const queueData = [
    { id: 'devanshuk328.pdf', customer: 'Devanshu Kumar', pages: 1, total: '₹5.0', status: 'pending' },
    { id: 'devanshuk327.pdf', customer: 'Devanshu Kumar', pages: 1, total: '₹2.0', status: 'pending' },
  ];

  return (
    <div className="dashboard-wrapper">
      <header className="system-header">
        <div className="header-brand">
          <img src={logo} alt="Printr" className="header-logo-tiny" />
          <p>Printr | Enterprise Management v2.0</p>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="system-overview-label">
          <span>System Overview</span>
        </div>

        <section className="print-queue-section">
          <div className="section-header">
            <h2>Print Queue</h2>
            <button className="refresh-btn">
              <RefreshCcw size={14} />
              <span>Refresh List</span>
            </button>
          </div>

          <div className="stats-bar white-panel">
            <div className="stat-item border-right">
              <div className="stat-label">
                 <div className="icon-dot blue"></div>
                 <span>PENDING JOBS</span>
              </div>
              <div className="stat-main">
                <span className="stat-value">2</span>
                <span className="stat-sub">Jobs ready to print</span>
              </div>
            </div>

            <div className="stat-item border-right">
              <div className="stat-label">
                 <div className="icon-dot green"></div>
                 <span>PRINTER STATUS</span>
              </div>
              <div className="stat-main">
                <span className="stat-value">Online</span>
                <span className="stat-sub">Cloud connection live</span>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label">
                 <div className="icon-dot green"></div>
                 <span>LATEST SYNC</span>
              </div>
              <div className="stat-main">
                <span className="stat-value">Active</span>
                <span className="stat-sub">Updated just now</span>
              </div>
            </div>
          </div>

          <div className="table-container white-panel">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Customer</th>
                  <th>Pages</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queueData.map((row, i) => (
                  <tr key={i} className="row-hover">
                    <td className="bold">{row.id}</td>
                    <td>{row.customer}</td>
                    <td>{row.pages}</td>
                    <td>{row.total}</td>
                    <td>
                      <span className="badge pending">
                        pending
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="action-btn print-btn">
                        <Printer size={14} />
                        <span>Print</span>
                      </button>
                      <button className="action-btn view-btn">
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                      <button className="action-btn done-btn">
                        <Check size={14} />
                        <span>Done</span>
                      </button>
                      <button className="action-btn cancel-btn">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <style>{`
        .dashboard-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #F8F9FA;
          height: 100vh;
          overflow: hidden;
        }

        .system-header {
          background: #121212;
          color: rgba(255, 255, 255, 0.7);
          padding: 8px 16px;
          font-size: 13px;
          display: flex;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.5px;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-logo-tiny {
          height: 14px;
          opacity: 0.8;
        }

        .header-brand p { margin: 0; }

        .dashboard-content {
          flex: 1;
          padding: 32px 48px;
          overflow-y: auto;
        }

        .system-overview-label {
          color: var(--text-primary);
          font-weight: 700;
          font-size: 18px;
          margin-bottom: 40px;
          font-family: 'Outfit', sans-serif;
        }

        .print-queue-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-header h2 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          color: #1a1a1a;
          font-family: 'Outfit', sans-serif;
        }

        .refresh-btn {
          background: #111;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: 0.2s;
        }

        .refresh-btn:hover { background: #333; }

        .white-panel {
          background: white;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .stats-bar {
          display: flex;
          padding: 24px;
        }

        .stat-item {
          flex: 1;
          padding: 0 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .border-right { border-right: 1px solid rgba(0,0,0,0.06); }

        .stat-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #888;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .icon-dot { width: 6px; height: 6px; border-radius: 50%; }
        .icon-dot.blue { background: #3B82F6; box-shadow: 0 0 6px rgba(59, 130, 246, 0.4); }
        .icon-dot.green { background: #10B981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }

        .stat-main { display: flex; flex-direction: column; }
        .stat-value { font-size: 22px; font-weight: 700; color: #1a1a1a; font-family: 'Outfit'; }
        .stat-sub { font-size: 11px; color: #999; margin-top: 2px; }

        .table-container { 
          padding: 8px; 
          min-height: 400px;
        }

        .queue-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Inter', sans-serif;
        }

        .queue-table th {
          text-align: left;
          padding: 20px 16px;
          font-size: 12px;
          color: #999;
          font-weight: 500;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }

        .queue-table td {
          padding: 20px 16px;
          font-size: 14px;
          color: #444;
          border-bottom: 1px solid rgba(0,0,0,0.02);
        }

        .row-hover { transition: 0.1s; }
        .row-hover:hover { background: #FAFAFA; }

        .bold { font-weight: 600; color: #1a1a1a !important; }

        .badge {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }
        .badge.pending { background: #E7F9F3; color: #0CA678; }

        .actions-cell {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .action-btn {
          height: 34px;
          padding: 0 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .print-btn { background: #1a1a1a; color: white; border: none; }
        .print-btn:hover { background: #333; }

        .view-btn { background: white; color: #1a1a1a; border: 1px solid #1a1a1a; }
        .view-btn:hover { background: #f5f5f5; }

        .done-btn { background: white; color: #0CA678; border: 1px solid #0CA678; }
        .done-btn:hover { background: #f0fdf9; }

        .cancel-btn { background: white; color: #D32F2F; border: 1px solid #D32F2F; min-width: 34px; justify-content: center; }
        .cancel-btn:hover { background: #fff5f5; }
      `}</style>
    </div>
  );
};

export default Dashboard;
