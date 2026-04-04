import React, { useState, useEffect } from 'react';
import { Save, Printer, Wallet, Info, Check } from 'lucide-react';
import { API_BASE_URL, getHeaders } from '../config';

interface PrinterConfigProps {
  activeTab?: string;
}

const PrinterConfig: React.FC<PrinterConfigProps> = ({ activeTab = 'config' }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [config, setConfig] = useState({
    auto_accept_jobs: true,
    bw_printer: '',
    color_printer: '',
    bw_price: 2,
    color_price: 10,
    enable_upi: true,
    upi_id: '',
    shop_name: '',
    min_amount: 1
  });

  const [printers, setPrinters] = useState<any[]>([]);

  // Fetch configuration and printers on mount
  useEffect(() => {
    const fetchPrinters = async () => {
        try {
            const { ipcRenderer } = (window as any).require('electron');
            const list = await ipcRenderer.invoke('get-printers');
            console.log("Hardware Printers:", list);
            setPrinters(list);
        } catch (err) {
            console.error("Failed to fetch printers from electron:", err);
        }
    };
    fetchPrinters();

    const fetchConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/vendors/settings/me`, {
          headers: getHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          setConfig({
            auto_accept_jobs: data.auto_accept_jobs ?? true,
            bw_printer: data.bw_printer || '',
            color_printer: data.color_printer || '',
            bw_price: parseFloat(data.bw_price) || 2,
            color_price: parseFloat(data.color_price) || 10,
            enable_upi: data.enable_upi ?? true,
            upi_id: data.upi_id || '',
            shop_name: data.shop_name || '',
            min_amount: parseFloat(data.min_amount) || 1
          });
        }
      } catch (err) {
        console.error('Failed to fetch config:', err);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save configuration');
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="config-viewport">
      <header className="config-header">
         <h1 className="config-title">Configuration</h1>
         <p className="config-subtitle">Adjust your pricing, printer settings, and payment methods.</p>
      </header>

      <div className="config-cards-grid">
        {/* Printer Settings Card */}
        {(activeTab === 'config' || activeTab === 'settings') && (
        <section className="config-card-panel white-card">
          <div className="card-header-with-icon">
            <Printer size={20} className="blue-icon" />
            <h3 className="card-header-text">Printer Settings</h3>
          </div>
          
          <div className="config-form">
            <div className="form-item-row no-border">
               <label className="form-label-bold">B&W Printing Device</label>
               <select 
                className="standard-styled-input select-compact"
                value={config.bw_printer}
                onChange={(e) => handleChange('bw_printer', e.target.value)}
               >
                 <option value="">Select B&W Printer...</option>
                 {printers.map((p, idx) => (
                    <option key={idx} value={p.name}>{p.name}</option>
                 ))}
               </select>
            </div>

            <div className="form-item-row">
               <label className="form-label-bold">Color Printing Device</label>
               <select 
                className="standard-styled-input select-compact"
                value={config.color_printer}
                onChange={(e) => handleChange('color_printer', e.target.value)}
               >
                 <option value="">Select Color Printer...</option>
                 {printers.map((p, idx) => (
                    <option key={idx} value={p.name}>{p.name}</option>
                 ))}
               </select>
            </div>

            <div className="form-item-row">
              <label className="form-label-bold">Auto-Accept Jobs</label>
              <div className="toggle-switch-container">
                <input 
                  type="checkbox" 
                  id="auto-accept" 
                  checked={config.auto_accept_jobs}
                  onChange={(e) => handleChange('auto_accept_jobs', e.target.checked)} 
                />
                <label htmlFor="auto-accept" className="toggle-slider"></label>
              </div>
            </div>

            <div className="form-item-row">
              <label className="form-label-bold">B&W Price per page</label>
              <div className="currency-input-field">
                <span className="currency-symbol">₹</span>
                <input 
                  type="number" 
                  value={config.bw_price}
                  step="0.5" 
                  className="clean-input" 
                  onChange={(e) => handleChange('bw_price', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="form-item-row">
              <label className="form-label-bold">Color Price per page</label>
              <div className="currency-input-field">
                <span className="currency-symbol">₹</span>
                <input 
                  type="number" 
                  value={config.color_price}
                  step="1" 
                  className="clean-input" 
                  onChange={(e) => handleChange('color_price', parseFloat(e.target.value))}
                />
              </div>
            </div>
            
            <div className="tip-box">
               <Info size={16} className="info-icon" />
               <p>Recommended price for standard A4 is ₹5.00 - ₹10.00</p>
            </div>
          </div>
        </section>
        )}

        {(activeTab === 'upi') && (
        <section className="config-card-panel white-card">
          <div className="card-header-with-icon">
            <Wallet size={20} className="green-icon" />
            <h3 className="card-header-text">UPI Payment Setup</h3>
          </div>

          <div className="config-form">
            <div className="form-item-row">
              <label className="form-label-bold">Enable UPI Payments</label>
              <div className="toggle-switch-container">
                <input 
                  type="checkbox" 
                  id="enable-upi" 
                  checked={config.enable_upi}
                  onChange={(e) => handleChange('enable_upi', e.target.checked)}
                />
                <label htmlFor="enable-upi" className="toggle-slider"></label>
              </div>
            </div>

            <div className="form-item-row horizontal-input-group">
               <label className="form-label-bold">UPI ID (for payments)</label>
               <input 
                  type="text" 
                  placeholder="e.g. example@upi" 
                  className="standard-styled-input" 
                  value={config.upi_id}
                  onChange={(e) => handleChange('upi_id', e.target.value)}
                />
            </div>

            <div className="form-item-row horizontal-input-group">
              <label className="form-label-bold">Merchant Name (Shop Name)</label>
              <input 
                type="text" 
                placeholder="e.g. XYZ PRINT" 
                className="standard-styled-input" 
                value={config.shop_name}
                onChange={(e) => handleChange('shop_name', e.target.value)}
              />
            </div>

            <div className="form-item-row">
              <label className="form-label-bold">Min. Amount</label>
               <div className="currency-input-field small-input">
                <span className="currency-symbol">₹</span>
                <input 
                  type="number" 
                  value={config.min_amount}
                  className="clean-input" 
                  onChange={(e) => handleChange('min_amount', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        </section>
        )}
      </div>

      <div className="config-action-footer">
        <button className={`save-config-btn ${isSaving ? 'is-loading' : ''}`} onClick={handleSave} disabled={isSaving}>
          {isSaving ? <span className="loader-dot"></span> : <><Save size={18} /><span>Save Configuration</span></>}
        </button>
        {showSuccess && (
          <div className="save-success-toast">
            <Check size={16} />
            <span>Settings synced successfully!</span>
          </div>
        )}
        {error && (
          <div className="save-error-toast" style={{ color: '#ff4444', fontWeight: '700' }}>
            <span>Error: {error}</span>
          </div>
        )}
      </div>

      <style>{`
        .config-viewport { flex: 1; padding: 48px; min-width: 0; }
        
        .config-header { margin-bottom: 40px; }
        .config-title { font-size: 32px; font-weight: 800; color: #1a1a1a; margin: 0; font-family: 'Outfit'; }
        .config-subtitle { color: #666; font-size: 15px; margin-top: 8px; font-weight: 500; }

        .config-cards-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); 
          gap: 24px; 
          width: 100%;
        }

        .white-card {
           background: #FFFFFF;
           border-radius: 16px;
           padding: 32px;
           border: 1px solid rgba(0,0,0,0.06);
           box-shadow: 0 4px 20px rgba(0,0,0,0.03);
           display: flex;
           flex-direction: column;
           gap: 24px;
        }

        .card-header-with-icon { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .blue-icon { color: var(--accent-blue); }
        .green-icon { color: var(--accent-green); }
        .card-header-text { margin: 0; font-size: 18px; font-weight: 700; color: #1a1a1a; font-family: 'Outfit'; }

        .config-form { display: flex; flex-direction: column; gap: 20px; }
        
        .form-item-row { display: flex; justify-content: space-between; align-items: center; min-height: 48px; border-bottom: 1px solid #F0F0F0; padding-bottom: 12px; }
        .form-item-row:last-of-type { border-bottom: none; }
        
        .form-label-bold { font-weight: 700; color: #333; font-size: 14px; }

        .horizontal-input-group { flex-direction: column; align-items: flex-start; gap: 8px; border-bottom: none; }

        /* Toggle Switch Styling */
        .toggle-switch-container { position: relative; width: 50px; height: 26px; }
        .toggle-switch-container input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
          position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
          background-color: #E2E8F0; transition: .4s; border-radius: 34px;
        }
        .toggle-slider:before {
          position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px;
          background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input:checked + .toggle-slider { background-color: var(--accent-green); }
        input:checked + .toggle-slider:before { transform: translateX(24px); }

        /* Input Styles */
        .currency-input-field {
          display: flex; align-items: center; background: #F8F9FA; border: 1.5px solid #EEE;
          border-radius: 10px; padding: 4px 12px; width: 140px; transition: border 0.2s, box-shadow 0.2s;
        }
        .currency-input-field:focus-within { border-color: #1a1a1a; box-shadow: 0 0 0 3px rgba(0,0,0,0.03); }
        .small-input { width: 100px; }
        .currency-symbol { color: var(--accent-blue); font-weight: 700; font-size: 16px; margin-right: 8px; }
        .clean-input { 
          background: transparent; border: none; outline: none; width: 100%; color: #1a1a1a; 
          font-weight: 700; font-size: 16px; font-family: 'Outfit';
        }

        .standard-styled-input {
          width: 100%; max-width: 100%; background: #F8F9FA; border: 1.5px solid #EEE;
          border-radius: 10px; padding: 12px 16px; color: #1a1a1a; outline: none;
          font-weight: 500; font-size: 14px; transition: all 0.2s;
        }
        .standard-styled-input:focus { border-color: #1a1a1a; background: white; }
        .select-compact { background-image: none; cursor: pointer; height: 48px; margin-left: 12px; max-width: 250px; }
        .no-border { border-bottom: none; padding-bottom: 0px; }

        .tip-box { 
          display: flex; gap: 12px; background: #ebf5ff; padding: 16px; border-radius: 12px; 
          margin-top: 10px; align-items: flex-start; border-left: 4px solid var(--accent-blue);
        }
        .tip-box p { color: #1c5ba3; font-size: 13px; font-weight: 500; margin: 0; line-height: 1.4; }
        .info-icon { color: var(--accent-blue); margin-top: 2px; }

        .config-action-footer { margin-top: 48px; display: flex; align-items: center; gap: 24px; }
        .save-config-btn {
          background: #111; color: white; border: none; padding: 18px 36px; border-radius: 14px;
          display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 15px; cursor: pointer;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .save-config-btn:hover { background: #333; transform: translateY(-2px); }
        .save-config-btn:disabled { background: #999; transform: none; box-shadow: none; cursor: not-allowed; }

        .save-success-toast { display: flex; align-items: center; gap: 8px; color: var(--accent-green); font-weight: 700; animation: fadeIn 0.4s; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }

        .loader-dot {
          width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.2);
          border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default PrinterConfig;
