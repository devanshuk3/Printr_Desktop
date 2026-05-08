import React, { useState, useEffect } from 'react';
import { Search, History } from 'lucide-react';
import { API_BASE_URL, getHeaders } from '../config';

interface CODVerificationProps {
  vendorId: string;
}

const CODVerification: React.FC<CODVerificationProps> = ({ vendorId }) => {
  const [orderId, setOrderId] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [codOrders, setCodOrders] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const fetchCODOrders = async () => {
    try {
      const token = localStorage.getItem('printr_token');
      if (!vendorId || !token) return;
      const response = await fetch(`${API_BASE_URL}/api/vendors/files?vendor_id=${vendorId}`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        const codOnly = (data.files || []).filter((o: any) => o.payment_method === 'Cash on Delivery');
        setCodOrders(codOnly);
      }
    } catch (err) {
      console.error('Failed to fetch COD orders:', err);
    }
  };

  const fetchHistory = async () => {
    const token = localStorage.getItem('printr_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/activity-log`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchCODOrders();
    const interval = setInterval(() => {
      fetchHistory();
      fetchCODOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (status: 'printed' | 'rejected') => {
    if (!orderId) {
      setMessage({ text: 'Please enter an Order ID', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    // Remove '#' if users prefix it (mock was #ORD-7721)
    const numericId = orderId.replace(/^.*(\d+)$/, '$1');

    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/update-order-status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          orderId: numericId,
          status: status
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: `Order ${numericId} marked as ${status} successfully`, type: 'success' });
        setOrderId('');
        fetchHistory();
        fetchCODOrders();
      } else {
        setMessage({ text: data.message || `Failed to update order ${numericId}`, type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const dt = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - dt.getTime()) / 60000); // mins

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return dt.toLocaleDateString();
  };

  return (
    <div className="cod-container">
      <div className="cod-list-sidebar glass-panel">
        <h3>Pending COD Orders</h3>
        <div className="cod-orders-list">
          {codOrders.length === 0 ? (
            <p className="no-cod">No pending COD orders</p>
          ) : (
            codOrders.map(order => (
              <div 
                key={order.id} 
                className="cod-order-item" 
                onClick={() => setOrderId(order.id.toString())}
              >
                <div className="cod-order-main">
                  <span className="order-id">#{order.id}</span>
                  <span className="order-cost">₹{Number(order.total_amount).toFixed(2)}</span>
                </div>
                <div className="cod-order-footer">
                  <span className="order-sender">{order.sender_name || 'User'}</span>
                  <span className="order-pages">{order.page_count} pages</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="cod-main glass-panel">
        <div className="cod-card">
          <div className="cod-icon-header">
            <Search size={48} className="search-pulse" />
          </div>
          <h2>Transaction Verification</h2>
          <p>Scan or enter the Order ID to verify payment and process the print.</p>
          
          <div className="input-group">
            <input 
              type="text" 
              placeholder="e.g. #ORD-7721" 
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="cod-input"
              disabled={isProcessing}
            />
            <div className="input-glow"></div>
          </div>

          <div className="cod-actions">
            <button 
              className="reject-btn" 
              onClick={() => handleUpdateStatus('rejected')}
              disabled={isProcessing}
            >
              Reject Order
            </button>
            <button 
              className="verify-btn" 
              onClick={() => handleUpdateStatus('printed')}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Verify & Process Print'}
            </button>
          </div>

          {message && (
             <div style={{ marginTop: '20px', color: message.type === 'success' ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
               {message.text}
             </div>
          )}
        </div>
      </div>

      <aside className="activity-log glass-panel">
        <div className="log-header">
          <History size={18} />
          <span>Activity Log</span>
        </div>
        <div className="timeline">
          {activities.length === 0 && <p style={{ color: '#888', textAlign: 'center', marginTop: '20px' }}>No recent activity</p>}
          {activities.map((act, i) => (
            <div key={i} className="timeline-item">
              <div className={`timeline-dot ${act.status === 'printed' ? 'verified' : act.status === 'cancelled' ? 'cancelled' : 'rejected'}`}></div>
              <div className="timeline-content">
                <div className="timeline-top">
                  <span className="log-order">#{act.id}</span>
                  <span className="log-time">{formatTime(act.created_at)}</span>
                </div>
                <div className="timeline-bottom">
                  <span className={`log-type ${act.status === 'printed' ? 'verified' : act.status === 'cancelled' ? 'cancelled' : 'rejected'}`}>
                    {act.status === 'printed' ? 'Verified' : act.status === 'cancelled' ? 'Cancelled' : 'Rejected'}
                  </span>
                  <span className="log-customer">{act.customer_name || 'Anonymous'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <style>{`
        .cod-container {
          display: flex;
          height: 100%;
          gap: 24px;
          padding: 24px;
          flex: 1;
        }

        .cod-list-sidebar {
          width: 320px;
          padding: 24px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
        }

        .cod-list-sidebar h3 {
          font-size: 18px;
          margin-bottom: 20px;
          color: var(--text-primary);
        }

        .cod-orders-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        .cod-order-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cod-order-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--accent-blue);
          transform: translateX(4px);
        }

        .cod-order-main {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .order-id {
          font-weight: 700;
          color: var(--accent-blue);
        }

        .order-cost {
          font-weight: 700;
          color: white;
        }

        .cod-order-footer {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .no-cod {
          text-align: center;
          color: var(--text-secondary);
          margin-top: 20px;
          font-style: italic;
        }

        .cod-main {
          flex: 1.5;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 32px;
          padding: 40px;
        }

        .cod-card {
           width: 100%;
           max-width: 500px;
           text-align: center;
        }

        .cod-icon-header {
          margin-bottom: 24px;
          color: var(--accent-blue);
          display: flex;
          justify-content: center;
        }

        .search-pulse {
          animation: searchIconPulse 2s infinite ease-in-out;
        }

        @keyframes searchIconPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }

        .cod-card h2 { font-size: 28px; margin-bottom: 12px; }
        .cod-card p { color: var(--text-secondary); margin-bottom: 40px; }

        .input-group {
          position: relative;
          margin-bottom: 40px;
        }

        .cod-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          padding: 20px 24px;
          border-radius: 16px;
          color: white;
          font-size: 18px;
          font-family: 'Outfit';
          outline: none;
          transition: all 0.3s ease;
        }

        .cod-input:focus {
           background: rgba(25, 25, 25, 0.8);
           border-color: var(--accent-blue);
        }

        .input-glow {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border-radius: 16px;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0);
          pointer-events: none;
          transition: all 0.3s ease;
        }

        .cod-input:focus + .input-glow {
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.1);
        }

        .cod-actions {
          display: flex;
          gap: 16px;
        }

        .reject-btn {
          flex: 1;
          padding: 16px;
          border-radius: 14px;
          background: transparent;
          border: 1px solid var(--accent-red);
          color: var(--accent-red);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reject-btn:hover { background: rgba(239, 68, 68, 0.1); }

        .verify-btn {
          flex: 2;
          padding: 16px;
          border-radius: 14px;
          background: var(--accent-green);
          border: none;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .verify-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4); }
        .verify-btn:active { transform: translateY(0) scale(0.98); }

        .activity-log {
          flex: 1;
          border-radius: 32px;
          padding: 32px;
          display: flex;
          flex-direction: column;
        }

        .log-header {
           display: flex; align-items: center; gap: 10px; margin-bottom: 24px;
           color: var(--text-primary); font-weight: 600;
        }

        .timeline { display: flex; flex-direction: column; gap: 24px; flex: 1; overflow-y: auto; }

        .timeline-item { display: flex; gap: 16px; position: relative; }
        
        .timeline-item::after {
          content: ''; position: absolute; left: 6px; top: 20px; bottom: -20px;
          width: 1px; background: rgba(255, 255, 255, 0.1);
        }

        .timeline-item:last-child::after { display: none; }

        .timeline-dot {
          width: 12px; height: 12px; border-radius: 50%; background: #555; margin-top: 6px; z-index: 1;
        }
        .timeline-dot.verified { background: var(--accent-green); box-shadow: 0 0 8px var(--accent-green); }
        .timeline-dot.rejected { background: var(--accent-red); box-shadow: 0 0 8px var(--accent-red); }
        .timeline-dot.cancelled { background: #94a3b8; box-shadow: 0 0 8px #94a3b8; }

        .timeline-content { flex: 1; border-radius: 12px; padding: 12px; background: rgba(255, 255, 255, 0.05); }

        .timeline-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .log-order { font-weight: 600; font-size: 14px; }
        .log-time { color: var(--text-secondary); font-size: 11px; }

        .timeline-bottom { display: flex; justify-content: space-between; }
        .log-type { font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .log-type.verified { color: var(--accent-green); }
        .log-type.rejected { color: var(--accent-red); }
        .log-type.cancelled { color: #94a3b8; }
        .log-customer { font-size: 12px; color: var(--text-secondary); }
      `}</style>
    </div>
  );
};

export default CODVerification;
