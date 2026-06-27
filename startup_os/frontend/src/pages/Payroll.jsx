import { useEffect, useState } from 'react';
import { useOrg } from '../lib/useOrg';
import { supabase } from '../lib/supabase';
import { Users, Banknote, PlusCircle } from 'lucide-react';
import Modal from '../components/Modal';

export default function Payroll() {
  const { orgId } = useOrg();
  const [payroll, setPayroll] = useState([]);
  const [dividends, setDividends] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isPayrollModalOpen, setPayrollModalOpen] = useState(false);
  const [isDividendModalOpen, setDividendModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: payData, error: err1 },
        { data: divData, error: err2 },
        { data: stkData, error: err3 }
      ] = await Promise.all([
        supabase.from('payroll').select('*').order('date', { ascending: false }),
        supabase.from('dividends').select('*, business_equity(stakeholder_name)').order('date', { ascending: false }),
        supabase.from('business_equity').select('id, stakeholder_name')
      ]);
      
      if (err1) alert(`Error loading payroll: ${err1.message}`);
      if (err2) alert(`Error loading dividends: ${err2.message}`);
      if (err3) alert(`Error loading stakeholders: ${err3.message}`);

      setPayroll(payData || []);
      setDividends(divData || []);
      setStakeholders(stkData || []);
    } catch (err) {
      console.error(err);
      alert(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePayrollSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      employee_name: formData.get('employee_name'),
      role: formData.get('role'),
      organization_id: orgId,
      amount: formData.get('amount'),
      type: formData.get('type'),
      date: formData.get('date')
    };

    const { error } = await supabase.from('payroll').insert([payload]);
    if (error) {
      alert(`Error logging payroll: ${error.message}\nMake sure you ran schema_v19`);
    } else {
      setPayrollModalOpen(false);
      fetchData();
    }
  };

  const handleDividendSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      stakeholder_id: formData.get('stakeholder_id'),
      amount: formData.get('amount'),
      organization_id: orgId,
      type: formData.get('type'),
      date: formData.get('date'),
      status: formData.get('status')
    };

    const { error } = await supabase.from('dividends').insert([payload]);
    if (error) {
      alert(`Error logging dividend: ${error.message}\nMake sure you ran schema_v19`);
    } else {
      setDividendModalOpen(false);
      fetchData();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Payroll & Distributions</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage employee salaries, contractor payouts, and owner dividends.</p>
      </div>

      {loading ? <div className="loader">Loading Payroll Data...</div> : (
        <div className="dashboard-grid">
          
          {/* Payroll Section */}
          <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} color="var(--accent-primary)" /> Payroll History</h2>
              <button className="primary-btn" onClick={() => setPayrollModalOpen(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>+ Log Payroll</button>
            </div>

            {payroll.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No payroll logged.</p> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payroll.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{p.employee_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.role}</td>
                      <td><span className="badge" style={{ textTransform: 'capitalize' }}>{p.type}</span></td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>${Number(p.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Dividends Section */}
          <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Banknote size={20} color="#f59e0b" /> Owner Dividends</h2>
              <button className="primary-btn" onClick={() => setDividendModalOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>+ Distribute Cash</button>
            </div>

            {dividends.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No dividends distributed.</p> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Stakeholder</th>
                    <th>Ledger Type</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {dividends.map(d => (
                    <tr key={d.id}>
                      <td>{new Date(d.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{d.business_equity?.stakeholder_name || 'Unknown'}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: d.type === 'allocation' ? '#f59e0b' : '#10b981', background: d.type === 'allocation' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'capitalize' }}>
                          {d.type || 'payout'}
                        </span>
                      </td>
                      <td><span className="badge completed" style={{ textTransform: 'capitalize' }}>{d.status}</span></td>
                      <td style={{ color: d.type === 'allocation' ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                        {d.type === 'allocation' ? '+' : '-'}${Number(d.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

      {/* Payroll Modal */}
      <Modal isOpen={isPayrollModalOpen} onClose={() => setPayrollModalOpen(false)} title="Log Payroll Run">
        <form onSubmit={handlePayrollSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Employee / Contractor Name</label>
              <input name="employee_name" required className="form-input" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input name="role" required className="form-input" placeholder="E.g., Developer, Assistant" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Amount ($)</label>
              <input name="amount" type="number" step="0.01" required className="form-input" placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select name="type" className="form-select">
                <option value="salary">Salary</option>
                <option value="contractor">Contractor Fee</option>
                <option value="bonus">Bonus</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input name="date" type="date" required className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setPayrollModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Payroll</button>
          </div>
        </form>
      </Modal>

      {/* Dividend Modal */}
      <Modal isOpen={isDividendModalOpen} onClose={() => setDividendModalOpen(false)} title="Distribute Dividend">
        <form onSubmit={handleDividendSubmit}>
          <div className="form-group">
            <label>Stakeholder</label>
            <select name="stakeholder_id" required className="form-select">
              <option value="">Select Stakeholder...</option>
              {stakeholders.map(s => <option key={s.id} value={s.id}>{s.stakeholder_name}</option>)}
            </select>
            {stakeholders.length === 0 && <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.5rem' }}>No stakeholders found. Add them in the Equity page first.</p>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Amount ($)</label>
              <input name="amount" type="number" step="0.01" required className="form-input" placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Ledger Type</label>
              <select name="type" className="form-select">
                <option value="payout">Cash Payout (Withdrawal)</option>
                <option value="allocation">Wallet Allocation (Credit)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Status</label>
              <select name="status" className="form-select">
                <option value="distributed">Distributed / Settled</option>
                <option value="planned">Planned</option>
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input name="date" type="date" required className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setDividendModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Dividend</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
