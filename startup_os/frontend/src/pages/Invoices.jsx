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
    const engagement_id = formData.get('engagement_id') || null;
    let client_id = formData.get('client_id');
    const amount = formData.get('amount');
    const status = formData.get('status');
    const due_date = formData.get('due_date') || null;
    const issued_at = formData.get('issued_at') || null;

    if (engagement_id) {
      const selectedEng = engagementsList.find(eng => eng.id === engagement_id);
      if (selectedEng) client_id = selectedEng.client_id;
    }

    if (client_id) {
      const payload = { client_id, amount, status, due_date };
      if (engagement_id) payload.engagement_id = engagement_id;
      if (issued_at) payload.issued_at = issued_at;

      const { data, error } = await supabase.from('invoices').insert([payload]).select();
      if (error) {
        alert(`Error creating invoice: ${error.message}`);
      } else {
        // Auto-generate payment if created as paid
        if (status === 'paid' && data && data.length > 0) {
          await supabase.from('payments').insert([{
            invoice_id: data[0].id,
            client_id: data[0].client_id,
            amount: data[0].amount,
            payment_method: 'Main Cash',
            payment_date: data[0].due_date || data[0].issued_at || new Date().toISOString().split('T')[0]
          }]);
        }
        setIsModalOpen(false);
        fetchData();
      }
    } else {
      alert("Please select either a Client or an Engagement");
    }
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', id);
    
    if (!error && newStatus === 'paid') {
      const invoice = invoices.find(inv => inv.id === id);
      if (invoice) {
        // Check if a payment already exists
        const { data: existingPayments } = await supabase.from('payments').select('id').eq('invoice_id', id);
        if (!existingPayments || existingPayments.length === 0) {
          await supabase.from('payments').insert([{
            invoice_id: id,
            client_id: invoice.client_id,
            amount: invoice.amount,
            payment_method: 'Main Cash',
            payment_date: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : (invoice.issued_at ? new Date(invoice.issued_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
          }]);
        }
      }
    }
    fetchData();
  };

  const updateDueDate = async (id, newDate) => {
    await supabase.from('invoices').update({ due_date: newDate || null }).eq('id', id);
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
                    <td>
                      <input 
                        type="date" 
                        className="form-input" 
                        style={{ padding: '0.25rem', fontSize: '0.75rem', width: 'auto', background: 'transparent', border: '1px solid var(--border-color)' }}
                        value={inv.due_date ? new Date(inv.due_date).toISOString().split('T')[0] : ''}
                        onChange={(e) => updateDueDate(inv.id, e.target.value)}
                      />
                    </td>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Link to Client (Required if no Engagement)</label>
              <select name="client_id" className="form-select">
                <option value="">Select Client...</option>
                {clientsList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Link to Engagement (Optional)</label>
              <select name="engagement_id" className="form-select">
                <option value="">None / Manual</option>
                {engagementsList.map(eng => {
                  const client = clientsList.find(c => c.id === eng.client_id);
                  return (
                    <option key={eng.id} value={eng.id}>{client?.name || 'Unknown'} - {eng.name}</option>
                  );
                })}
              </select>
            </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Date Issued</label>
              <input name="issued_at" type="date" required className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input name="due_date" type="date" className="form-input" />
            </div>
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
