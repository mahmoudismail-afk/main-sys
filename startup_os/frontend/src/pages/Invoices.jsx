import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, PlusCircle } from 'lucide-react';
import Modal from '../components/Modal';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [engagementsList, setEngagementsList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: invData },
        { data: engData },
        { data: cliData }
      ] = await Promise.all([
        supabase.from('invoices').select('*, clients(name), engagements(name)').order('due_date', { ascending: false }),
        supabase.from('engagements').select('id, name, client_id'),
        supabase.from('clients').select('id, name')
      ]);
      setInvoices(invData || []);
      setEngagementsList(engData || []);
      setClientsList(cliData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const engagement_id = formData.get('engagement_id');
    const amount = formData.get('amount');
    const status = formData.get('status');
    const due_date = formData.get('due_date') || null;

    const selectedEng = engagementsList.find(eng => eng.id === engagement_id);
    const client_id = selectedEng ? selectedEng.client_id : null;

    if (client_id && engagement_id) {
      const { error } = await supabase.from('invoices').insert([{ client_id, engagement_id, amount, status, due_date }]);
      if (error) {
        alert(`Error creating invoice: ${error.message}`);
      } else {
        setIsModalOpen(false);
        fetchData();
      }
    } else {
      alert("Please select a valid engagement");
    }
  };

  const updateStatus = async (id, newStatus) => {
    await supabase.from('invoices').update({ status: newStatus }).eq('id', id);
    fetchData();
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'paid': return 'completed'; // Green
      case 'overdue': return 'health-poor'; // Red
      case 'sent': return 'health-warn'; // Yellow/Blue depending on css
      default: return 'pending'; // Gray
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Invoices</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage billing, draft invoices, and track outstanding balances.</p>
        </div>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}><PlusCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> Create Invoice</button>
      </div>

      {loading ? <div className="loader">Loading Invoices...</div> : (
        <div className="glass-panel">
          {invoices.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No invoices created yet.</p> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Engagement</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{inv.clients?.name || 'Unknown'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{inv.engagements?.name || 'Manual'}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>${Number(inv.amount).toLocaleString()}</td>
                    <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(inv.status)}`} style={{ textTransform: 'capitalize' }}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <select 
                        className="form-select" 
                        style={{ padding: '0.25rem', fontSize: '0.75rem', width: 'auto' }}
                        value={inv.status}
                        onChange={(e) => updateStatus(inv.id, e.target.value)}
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Invoice">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Link to Engagement</label>
            <select name="engagement_id" required className="form-select">
              <option value="">Select Engagement...</option>
              {engagementsList.map(eng => {
                const client = clientsList.find(c => c.id === eng.client_id);
                return (
                  <option key={eng.id} value={eng.id}>{client?.name || 'Unknown'} - {eng.name}</option>
                );
              })}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Amount ($)</label>
              <input name="amount" type="number" step="0.01" required className="form-input" placeholder="1000.00" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" className="form-select">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input name="due_date" type="date" required className="form-input" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Create Invoice</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
