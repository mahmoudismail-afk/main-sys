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

    const { error } = await supabase.rpc('admin_create_user', payload);
    if (error) alert(`Error creating user: ${error.message}`);
    else {
      alert("User created successfully!");
      setIsUserModalOpen(false);
      fetchUsers(userPage);
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
            <ShieldAlert size={28} /> Global Admin IAM
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage global multi-tenant architecture, cross-tenant identities, and IAM roles.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className={`nav-link ${activeTab === 'organizations' ? 'active' : ''}`} onClick={() => setActiveTab('organizations')} style={{ background: activeTab === 'organizations' ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
            <Building size={16} /> Organizations
          </button>
          <button className={`nav-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')} style={{ background: activeTab === 'users' ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
            <Users size={16} /> Global Users
          </button>
        </div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {activeTab === 'organizations' ? <><Building size={20} /> Registered Tenants</> : <><Users size={20} /> Identity Directory</>}
          </h2>
          {activeTab === 'organizations' ? (
            <button className="primary-btn" style={{ background: '#ef4444' }} onClick={() => setIsOrgModalOpen(true)}>
              <Plus size={16} style={{ marginRight: '0.5rem' }} /> New Tenant
            </button>
          ) : (
            <button className="primary-btn" style={{ background: '#3b82f6' }} onClick={() => setIsUserModalOpen(true)}>
              <Plus size={16} style={{ marginRight: '0.5rem' }} /> Create Global User
            </button>
          )}
        </div>

        {/* ORGANIZATIONS TAB */}
        {activeTab === 'organizations' && (
          <>
            {orgLoading ? <div className="loader">Loading...</div> : organizations.length === 0 ? <p>No organizations found.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Organization Name</th>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tenant ID (UUID)</th>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Created At</th>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map(org => (
                      <tr key={org.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 500 }}>{org.name}</td>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{org.id}</td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{new Date(org.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button onClick={() => viewOrgStaff(org)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '4px', marginRight: '0.5rem', fontSize: '0.8rem' }}>
                            View Staff
                          </button>
                          <button onClick={() => handleDeleteOrg(org.id, org.name)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }} title="Delete Organization">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <button onClick={() => setOrgPage(p => Math.max(0, p - 1))} disabled={orgPage === 0} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Previous
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Page {orgPage + 1}</span>
              <button onClick={() => setOrgPage(p => p + 1)} disabled={!orgHasMore} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Next <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <>
            {usersLoading ? <div className="loader">Loading...</div> : users.length === 0 ? <p>No users found.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Role</th>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Organization</th>
                      <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 500 }}>{u.first_name || 'Unknown'}</td>
                        <td style={{ padding: '1rem' }}>
                          <span className="badge" style={{ background: u.role === 'super_admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: u.role === 'super_admin' ? '#f87171' : '#93c5fd' }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{u.organizations?.name || 'Unassigned'}</td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button onClick={() => { setSelectedUser(u); setIsMoveUserModalOpen(true); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ArrowRightLeft size={14} /> Assign / Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <button onClick={() => setUserPage(p => Math.max(0, p - 1))} disabled={userPage === 0} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> Previous
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Page {userPage + 1}</span>
              <button onClick={() => setUserPage(p => p + 1)} disabled={!userHasMore} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Next <ArrowRight size={16} />
              </button>
            </div>
          </>
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
                  <span style={{ fontWeight: 500 }}>{s.first_name || 'Unnamed'}</span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{s.role}</span>
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
              <input name="first_name" required className="form-input" placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input name="email" type="email" required className="form-input" placeholder="john@example.com" />
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
