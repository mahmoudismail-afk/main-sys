import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Landmark, Plus, Edit, Trash2, DollarSign, PlusCircle } from 'lucide-react';
import Modal from '../components/Modal';

export default function Debts() {
  const [debts, setDebts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDebt, setEditDebt] = useState(null);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const [debtsRes, paymentsRes] = await Promise.all([
      supabase.from('debts').select('*').order('created_at', { ascending: false }),
      supabase.from('debt_payments').select('*')
    ]);

    if (debtsRes.error) console.error('Error fetching debts:', debtsRes.error);
    if (paymentsRes.error) console.error('Error fetching debt payments:', paymentsRes.error);

    setDebts(debtsRes.data || []);
    setPayments(paymentsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
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
      fetchData();
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const amount = parseFloat(formData.get('amount'));
    
    // Insert the payment record
    const { error: paymentError } = await supabase.from('debt_payments').insert([{
      debt_id: paymentDebt.id,
      amount: amount,
      payment_date: new Date().toISOString().split('T')[0],
      notes: formData.get('notes')
    }]);

    if (paymentError) {
      alert(`Error logging payment: ${paymentError.message}`);
      return;
    }

    // Check if debt is fully paid
    const currentPaid = getAmountPaid(paymentDebt.id);
    const newTotalPaid = currentPaid + amount;
    
    if (newTotalPaid >= paymentDebt.amount && paymentDebt.status !== 'cleared') {
      await supabase.from('debts').update({ status: 'cleared' }).eq('id', paymentDebt.id);
    } else if (newTotalPaid > 0 && paymentDebt.status === 'pending') {
      await supabase.from('debts').update({ status: 'partial' }).eq('id', paymentDebt.id);
    }

    setIsPaymentModalOpen(false);
    fetchData();
  };

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase.from('debts').update({ status: newStatus }).eq('id', id);
    if (error) alert(error.message);
    else fetchData();
  };

  const getAmountPaid = (debtId) => {
    return payments
      .filter(p => p.debt_id === debtId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const calculateProgress = (paid, total) => {
    if (!total || total === 0) return 0;
    const pct = (Number(paid) / Number(total)) * 100;
    return pct > 100 ? 100 : pct;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Debt Tracking</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage accounts receivable, outstanding ledgers, and log partial payments.</p>
        </div>
        <button className="primary-btn" onClick={() => { setEditDebt(null); setIsModalOpen(true); }}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> New Debt Record
        </button>
      </div>

      <div className="dashboard-grid">
        {loading ? (
          <div className="loader">Loading debts...</div>
        ) : debts.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Landmark size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>No outstanding debts found.</p>
          </div>
        ) : (
          debts.map(debt => {
            const amountPaid = getAmountPaid(debt.id);
            const progress = calculateProgress(amountPaid, debt.amount);
            
            return (
              <div key={debt.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Landmark size={18} color="var(--accent-primary)" /> {debt.debtor_name}
                    </h3>
                    {debt.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{debt.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                      <option value="canceled">Canceled</option>
                      <option value="cleared">Cleared</option>
                      <option value="defaulted">Defaulted</option>
                    </select>
                    <button onClick={() => { setEditDebt(debt); setIsModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Edit Details">
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Paid: <span style={{ color: '#10b981', fontWeight: 600 }}>{amountPaid.toLocaleString()} {debt.currency_code}</span></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Owed: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{Number(debt.amount).toLocaleString()} {debt.currency_code}</span></span>
                </div>

                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? '#10b981' : 'var(--accent-primary)', transition: 'width 0.5s ease' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Due: {debt.due_date ? new Date(debt.due_date).toLocaleDateString() : 'No Set Date'}
                  </div>
                  {debt.status !== 'cleared' && debt.status !== 'paid' && debt.status !== 'canceled' && (
                    <button onClick={() => { setPaymentDebt(debt); setIsPaymentModalOpen(true); }} className="primary-btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <PlusCircle size={12} /> Log Payment
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT DEBT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editDebt ? "Edit Debt Ledger" : "New Debt Ledger"}>
        <form onSubmit={handleSubmit} key={editDebt ? editDebt.id : 'new'}>
          <div className="form-group">
            <label>Debtor Name</label>
            <input name="debtor_name" required className="form-input" defaultValue={editDebt?.debtor_name} placeholder="E.g., Acme Corp" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Amount Owed</label>
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

      {/* LOG PAYMENT MODAL */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Log Payment from ${paymentDebt?.debtor_name}`}>
        {paymentDebt && (
          <form onSubmit={handlePaymentSubmit}>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Total Owed: <strong>{Number(paymentDebt.amount).toLocaleString()} {paymentDebt.currency_code}</strong><br />
                Currently Paid: <strong style={{ color: '#10b981' }}>{getAmountPaid(paymentDebt.id).toLocaleString()} {paymentDebt.currency_code}</strong><br/>
                Remaining Balance: <strong style={{ color: '#ef4444' }}>{Math.max(0, paymentDebt.amount - getAmountPaid(paymentDebt.id)).toLocaleString()} {paymentDebt.currency_code}</strong>
              </p>
            </div>
            
            <div className="form-group">
              <label>Payment Amount ({paymentDebt.currency_code})</label>
              <input name="amount" type="number" step="0.01" required className="form-input" placeholder="E.g. 500.00" defaultValue={Math.max(0, paymentDebt.amount - getAmountPaid(paymentDebt.id))} />
            </div>

            <div className="form-group">
              <label>Payment Notes / Transaction ID</label>
              <input name="notes" className="form-input" placeholder="Optional reference..." />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
              <button type="submit" className="primary-btn">Record Payment</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
