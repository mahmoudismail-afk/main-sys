import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, PlusCircle, Settings } from 'lucide-react';
import Modal from '../components/Modal';

export default function Engagements() {
  const [engagements, setEngagements] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: engData },
        { data: clientData }
      ] = await Promise.all([
        supabase.from('engagements').select('*, clients(name)').order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name')
      ]);
      setEngagements(engData || []);
      setClients(clientData || []);
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
    
    const isAutoInvoice = formData.get('auto_invoice') === 'on';
    const setupFee = formData.get('setup_fee');

    const payload = {
      client_id: formData.get('client_id'),
      name: formData.get('name'),
      contract_value: formData.get('contract_value'),
      setup_fee: setupFee ? parseFloat(setupFee) : null,
      start_date: formData.get('start_date') || null,
      end_date: formData.get('end_date') || null,
      status: formData.get('status') || 'active',
      auto_invoice: isAutoInvoice,
      billing_cycle: isAutoInvoice ? formData.get('billing_cycle') : null,
      next_invoice_date: isAutoInvoice ? formData.get('next_invoice_date') : null
    };

    let data, error;

    if (editItem) {
      const res = await supabase.from('engagements').update(payload).eq('id', editItem.id).select();
      data = res.data;
      error = res.error;
    } else {
      const res = await supabase.from('engagements').insert([payload]).select();
      data = res.data;
      error = res.error;
    }
    
    if (error) {
      alert(`Error: ${error.message}\nMake sure to run schema_v11_setup_fee.sql`);
    } else {
      // Only generate initial invoices if this is a brand new engagement
      if (!editItem && data && data.length > 0) {
        const today = new Date();
        const due = new Date(today);
        due.setDate(due.getDate() + 14); // Net 14 terms
        
        const invoicePromises = [];

        // 1. Invoice the Setup Fee if it exists
        if (setupFee) {
          invoicePromises.push(
            supabase.from('invoices').insert([{
              client_id: data[0].client_id,
              engagement_id: data[0].id,
              amount: parseFloat(setupFee),
              status: 'draft',
              due_date: due.toISOString()
            }])
          );
        }

        // 2. Invoice the Contract Value if auto-invoice is turned on
        if (isAutoInvoice && data[0].contract_value) {
          invoicePromises.push(
            supabase.from('invoices').insert([{
              client_id: data[0].client_id,
              engagement_id: data[0].id,
              amount: parseFloat(data[0].contract_value),
              status: 'draft',
              due_date: due.toISOString()
            }])
          );
        }

        if (invoicePromises.length > 0) {
          const results = await Promise.all(invoicePromises);
          for (const res of results) {
            if (res.error) alert(`Error creating auto-invoice: ${res.error.message}`);
          }
        }
      }
      setIsModalOpen(false);
      setEditItem(null);
      fetchData();
    }
  };

  const handleAdd = () => {
    setEditItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setIsModalOpen(true);
  };

  const toggleAutoInvoice = async (id, currentVal) => {
    await supabase.from('engagements').update({ auto_invoice: !currentVal }).eq('id', id);
    fetchData();
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Engagements & Retainers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage client contracts and control the auto-invoicing engine.</p>
        </div>
        <button className="primary-btn" onClick={handleAdd}><PlusCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> Add Engagement</button>
      </div>

      {loading ? <div className="loader">Loading Contracts...</div> : (
        <div className="glass-panel">
          {engagements.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No active engagements.</p> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Engagement Name</th>
                  <th>Value</th>
                  <th>Timeline</th>
                  <th>Status</th>
                  <th>Auto-Invoice Engine</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {engagements.map(eng => (
                  <tr key={eng.id}>
                    <td style={{ fontWeight: 600 }}>{eng.clients?.name}</td>
                    <td>{eng.name}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>${Number(eng.contract_value).toLocaleString()}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {eng.start_date ? new Date(eng.start_date).toLocaleDateString() : 'TBD'} - {eng.end_date ? new Date(eng.end_date).toLocaleDateString() : 'Ongoing'}
                    </td>
                    <td><span className={`badge ${eng.status === 'active' ? 'completed' : 'pending'}`}>{eng.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button 
                          onClick={() => toggleAutoInvoice(eng.id, eng.auto_invoice)}
                          style={{
                            background: eng.auto_invoice ? '#10b981' : 'var(--bg-primary)',
                            color: eng.auto_invoice ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${eng.auto_invoice ? '#10b981' : 'var(--border-color)'}`,
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Settings size={12} /> {eng.auto_invoice ? 'ON' : 'OFF'}
                        </button>
                        {eng.auto_invoice && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {eng.billing_cycle} (Next: {eng.next_invoice_date ? new Date(eng.next_invoice_date).toLocaleDateString() : 'Set Date'})
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button onClick={() => handleEdit(eng)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <FileText size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editItem ? "Edit Engagement" : "Create New Engagement"}>
        <form onSubmit={handleSubmit} key={editItem ? editItem.id : 'new'}>
          <div className="form-group">
            <label>Client</label>
            <select name="client_id" required className="form-select" defaultValue={editItem?.client_id || ""}>
              <option value="">Select a Client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Engagement Name</label>
            <input name="name" required className="form-input" defaultValue={editItem?.name} placeholder="E.g., Website Redesign, Monthly SEO Retainer" />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Recurring Value ($)</label>
              <input name="contract_value" type="number" step="0.01" required className="form-input" defaultValue={editItem?.contract_value} placeholder="1000.00" />
            </div>
            <div className="form-group">
              <label>Initial Setup Fee ($) (Optional)</label>
              <input name="setup_fee" type="number" step="0.01" className="form-input" defaultValue={editItem?.setup_fee} placeholder="5000.00" disabled={!!editItem} />
              {editItem && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cannot edit setup fee after creation.</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Status</label>
              <select name="status" className="form-select" defaultValue={editItem?.status || "active"}>
                <option value="active">Active</option>
                <option value="planning">Planning</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input name="start_date" type="date" className="form-input" defaultValue={editItem?.start_date} />
            </div>
          </div>
          <div className="form-group">
            <label>End Date (Optional)</label>
            <input name="end_date" type="date" className="form-input" defaultValue={editItem?.end_date} />
          </div>

          <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={18} /> Auto-Invoicing Engine
            </h3>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <input type="checkbox" name="auto_invoice" id="auto_invoice" style={{ transform: 'scale(1.2)' }} defaultChecked={editItem?.auto_invoice} />
              <label htmlFor="auto_invoice" style={{ margin: 0, cursor: 'pointer' }}>Enable Automatic Billing</label>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              If enabled, the system will automatically generate a Net 14 Draft Invoice for the Contract Value on the specified cycle.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Billing Cycle</label>
                <select name="billing_cycle" className="form-select" defaultValue={editItem?.billing_cycle || "monthly"}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="semi-annually">Every 6 Months</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
              <div className="form-group">
                <label>First Invoice Date</label>
                <input name="next_invoice_date" type="date" className="form-input" defaultValue={editItem?.next_invoice_date} />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Engagement</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
