import React, { useState } from 'react';
import { User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import logo from '../assets/Printr_Logo_transparent_White.png';
import { API_BASE_URL } from '../config';

interface AuthProps {
  onLogin: (vendorId: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration fields
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [address, setAddress] = useState('');
  const [bwPrice, setBwPrice] = useState('5.00');
  const [colorPrice, setColorPrice] = useState('15.00');
  const [paperSizes, setPaperSizes] = useState('A4, A3, Letter');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/login' : '/api/register';
    const payload = isLogin 
      ? { vendor_id: identifier, password: password }
      : { 
          vendor_id: identifier, 
          password: password,
          full_name: fullName,
          shop_name: shopName,
          phone: phone,
          upi_id: upiId,
          address: address,
          bw_price: parseFloat(bwPrice),
          color_price: parseFloat(colorPrice),
          paper_sizes: paperSizes
        };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success && data.token) {
        localStorage.setItem('printr_token', data.token);
        localStorage.setItem('printr_vendor_id', data.vendor_id || identifier);
        onLogin(data.vendor_id || identifier);
      } else {
        setError(data.message || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Connection failed. Make sure the backend is responding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-fullscreen-bg">
      <div className="auth-centered-box">
        <div className={`auth-inner-card white-shadow-card ${!isLogin ? 'registration-mode' : ''}`}>
          <div className="auth-brand">
            <div className="auth-icon-wrap">
               <img src={logo} alt="Printr" className="auth-logo-symbol" />
            </div>
            <h1 className="auth-title">{isLogin ? 'Printr Login' : 'Partner Registration'}</h1>
            <p className="auth-subtitle">{isLogin ? 'Enterprise Management' : 'Please provide your details to register as a partner'}</p>
          </div>

          <div className="auth-form-container">
            <form className="auth-v2-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-label">VENDOR ID</label>
                <div className="auth-input-group">
                  <User size={18} className="auth-icon-left" />
                  <input 
                    type="text" 
                    placeholder="Enter Unique ID" 
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="auth-text-input"
                    required 
                  />
                </div>
                {!isLogin && <p className="field-hint">* This will be your unique merchant username</p>}
              </div>

              <div className="auth-field">
                <label className="auth-label">PASSWORD</label>
                <div className="auth-input-group">
                  <Lock size={18} className="auth-icon-left" />
                  <input 
                    type="password" 
                    placeholder="Enter Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-text-input"
                    required 
                  />
                </div>
              </div>

              {!isLogin && (
                <>
                  <div className="auth-field">
                    <label className="auth-label">FULL NAME</label>
                    <input 
                      type="text" 
                      placeholder="Enter Your Full Name" 
                      className="auth-text-input bare" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">SHOP NAME</label>
                    <input 
                      type="text" 
                      placeholder="Enter Business/Shop Name" 
                      className="auth-text-input bare" 
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">PHONE</label>
                    <input 
                      type="text" 
                      placeholder="Enter 10-digit mobile number" 
                      className="auth-text-input bare" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">UPI ID</label>
                    <input 
                      type="text" 
                      placeholder="merchant@upi" 
                      className="auth-text-input bare" 
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">ADDRESS</label>
                    <input 
                      type="text" 
                      placeholder="Enter complete shop address" 
                      className="auth-text-input bare" 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="auth-field-row">
                    <div className="auth-field half">
                      <label className="auth-label">B/W PRICE</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 5.00" 
                        className="auth-text-input bare" 
                        value={bwPrice}
                        onChange={(e) => setBwPrice(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="auth-field half">
                      <label className="auth-label">COLOR PRICE</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 15.00" 
                        className="auth-text-input bare" 
                        value={colorPrice}
                        onChange={(e) => setColorPrice(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">PAPER SIZES (COMMA SEPARATED)</label>
                    <input 
                      type="text" 
                      placeholder="A4, A3, letter" 
                      className="auth-text-input bare" 
                      value={paperSizes}
                      onChange={(e) => setPaperSizes(e.target.value)}
                      required 
                    />
                  </div>
                </>
              )}

              {error && <div className="auth-error-hint">{error}</div>}

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                <span>{loading ? 'Processing...' : isLogin ? 'Sign In to Dashboard' : 'Create Account'}</span>
                <ArrowRight size={20} />
              </button>
            </form>
          </div>

          <div className="auth-bottom-nav">
             <div className="security-tag">
                <ShieldCheck size={14} />
                <span>Secure Cloud connection</span>
             </div>
             <p className="auth-switch-prompt">
                {isLogin ? "Need access?" : "Have an account?"}{' '}
                <button onClick={() => setIsLogin(!isLogin)} className="auth-switch-btn">
                  {isLogin ? 'Request Registration' : 'Back to Login'}
                </button>
             </p>
          </div>
        </div>
      </div>

      <style>{`
        .auth-fullscreen-bg {
          width: 100vw;
          height: 100vh;
          background: #F8F9FA;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Inter', sans-serif;
        }

        .auth-centered-box { 
          width: 100%; 
          max-width: 520px; 
          padding: 40px 20px; 
          height: 100vh;
          display: flex;
          align-items: center;
        }
        
        .auth-centered-box:has(.registration-mode) {
          align-items: flex-start;
        }

        .white-shadow-card {
          background: #FFFFFF;
          padding: 64px 56px;
          border-radius: 32px;
          box-shadow: 0 15px 45px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.05);
          text-align: center;
          animation: authScaleIn 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
          width: 100%;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }
        
        .white-shadow-card.registration-mode {
          padding: 40px 56px;
        }

        .auth-form-container {
          flex: 1;
          overflow-y: auto;
          padding-right: 10px;
          margin: 20px 0;
        }

        /* Custom Scrollbar */
        .auth-form-container::-webkit-scrollbar { width: 6px; }
        .auth-form-container::-webkit-scrollbar-track { background: transparent; }
        .auth-form-container::-webkit-scrollbar-thumb { background: #EEE; border-radius: 10px; }
        .auth-form-container::-webkit-scrollbar-thumb:hover { background: #DDD; }

        .auth-icon-wrap { 
          width: 70px; 
          height: 70px; 
          background: #000; 
          border-radius: 20px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          margin: 0 auto 20px; 
          box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
        }
        .auth-logo-symbol { width: 45px; }

        .auth-title { font-size: 26px; font-weight: 800; color: #111; margin: 0; font-family: 'Outfit'; }
        .auth-subtitle { color: #888; font-size: 14px; margin-top: 6px; font-weight: 500; line-height: 1.4; }

        .auth-v2-form { text-align: left; }
        .auth-field { margin-bottom: 24px; position: relative; }
        .auth-label { display: block; font-size: 11px; font-weight: 800; color: #111; margin-bottom: 10px; letter-spacing: 0.8px; text-transform: uppercase; }

        .auth-input-group { position: relative; display: flex; align-items: center; }
        .auth-icon-left { position: absolute; left: 20px; color: #BBB; }
        
        .auth-text-input {
          width: 100%; 
          padding: 16px 20px 16px 52px;
          border-radius: 14px;
          border: 1.5px solid #EEE;
          background: #F9F9F9;
          color: #111;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          transition: all 0.2s;
        }
        
        .auth-text-input.bare { padding: 16px 20px; }
        .auth-text-input:focus { border-color: #000; background: white; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }

        .field-hint { font-size: 11px; color: #999; margin-top: 6px; font-weight: 500; font-style: italic; }

        .auth-field-row { display: flex; gap: 16px; width: 100%; }
        .auth-field.half { flex: 1; }

        .auth-error-hint { background: #fff5f5; color: #c92a2a; padding: 12px; border-radius: 12px; font-size: 13px; font-weight: 600; margin-bottom: 24px; text-align: center; border: 1px solid #ffc9c9; }

        .auth-submit-btn {
          width: 100%; background: #222; color: white; border: none; padding: 16px;
          border-radius: 14px; font-weight: 700; font-size: 15px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1); transition: all 0.2s;
          margin-top: 10px;
        }
        .auth-submit-btn:hover { background: #000; transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
        .auth-submit-btn:active { transform: translateY(0); }

        .auth-bottom-nav { margin-top: 20px; border-top: 1px solid #F0F0F0; padding-top: 24px; }
        .security-tag { display: flex; align-items: center; justify-content: center; gap: 8px; color: #10B981; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; margin-bottom: 16px; }

        .auth-switch-prompt { font-size: 13px; color: #888; margin: 0; }
        .auth-switch-btn { background: none; border: none; color: #000; font-weight: 800; cursor: pointer; padding: 4px; border-bottom: 1.5px solid #000; margin-left: 6px; }
        .auth-switch-btn:hover { background: #F8F9FA; opacity: 0.8; }

        @keyframes authScaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Auth;
