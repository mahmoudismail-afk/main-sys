import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Key, User, CheckCircle } from 'lucide-react';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user?.user_metadata?.display_name) {
        setDisplayName(user.user_metadata.display_name);
      }
    };
    fetchUser();
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileMessage(null);

    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName }
    });

    if (error) {
      setProfileError(error.message);
    } else {
      setProfileMessage("Profile successfully updated!");
    }
    setProfileLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password successfully updated!");
      setNewPassword('');
      setConfirmPassword('');
    }
    
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>System Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your personal credentials and system preferences.</p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
        
        {/* Profile Card */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', maxWidth: '600px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={32} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Admin Account</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', textTransform: 'lowercase' }}>
              {user?.email ? user.email.replace('@startupos.com', '') : 'Loading...'}
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className="badge completed" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Shield size={12} /> Active
            </span>
          </div>
        </div>

        {/* Profile Details / Display Name */}
        <div className="glass-panel" style={{ maxWidth: '600px', marginTop: '1rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <User size={20} color="var(--accent-primary)" /> Edit Profile
          </h2>

          {profileError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              {profileError}
            </div>
          )}

          {profileMessage && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} /> {profileMessage}
            </div>
          )}

          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label>Display Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="E.g., John Doe"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>This name will be visible in the Message Center.</p>
            </div>
            <button 
              type="submit" 
              className="primary-btn" 
              disabled={profileLoading}
              style={{ marginTop: '1rem' }}
            >
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Security / Password Change */}
        <div className="glass-panel" style={{ maxWidth: '600px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Key size={20} color="var(--accent-secondary)" /> Change Password
          </h2>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} /> {message}
            </div>
          )}

          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label>New Password</label>
              <input 
                type="password" 
                required 
                className="form-input" 
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Confirm New Password</label>
              <input 
                type="password" 
                required 
                className="form-input" 
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="primary-btn" 
              disabled={loading}
              style={{ marginTop: '1.5rem' }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
