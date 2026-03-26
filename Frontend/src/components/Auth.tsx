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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: identifier, password: password })
      });

      const data = await response.json();
      if (data.success && data.token) {
        localStorage.setItem('printr_token', data.token);
        localStorage.setItem('printr_vendor_id', identifier);
        onLogin(identifier);
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
        <div className="auth-inner-card white-shadow-card">
          <div className="auth-brand">
            <div className="auth-icon-wrap">
               <img src={logo} alt="Printr" className="auth-logo-symbol" />
            </div>
            <h1 className="auth-title">Printr Admin</h1>
            <p className="auth-subtitle">Enterprise Management v2.0</p>
          </div>

          <form className="auth-v2-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label">IDENTIFIER</label>
              <div className="auth-input-group">
                <User size={18} className="auth-icon-left" />
                <input 
                  type="text" 
                  placeholder="Enter email or username" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="auth-text-input"
                  required 
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">PASSWORD</label>
              <div className="auth-input-group">
                <Lock size={18} className="auth-icon-left" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-text-input"
                  required 
                />
              </div>
            </div>

            {error && <div className="auth-error-hint">{error}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              <span>{loading ? 'Logging in...' : isLogin ? 'Sign In to Dashboard' : 'Initialize Account'}</span>
              <ArrowRight size={20} />
            </button>
          </form>

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

        .auth-centered-box { width: 100%; max-width: 460px; padding: 20px; }

        .white-shadow-card {
          background: #FFFFFF;
          padding: 64px 48px;
          border-radius: 32px;
          box-shadow: 0 15px 45px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.05);
          text-align: center;
          animation: authScaleIn 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }

        @keyframes authScaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .auth-brand { margin-bottom: 40px; }
        .auth-icon-wrap { width: 80px; height: 80px; background: #000; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .auth-logo-symbol { width: 50px; }

        .auth-title { font-size: 30px; font-weight: 800; color: #111; margin: 0; font-family: 'Outfit'; }
        .auth-subtitle { color: #888; font-size: 15px; margin-top: 6px; font-weight: 500; }

        .auth-v2-form { text-align: left; }
        .auth-field { margin-bottom: 24px; }
        .auth-label { display: block; font-size: 12px; font-weight: 800; color: #111; margin-bottom: 12px; letter-spacing: 0.8px; }

        .auth-input-group { position: relative; display: flex; align-items: center; }
        .auth-icon-left { position: absolute; left: 20px; color: #BBB; }
        
        .auth-text-input {
          width: 100%; 
          padding: 18px 20px 18px 56px;
          border-radius: 16px;
          border: 1.5px solid #EEE;
          background: #F9F9F9;
          color: #111;
          font-size: 15px;
          font-weight: 500;
          outline: none;
          transition: all 0.2s;
        }
        .auth-text-input:focus { border-color: #000; background: white; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }

        .auth-error-hint { background: #fff5f5; color: #c92a2a; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-bottom: 24px; text-align: center; border: 1px solid #ffc9c9; }

        .auth-submit-btn {
          width: 100%; background: #000; color: white; border: none; padding: 18px;
          border-radius: 16px; font-weight: 700; font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12); transition: all 0.2s;
        }
        .auth-submit-btn:hover { background: #222; transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
        .auth-submit-btn:active { transform: translateY(-1px); }

        .auth-bottom-nav { margin-top: 48px; border-top: 1px solid #F0F0F0; padding-top: 32px; }
        .security-tag { display: flex; align-items: center; justify-content: center; gap: 8px; color: #10B981; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; margin-bottom: 20px; }

        .auth-switch-prompt { font-size: 14px; color: #888; margin: 0; }
        .auth-switch-btn { background: none; border: none; color: #000; font-weight: 800; cursor: pointer; padding: 4px; border-bottom: 1.5px solid #000; margin-left: 6px; }
        .auth-switch-btn:hover { background: #F8F9FA; opacity: 0.8; }
      `}</style>
    </div>
  );
};

export default Auth;
