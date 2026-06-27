import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Building, Trash2, Plus, Users, ArrowRight, ArrowLeft, ArrowRightLeft } from 'lucide-react';
import Modal from '../components/Modal';

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState('organizations'); // 'organizations' | 'users'
  
  // Organization State
  const [organizations, setOrganizations] = useState([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [orgPage, setOrgPage] = useState(0);
  const [orgHasMore, setOrgHasMore] = useState(true);
  const pageSize = 10;
  
  // Staff Directory Modal State (inside Organizations)
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgStaff, setOrgStaff] = useState([]);

  // Users State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isMoveUserModalOpen, setIsMoveUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPage, setUserPage] = useState(0);
  const [userHasMore, setUserHasMore] = useState(true);

  // All Orgs for dropdowns
  const [allOrgsDropdown, setAllOrgsDropdown] = useState([]);

  // Create User Modal State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isEmailManuallyEdited, setIsEmailManuallyEdited] = useState(false);

  useEffect(() => {
    // Fetch all orgs for dropdowns (no pagination for dropdowns)
    supabase.from('organizations').select('id, name').order('name').then(({ data }) => setAllOrgsDropdown(data || []));
  }, []);

  const fetchOrganizations = async (currentPage) => {
    setOrgLoading(true);
    const from = currentPage * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('organizations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) console.error('Error fetching orgs:', error);
    else {
      setOrganizations(data || []);
      setOrgHasMore(to < (count - 1));
    }
    setOrgLoading(false);
  };

  const fetchUsers = async (currentPage) => {
    setUsersLoading(true);
    const from = currentPage * pageSize;
    const to = from + pageSize - 1;

    // Fetch profiles and join with organizations to get the name
    const { data, error, count } = await supabase
      .from('profiles')
      .select(`
        *,
        organizations ( name )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) console.error('Error fetching users:', error);
    else {
      setUsers(data || []);
      setUserHasMore(to < (count - 1));
    }
    setUsersLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'organizations') fetchOrganizations(orgPage);
    else fetchUsers(userPage);
  }, [activeTab, orgPage, userPage]);

  // --- Organization Handlers ---
  const handleCreateOrg = async (e) => {
    e.preventDefault();
    const name = new FormData(e.target).get('name');
    const { error } = await supabase.from('organizations').insert([{ name }]);
    if (error) alert(`Error: ${error.message}`);
    else {
      setIsOrgModalOpen(false);
      setOrgPage(0);
      fetchOrganizations(0);
      // Refresh dropdown
      supabase.from('organizations').select('id, name').order('name').then(({ data }) => setAllOrgsDropdown(data || []));
    }
  };

  const handleDeleteOrg = async (id, name) => {
    if (window.confirm(`WARNING: Deleting "${name}" will wipe all tenant data permanently. Proceed?`)) {
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchOrganizations(orgPage);
    }
  };

  const viewOrgStaff = async (org) => {
    setSelectedOrg(org);
    setIsStaffModalOpen(true);
    const { data } = await supabase.from('profiles').select('*').eq('organization_id', org.id);
    setOrgStaff(data || []);
  };

  // --- User Handlers ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      email: formData.get('email'),
      password: formData.get('password'),
      org_id: formData.get('org_id'),
      user_role: formData.get('role'),
      first_name: formData.get('first_name')
    };

    try {
      // 1. Create a temporary client to sign up the user without logging the admin out
      const { createClient } = await import('@supabase/supabase-js');
      const { supabaseUrl, supabaseKey } = await import('../lib/supabase.js');
      const tempClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email: payload.email,
        password: payload.password,
      });

      if (signUpError) {
        if (!signUpError.message.includes('already registered')) {
          throw signUpError;
        }
      }

      // 2. Call RPC to verify email and assign profile
      const { error: rpcError } = await supabase.rpc('admin_verify_and_assign_user', {
        target_email: payload.email,
        org_id: payload.org_id,
        user_role: payload.user_role,
        first_name: payload.first_name
      });

      if (rpcError) throw rpcError;

      alert("User created successfully!");
      setIsUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setIsEmailManuallyEdited(false);
      fetchUsers(userPage);
    } catch (err) {
      console.error("Full error object:", err);
      const errorText = err?.message || err?.msg || err?.error_description || JSON.stringify(err);
      alert(`Error creating user: ${errorText}. (Check browser console for full details)`);
    }
  };

  const handleMoveUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      target_user_id: selectedUser.id,
      new_org_id: formData.get('org_id'),
      new_role: formData.get('role')
    };

    const { error } = await supabase.rpc('admin_update_user_org', payload);
    if (error) alert(`Error moving user: ${error.message}`);
    else {
      setIsMoveUserModalOpen(false);
      fetchUsers(userPage);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 0' }}>
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>System Settings</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Manage organizations and access.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '8px' }}>
          <button className={`nav-link ${activeTab === 'organizations' ? 'active' : ''}`} onClick={() => setActiveTab('organizations')} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: activeTab === 'organizations' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'organizations' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
            Organizations
          </button>
          <button className={`nav-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: activeTab === 'users' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'users' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
            Users
          </button>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          {activeTab === 'organizations' ? (
            <button className="primary-btn" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => setIsOrgModalOpen(true)}>
              + Add Organization
            </button>
          ) : (
            <button className="primary-btn" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => setIsUserModalOpen(true)}>
              + Add User
            </button>
          )}
        </div>

        {/* ORGANIZATIONS TAB */}
        {activeTab === 'organizations' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {orgLoading ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div> : organizations.length === 0 ? <p style={{ padding: '2rem' }}>No organizations found.</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Name</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ID</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map(org => (
                    <tr key={org.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{org.name}</td>
                      <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{org.id.split('-')[0]}...</td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <button onClick={() => viewOrgStaff(org)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', marginRight: '1rem' }}>
                          View Staff
                        </button>
                        <button onClick={() => handleDeleteOrg(org.id, org.name)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {usersLoading ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div> : users.length === 0 ? <p style={{ padding: '2rem' }}>No users found.</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Name</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Organization</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Role</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{u.first_name || u.full_name || 'Unnamed'}</td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{u.email || 'Hidden (Auth)'}</td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{u.organizations?.name || 'None'}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ color: u.role === 'super_admin' ? '#ef4444' : 'var(--text-primary)' }}>{u.role}</span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <button onClick={() => { setSelectedUser(u); setIsMoveUserModalOpen(true); }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', marginRight: '1rem' }}>
                          Edit Access
                        </button>
                        <button onClick={async () => {
                          if (window.confirm(`WARNING: Are you sure you want to completely delete "${u.full_name || u.first_name}"? This will wipe their account forever.`)) {
                            try {
                              console.log("Attempting to delete user:", u.id);
                              const { data, error } = await supabase.rpc('admin_delete_user', { target_user_id: u.id });
                              console.log("Delete response:", { data, error });
                              if (error) {
                                alert(`Failed to delete: ${error.message || JSON.stringify(error)}`);
                              } else {
                                alert("User successfully deleted!");
                                fetchUsers(userPage);
                              }
                            } catch (err) {
                              console.error("Delete exception:", err);
                              alert(`Exception occurred: ${err.message}`);
                            }
                          }
                        }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}

      <Modal isOpen={isOrgModalOpen} onClose={() => setIsOrgModalOpen(false)} title="Provision New Organization">
        <form onSubmit={handleCreateOrg}>
          <div className="form-group">
            <label>Organization Name</label>
            <input name="name" required className="form-input" placeholder="E.g., Acme Corp Global" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsOrgModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn" style={{ background: '#ef4444' }}>Provision Tenant</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} title={`Staff Directory: ${selectedOrg?.name}`}>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {orgStaff.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No staff assigned to this tenant.</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {orgStaff.map(s => (
                <li key={s.id} style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>{s.full_name || s.first_name || 'Unnamed User'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: s.role === 'super_admin' ? '#ef4444' : 'var(--text-primary)', fontSize: '0.85rem' }}>{s.role}</span>
                    <button 
                      onClick={() => {
                        // The Edit Access modal needs the 'organizations' property to display "Current Org"
                        setSelectedUser({ ...s, organizations: selectedOrg });
                        setIsStaffModalOpen(false);
                        setIsMoveUserModalOpen(true);
                      }}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}
                    >
                      Edit Access
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Create Global Identity">
        <form onSubmit={handleCreateUser}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                name="first_name" 
                required 
                className="form-input" 
                placeholder="John Doe" 
                value={newUserName}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewUserName(val);
                  if (!isEmailManuallyEdited) {
                    const cleanName = val.trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
                    setNewUserEmail(cleanName ? `${cleanName}@startupos.com` : '');
                  }
                }}
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                name="email" 
                type="email" 
                required 
                className="form-input" 
                placeholder="john@example.com"
                value={newUserEmail}
                onChange={(e) => {
                  setNewUserEmail(e.target.value);
                  setIsEmailManuallyEdited(true);
                }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Temporary Password</label>
            <input name="password" type="password" required className="form-input" placeholder="••••••••" minLength="6" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Organization Assignment</label>
              <select name="org_id" required className="form-select">
                {allOrgsDropdown.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>System Role</label>
              <select name="role" required className="form-select">
                <option value="member">Standard Member</option>
                <option value="admin">Tenant Admin</option>
                <option value="super_admin">Super Admin (God Mode)</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsUserModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn" style={{ background: '#3b82f6' }}>Create User</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isMoveUserModalOpen} onClose={() => setIsMoveUserModalOpen(false)} title={`Edit Profile: ${selectedUser?.first_name}`}>
        <form onSubmit={handleMoveUser}>
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Current Org: <strong>{selectedUser?.organizations?.name}</strong><br/>
              Current Role: <strong>{selectedUser?.role}</strong>
            </p>
          </div>
          <div className="form-group">
            <label>New Organization Assignment</label>
            <select name="org_id" required className="form-select" defaultValue={selectedUser?.organization_id}>
              {allOrgsDropdown.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>New System Role</label>
            <select name="role" required className="form-select" defaultValue={selectedUser?.role}>
              <option value="member">Standard Member</option>
              <option value="admin">Tenant Admin</option>
              <option value="super_admin">Super Admin (God Mode)</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsMoveUserModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Changes</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
