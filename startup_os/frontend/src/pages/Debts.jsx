import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Landmark, Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import Modal from '../components/Modal';

export default function Debts() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDebt, setEditDebt] = useState(null);

  const fetchDebts = async () => {
    const { data, error } = await supabase.from('debts').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching debts:', error);
    } else {
      setDebts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      debtor_name: formData.get('debtor_name'),
      amount: parseFloat(formData.get('amount')),
      currency_code: formData.get('currency_code') || 'USD',
      due_date: formData.get('due_date'),
      status: formData.get('status'),
      notes: formData.get('notes'),
    };

    let error;
    if (editDebt) {
      const { error: updateError } = await supabase.from('debts').update(payload).eq('id', editDebt.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('debts').insert([payload]);
      error = insertError;
    }

    if (error) {
      alert(`Error saving debt: ${error.message}`);
    } else {
      setIsModalOpen(false);
      fetchDebts();
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase.from('debts').update({ status: newStatus }).eq('id', id);
    if (error) alert(error.message);
    else fetchDebts();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Debt Tracking</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage accounts receivable, outstanding ledgers, and debtor compliance.</p>
        </div>
        <button className="primary-btn" onClick={() => { setEditDebt(null); setIsModalOpen(true); }}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> New Debt Record
        </button>
      </div>

      <div className="glass-panel">
        {loading ? (
          <div className="loader">Loading debts...</div>
        ) : debts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Landmark size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>No outstanding debts found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Debtor</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Due Date</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {debts.map(debt => (
                  <tr key={debt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 500 }}>{debt.debtor_name}</div>
                      {debt.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{debt.notes}</div>}
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                      {debt.amount.toLocaleString()} {debt.currency_code}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {debt.due_date ? new Date(debt.due_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <select 
                        value={debt.status} 
                        onChange={(e) => handleStatusChange(debt.id, e.target.value)}
                        style={{
                          background: debt.status === 'cleared' || debt.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 
                                     debt.status === 'defaulted' || debt.status === 'canceled' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: debt.status === 'cleared' || debt.status === 'paid' ? '#10b981' : 
                                 debt.status === 'defaulted' || debt.status === 'canceled' ? '#ef4444' : '#f59e0b',
                          border: 'none',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                        <option value="canceled">Canceled</option>
                        <option value="cleared">Cleared</option>
                        <option value="defaulted">Defaulted</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => { setEditDebt(debt); setIsModalOpen(true); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginRight: '1rem' }}
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editDebt ? "Edit Debt Ledger" : "New Debt Ledger"}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Debtor Name</label>
            <input name="debtor_name" required className="form-input" defaultValue={editDebt?.debtor_name} placeholder="E.g., Acme Corp" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Amount</label>
              <input name="amount" type="number" step="0.01" required className="form-input" defaultValue={editDebt?.amount} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <input name="currency_code" required className="form-input" defaultValue={editDebt?.currency_code || 'USD'} maxLength={3} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Due Date</label>
              <input name="due_date" type="date" className="form-input" defaultValue={editDebt?.due_date} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" className="form-select" defaultValue={editDebt?.status || 'pending'}>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="canceled">Canceled</option>
                <option value="cleared">Cleared</option>
                <option value="defaulted">Defaulted</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea name="notes" className="form-textarea" defaultValue={editDebt?.notes} placeholder="Optional context or references..." />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">{editDebt ? "Update Ledger" : "Create Ledger"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
