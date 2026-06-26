import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Supabase requires an email format, so we append a dummy domain if they just type a username
    const formattedEmail = username.includes('@') ? username : `${username}@startupos.com`;

    const { error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password,
    });

    if (error) {
      console.error("Login Error:", error);
      setError(error.message || JSON.stringify(error));
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '2rem'
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div className="glass-panel" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '3rem 2rem',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        
        <div style={{
          width: '64px',
          height: '64px',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem',
          boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
        }}>
          <ShieldCheck size={32} color="white" />
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>Startup OS</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Restricted Access. Enter your credentials to continue to the command center.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            width: '100%',
            fontSize: '0.85rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <div className="form-group" style={{ position: 'relative' }}>
            <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                <User size={18} />
              </div>
              <input 
                type="text" 
                required 
                className="form-input" 
                style={{ paddingLeft: '2.5rem', height: '48px' }}
                placeholder="e.g. admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative', marginTop: '1.5rem' }}>
            <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                required 
                className="form-input" 
                style={{ paddingLeft: '2.5rem', height: '48px' }}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="primary-btn" 
            disabled={loading}
            style={{ 
              width: '100%', 
              height: '48px', 
              marginTop: '2rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '1rem'
            }}
          >
            {loading ? 'Authenticating...' : 'Secure Login'} 
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
