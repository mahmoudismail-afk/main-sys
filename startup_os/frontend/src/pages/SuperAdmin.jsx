import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Building, Trash2, Plus, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import Modal from '../components/Modal';

export default function SuperAdmin() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [hasMore, setHasMore] = useState(true);

  const fetchOrganizations = async (currentPage) => {
    setLoading(true);
    const from = currentPage * pageSize;
    const to = from + pageSize - 1;

    // Supabase strict server-side pagination
    const { data, error, count } = await supabase
      .from('organizations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching orgs:', error);
    } else {
      setOrganizations(data || []);
      setHasMore(to < (count - 1));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrganizations(page);
  }, [page]);

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');

    const { error } = await supabase.from('organizations').insert([{ name }]);
    if (error) {
      alert(`Error creating organization: ${error.message}`);
    } else {
      setIsModalOpen(false);
      setPage(0);
      fetchOrganizations(0);
    }
  };

  const handleDeleteOrg = async (id, name) => {
    const confirmDelete = window.confirm(`WARNING: You are about to permanently delete the organization "${name}" and all of its associated data (clients, invoices, okrs, debts). This cannot be undone. Proceed?`);
    if (confirmDelete) {
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) {
        alert(`Error deleting organization: ${error.message}`);
      } else {
        fetchOrganizations(page);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
            <ShieldAlert size={28} /> Global Admin
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage global multi-tenant architecture and all platform organizations.</p>
        </div>
        <button className="primary-btn" style={{ background: '#ef4444' }} onClick={() => setIsModalOpen(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> New Tenant
        </button>
      </div>

      <div className="glass-panel">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building size={20} /> Registered Organizations
        </h2>
        
        {loading ? (
          <div className="loader">Loading...</div>
        ) : organizations.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No organizations found.</p>
        ) : (
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
                      <button 
                        onClick={() => handleDeleteOrg(org.id, org.name)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '4px' }}
                        title="Delete Organization"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
          <button 
            onClick={() => setPage(p => Math.max(0, p - 1))} 
            disabled={page === 0}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ArrowLeft size={16} /> Previous
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Page {page + 1}</span>
          <button 
            onClick={() => setPage(p => p + 1)} 
            disabled={!hasMore}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            Next <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Provision New Organization">
        <form onSubmit={handleCreateOrg}>
          <div className="form-group">
            <label>Organization Name</label>
            <input name="name" required className="form-input" placeholder="E.g., Acme Corp Global" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn" style={{ background: '#ef4444' }}>Provision Tenant</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
