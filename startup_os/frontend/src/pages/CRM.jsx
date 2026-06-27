import { useEffect, useState } from 'react';
import { useOrg } from '../lib/useOrg';
import { supabase } from '../lib/supabase';
import { Users, Briefcase, FileText, ExternalLink, UserPlus } from 'lucide-react';
import Modal from '../components/Modal';

export default function CRM() {
  const { orgId } = useOrg();
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [isLeadModalOpen, setLeadModalOpen] = useState(false);
  const [isMemberModalOpen, setMemberModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);

  const fetchClients = async () => {
    // We now fetch clients along with their nested client_members array
    const { data, error } = await supabase.from('clients').select('*, client_members(*)').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching clients:', error);
      alert(`Error loading clients: ${error.message}\nMake sure to run schema_v13_client_members.sql`);
    }
    setClients(data || []);
  };

  const fetchLeads = async () => {
    const { data } = await supabase.from('leads_pipeline').select('*').order('close_date', { ascending: true });
    setLeads(data || []);
  };

  const fetchEngagements = async () => {
    const { data } = await supabase.from('engagements').select('*, clients(name)').order('start_date', { ascending: false });
    setEngagements(data || []);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        await Promise.all([fetchClients(), fetchLeads(), fetchEngagements()]);
      } catch (error) {
        console.error('Error fetching CRM data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleClientSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      name: formData.get('name'),
      status: formData.get('status'),
      organization_id: orgId,
      phone: formData.get('phone') || null,
      notes: formData.get('notes') || null,
      gdrive_folder_id: formData.get('gdrive_folder_id') || null,
      billing_email: formData.get('billing_email') || null,
      billing_address: formData.get('billing_address') || null,
      tax_id: formData.get('tax_id') || null
    };

    const { error } = await supabase.from('clients').insert([payload]);
    if (error) {
      alert(`Error saving client: ${error.message}`);
    } else {
      setClientModalOpen(false);
      fetchClients();
    }
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const client_name = formData.get('client_name');
    const stage = formData.get('stage');
    const value = formData.get('value');
    const close_date = formData.get('close_date') || null;

    const { error } = await supabase.from('leads_pipeline').insert([{ client_name, stage, value, close_date, organization_id: orgId }]);
    if (error) {
      alert(`Error saving lead: ${error.message}`);
    } else {
      setLeadModalOpen(false);
      fetchLeads();
    }
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      client_id: selectedClientId,
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      email: formData.get('email') || null,
      phone: formData.get('phone') || null,
      role: formData.get('role') || null
    };

    const { error } = await supabase.from('client_members').insert([payload]);
    if (error) {
      alert(`Error saving team member: ${error.message}`);
    } else {
      setMemberModalOpen(false);
      fetchClients(); // Refresh to see the new member
    }
  };

  const openMemberModal = (clientId) => {
    setSelectedClientId(clientId);
    setMemberModalOpen(true);
  };


  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>CRM & Operations</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your active clients, leads pipeline, and ongoing engagements.</p>
        </div>
        <button className="primary-btn" onClick={() => setClientModalOpen(true)}>+ Add Client</button>
      </div>

      {loading ? (
        <div className="loader">Loading CRM...</div>
      ) : (
        <div className="dashboard-grid">
          
          {/* Active Clients */}
          <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
            <h2><Users size={20} color="var(--accent-primary)" /> Active & Onboarding Clients</h2>
            {clients.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No active clients yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {clients.map(c => (
                  <div key={c.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {c.name}
                          <span className={`badge ${c.status === 'active' ? 'completed' : 'pending'}`}>{c.status}</span>
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Billing: {c.billing_email || 'No email'} | Tax ID: {c.tax_id || 'N/A'} {c.phone && `| Phone: ${c.phone}`}
                        </p>
                        {c.notes && (
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                            "{c.notes}"
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {c.gdrive_folder_id && (
                          <a href={`https://drive.google.com/drive/folders/${c.gdrive_folder_id}`} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ExternalLink size={14} /> Drive
                          </a>
                        )}
                        <button onClick={() => openMemberModal(c.id)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <UserPlus size={14} /> Member
                        </button>
                      </div>
                    </div>
                    
                    {/* Render Client Members */}
                    {c.client_members && c.client_members.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Team Members</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                          {c.client_members.map(member => (
                            <div key={member.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                              <div style={{ fontWeight: 500 }}>{member.first_name} {member.last_name}</div>
                              <div style={{ color: 'var(--text-secondary)' }}>{member.role || 'Member'}</div>
                              {member.email && <div style={{ color: 'var(--accent-primary)', fontSize: '0.8rem' }}>{member.email}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leads Pipeline */}
          <div className="glass-panel">
            <h2><Briefcase size={20} color="#f59e0b" /> Leads Pipeline</h2>
            {leads.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Pipeline is empty.</p>
            ) : (
              leads.map(lead => (
                <div key={lead.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500 }}>{lead.client_name}</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>${lead.value?.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>Stage: <span style={{ color: 'var(--text-primary)' }}>{lead.stage}</span></span>
                    <span>Close: {lead.close_date ? new Date(lead.close_date).toLocaleDateString() : 'TBD'}</span>
                  </div>
                </div>
              ))
            )}
            <button className="primary-btn" style={{ width: '100%', marginTop: '1rem', background: 'rgba(255,255,255,0.1)' }} onClick={() => setLeadModalOpen(true)}>Add Lead</button>
          </div>

          {/* Active Engagements */}
          <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
            <h2><FileText size={20} color="var(--accent-secondary)" /> Active Engagements</h2>
            {engagements.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No active engagements.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Engagement Name</th>
                    <th>Value</th>
                    <th>Timeline</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {engagements.map(eng => (
                    <tr key={eng.id}>
                      <td style={{ fontWeight: 500 }}>{eng.clients?.name || 'Unknown'}</td>
                      <td>{eng.name}</td>
                      <td style={{ color: '#10b981' }}>${eng.contract_value?.toLocaleString()}</td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {eng.start_date ? new Date(eng.start_date).toLocaleDateString() : 'TBD'} - 
                        {eng.end_date ? new Date(eng.end_date).toLocaleDateString() : 'TBD'}
                      </td>
                      <td>
                        <span className="badge">{eng.status || 'Active'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

      {/* Add Client Modal */}
      <Modal isOpen={isClientModalOpen} onClose={() => setClientModalOpen(false)} title="Add New Client">
        <form onSubmit={handleClientSubmit}>
          <div className="form-group">
            <label>Client / Company Name</label>
            <input name="name" required className="form-input" placeholder="E.g., Acme Corp" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Status</label>
              <select name="status" className="form-select">
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input name="phone" className="form-input" placeholder="+1..." />
            </div>
          </div>
          
          <div className="form-group">
            <label>Internal Notes</label>
            <textarea name="notes" className="form-textarea" style={{ minHeight: '60px' }} placeholder="Any special instructions or context..." />
          </div>
          
          <h3 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Billing & Operations Details</h3>
          
          <div className="form-group">
            <label>Billing Email</label>
            <input name="billing_email" type="email" className="form-input" placeholder="accounts@acme.com" />
          </div>
          <div className="form-group">
            <label>Tax ID / VAT Number</label>
            <input name="tax_id" className="form-input" placeholder="Optional" />
          </div>
          <div className="form-group">
            <label>Billing Address</label>
            <textarea name="billing_address" className="form-textarea" style={{ minHeight: '60px' }} placeholder="123 Corporate Blvd..." />
          </div>
          <div className="form-group">
            <label>Google Drive Folder ID</label>
            <input name="gdrive_folder_id" className="form-input" placeholder="Optional" />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setClientModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Client</button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={isMemberModalOpen} onClose={() => setMemberModalOpen(false)} title="Add Team Member">
        <form onSubmit={handleMemberSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>First Name</label>
              <input name="first_name" required className="form-input" placeholder="John" />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input name="last_name" required className="form-input" placeholder="Doe" />
            </div>
          </div>
          <div className="form-group">
            <label>Role / Title</label>
            <input name="role" className="form-input" placeholder="E.g., CTO" />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input name="email" type="email" className="form-input" placeholder="john@acme.com" />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input name="phone" className="form-input" placeholder="+1..." />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setMemberModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Member</button>
          </div>
        </form>
      </Modal>

      {/* Add Lead Modal */}
      <Modal isOpen={isLeadModalOpen} onClose={() => setLeadModalOpen(false)} title="Add New Lead">
        <form onSubmit={handleLeadSubmit}>
          <div className="form-group">
            <label>Lead / Company Name</label>
            <input name="client_name" required className="form-input" placeholder="E.g., Globex Inc." />
          </div>
          <div className="form-group">
            <label>Stage</label>
            <select name="stage" className="form-select">
              <option value="Discovery">Discovery</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Closed Won">Closed Won</option>
              <option value="Closed Lost">Closed Lost</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estimated Value ($)</label>
            <input name="value" type="number" step="0.01" className="form-input" placeholder="10000.00" />
          </div>
          <div className="form-group">
            <label>Projected Close Date</label>
            <input name="close_date" type="date" className="form-input" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setLeadModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Lead</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
