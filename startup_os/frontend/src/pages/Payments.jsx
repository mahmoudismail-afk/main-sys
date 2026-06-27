import { useEffect, useState } from 'react';
import { useOrg } from '../lib/useOrg';
import { supabase } from '../lib/supabase';
import { CreditCard, PlusCircle, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

export default function Payments() {
  const { orgId } = useOrg();
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: paymentsData },
        { data: invoicesData },
        { data: clientsData }
      ] = await Promise.all([
        supabase.from('payments').select('*, clients(name), invoices(id, amount)').order('payment_date', { ascending: false }),
        supabase.from('invoices').select('id, amount, client_id, status'),
        supabase.from('clients').select('id, name')
      ]);
      setPayments(paymentsData || []);
      setInvoices(invoicesData || []);
      setClients(clientsData || []);
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
    const invoiceId = formData.get('invoice_id');
    
    // Automatically find client from invoice if selected
    let finalClientId = formData.get('client_id');
    if (invoiceId) {
      const matchedInvoice = invoices.find(inv => inv.id === invoiceId);
      if (matchedInvoice) finalClientId = matchedInvoice.client_id;
    }

    const payload = {
      amount: formData.get('amount'),
      organization_id: orgId,
      payment_method: formData.get('payment_method'),
      payment_date: formData.get('payment_date'),
      reference_id: formData.get('reference_id') || null,
      invoice_id: invoiceId || null,
      client_id: finalClientId || null
    };

    const { error } = await supabase.from('payments').insert([payload]);
    if (error) {
      alert(`Error logging payment: ${error.message}`);
      return;
    }
    
    // If it was linked to an invoice, let's mark the invoice as paid
    if (invoiceId) {
      await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId);
    }

    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) {
      alert(`Error deleting payment: ${error.message}`);
    } else {
      fetchData();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Payments Ledger</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track incoming cash deposits and reconcile invoices.</p>
        </div>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}><PlusCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> Log Payment</button>
      </div>

      {loading ? <div className="loader">Loading Ledger...</div> : (
        <div className="glass-panel">
          {payments.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No payments recorded.</p> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Invoice Link</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500 }}>{p.clients?.name || 'Direct Deposit'}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>${Number(p.amount).toLocaleString()}</td>
                    <td><span className="badge">{p.payment_method}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{p.reference_id || '--'}</td>
                    <td>{p.invoice_id ? 'Linked' : '--'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => handleDelete(p.id)} title="Delete Payment" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Incoming Payment">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Amount Received ($)</label>
              <input name="amount" type="number" step="0.01" required className="form-input" placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Date Received</label>
              <input name="payment_date" type="date" required className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Payment Method</label>
              <select name="payment_method" className="form-select">
                <option value="Main Cash">Main Cash</option>
                <option value="Whish">Whish</option>
              </select>
            </div>
            <div className="form-group">
              <label>Reference ID (Txn Hash)</label>
              <input name="reference_id" className="form-input" placeholder="Optional" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div className="form-group">
              <label>Reconcile to Open Invoice</label>
              <select name="invoice_id" className="form-select">
                <option value="">None (Direct Deposit / Old)</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>${inv.amount} - {clients.find(c => c.id === inv.client_id)?.name || 'Unknown'}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Auto-marks invoice as Paid.</p>
            </div>
            
            <div className="form-group">
              <label>Or select Client manually</label>
              <select name="client_id" className="form-select">
                <option value="">Select Client (if no invoice)...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Only needed if not selecting an invoice.</p>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Payment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
