import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Briefcase, PlusCircle, Pencil, Landmark, ShieldAlert, ArrowRightCircle, Download, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

export default function Equity() {
  const [equity, setEquity] = useState([]);
  
  // Treasury State
  const [actualBankCash, setActualBankCash] = useState(0);
  const [minCashBuffer, setMinCashBuffer] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [walletBalances, setWalletBalances] = useState({});
  const [totalUnpaidWallets, setTotalUnpaidWallets] = useState(0);

  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isStakeholderModalOpen, setIsStakeholderModalOpen] = useState(false);
  const [isBufferModalOpen, setIsBufferModalOpen] = useState(false);
  const [isSweepModalOpen, setIsSweepModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [withdrawStakeholder, setWithdrawStakeholder] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: eqData },
        { data: expData },
        { data: payData },
        { data: divData },
        { data: capData },
        { data: paymentsData },
        { data: setData, error: setError }
      ] = await Promise.all([
        supabase.from('business_equity').select('*').order('equity_percentage', { ascending: false }),
        supabase.from('expenses').select('amount'),
        supabase.from('payroll').select('amount'),
        supabase.from('dividends').select('*'),
        supabase.from('funding_milestones').select('raised_amount'),
        supabase.from('payments').select('amount'),
        supabase.from('company_settings').select('*').eq('key', 'min_cash_buffer').single()
      ]);

      const exp = expData?.reduce((s, x) => s + Number(x.amount || 0), 0) || 0;
      const pay = payData?.reduce((s, x) => s + Number(x.amount || 0), 0) || 0;
      const cap = capData?.reduce((s, x) => s + Number(x.raised_amount || 0), 0) || 0;
      const collectedRevenue = paymentsData?.reduce((s, x) => s + Number(x.amount || 0), 0) || 0;

      let totalPayouts = 0;
      let totalAllocations = 0;
      const wBalances = {};

      divData?.forEach(d => {
        const amt = Number(d.amount || 0);
        const sid = d.stakeholder_id;
        if (!wBalances[sid]) wBalances[sid] = { allocations: 0, payouts: 0 };

        if (d.type === 'allocation') {
          totalAllocations += amt;
          wBalances[sid].allocations += amt;
        } else {
          totalPayouts += amt;
          wBalances[sid].payouts += amt;
        }
      });

      const unpaidWallets = totalAllocations - totalPayouts;
      
      // Actual cash in bank = Capital + Revenue - All Operating Expenses - Payouts
      const bankCash = cap + collectedRevenue - exp - pay - totalPayouts;

      setEquity(eqData || []);
      setActualBankCash(bankCash);
      setTotalExpenses(exp + pay); 
      setWalletBalances(wBalances);
      setTotalUnpaidWallets(unpaidWallets);
      
      if (setData) {
        setMinCashBuffer(Number(setData.value?.amount || 0));
      } else if (setError && setError.code !== 'PGRST116') {
        console.error("Error fetching settings", setError);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStakeholderSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      stakeholder_name: formData.get('stakeholder_name'),
      role: formData.get('role'),
      equity_percentage: formData.get('equity_percentage'),
      shares_held: formData.get('shares_held') ? parseInt(formData.get('shares_held')) : null
    };

    let error;
    if (editItem) {
      const res = await supabase.from('business_equity').update(payload).eq('id', editItem.id);
      error = res.error;
    } else {
      const res = await supabase.from('business_equity').insert([payload]);
      error = res.error;
    }

    if (error) alert(`Error: ${error.message}`);
    else {
      setIsStakeholderModalOpen(false);
      fetchData();
    }
  };

  const handleBufferSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const amount = parseFloat(formData.get('amount') || 0);
    
    const { error } = await supabase.from('company_settings').upsert({
      key: 'min_cash_buffer',
      value: { amount }
    });

    if (error) alert(`Error saving buffer: ${error.message}\nEnsure schema_v20 is run.`);
    else {
      setIsBufferModalOpen(false);
      fetchData();
    }
  };

  const handleSweepConfirm = async () => {
    const payloads = sweepSplits.map(s => ({
      stakeholder_id: s.stakeholder_id,
      amount: s.amount,
      type: 'allocation', // <--- This credits the wallet instead of physical payout
      status: 'allocated',
      date: new Date().toISOString().split('T')[0]
    }));

    const { error } = await supabase.from('dividends').insert(payloads);
    if (error) alert(`Error sweeping cash: ${error.message}\nEnsure schema_v21 is run.`);
    else {
      setIsSweepModalOpen(false);
      fetchData();
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const amount = parseFloat(formData.get('amount'));

    const payload = {
      stakeholder_id: withdrawStakeholder.id,
      amount: amount,
      type: 'payout', // <--- This reduces the wallet and actual bank cash
      status: 'distributed',
      date: formData.get('date')
    };

    const { error } = await supabase.from('dividends').insert([payload]);
    if (error) alert(`Error logging withdrawal: ${error.message}`);
    else {
      setIsWithdrawModalOpen(false);
      fetchData();
    }
  };

  const handleAddStakeholder = () => {
    setEditItem(null);
    setIsStakeholderModalOpen(true);
  };

  const handleEditStakeholder = (item) => {
    setEditItem(item);
    setIsStakeholderModalOpen(true);
  };

  const handleOpenWithdraw = (item) => {
    setWithdrawStakeholder(item);
    setIsWithdrawModalOpen(true);
  };

  const handleDeleteStakeholder = async (id) => {
    if (!window.confirm("Are you sure you want to completely remove this stakeholder from the Cap Table?")) return;
    const { error } = await supabase.from('business_equity').delete().eq('id', id);
    if (error) alert(`Error deleting stakeholder: ${error.message}`);
    else fetchData();
  };

  const getStakeholderWalletBalance = (id) => {
    if (!walletBalances[id]) return 0;
    return walletBalances[id].allocations - walletBalances[id].payouts;
  };

  const totalAllocated = equity.reduce((acc, curr) => acc + Number(curr.equity_percentage || 0), 0);
  const distributableCash = Math.max(0, actualBankCash - minCashBuffer - totalUnpaidWallets);

  const sweepSplits = equity.map(eq => ({
    stakeholder_id: eq.id,
    name: eq.stakeholder_name,
    percentage: Number(eq.equity_percentage || 0),
    amount: (distributableCash * (Number(eq.equity_percentage || 0) / 100))
  })).filter(s => s.amount > 0);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Business Equity & Treasury</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your Cap Table, safe runway, and stakeholder dividend wallets.</p>
      </div>

      {loading ? <div className="loader">Auditing Treasury...</div> : (
        <div className="dashboard-grid">
          
          {/* TREASURY COMMAND CENTER */}
          <div className="glass-panel" style={{ gridColumn: '1 / -1', border: '1px solid var(--accent-primary)', background: 'rgba(59, 130, 246, 0.05)' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
              <Landmark size={24} /> Treasury Command Center
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Actual Bank Cash</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  ${actualBankCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Capital + Collected Revenue - All Expenses & Payouts</p>
              </div>

              <div>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Min Cash Buffer (Runway)</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  ${minCashBuffer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <button onClick={() => setIsBufferModalOpen(true)} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>Edit Buffer</button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Total historical expenses/payroll: ${totalExpenses.toLocaleString()}</p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#10b981', marginBottom: '0.5rem' }}>Distributable Cash (Excess)</h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>
                  ${distributableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {distributableCash > 0 ? (
                  <button onClick={() => setIsSweepModalOpen(true)} className="primary-btn" style={{ marginTop: '1rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <ArrowRightCircle size={18} /> Sweep to Wallets
                  </button>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>No excess cash above buffer & wallets.</p>
                )}
              </div>
            </div>
          </div>

          {/* CAP TABLE & WALLETS */}
          <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Cap Table & Internal Wallets</h2>
              <button className="primary-btn" onClick={handleAddStakeholder}><PlusCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> Add Stakeholder</button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 600 }}>Total Allocated Equity: </span>
                <span style={{ color: totalAllocated > 100 ? '#ef4444' : totalAllocated === 100 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                  {totalAllocated.toFixed(2)}%
                </span>
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Total Owed to Wallets: </span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>
                  ${totalUnpaidWallets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {equity.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No stakeholders added yet.</p> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Stakeholder Name</th>
                    <th>Ownership %</th>
                    <th>Wallet Balance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {equity.map(eq => {
                    const bal = getStakeholderWalletBalance(eq.id);
                    return (
                      <tr key={eq.id}>
                        <td style={{ fontWeight: 600 }}>
                          {eq.stakeholder_name}
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{eq.role}</div>
                        </td>
                        <td style={{ color: '#3b82f6', fontWeight: 600 }}>{Number(eq.equity_percentage).toFixed(2)}%</td>
                        <td style={{ color: bal > 0 ? '#10b981' : 'var(--text-secondary)', fontWeight: 600 }}>
                          ${bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button onClick={() => handleOpenWithdraw(eq)} disabled={bal <= 0} className={bal > 0 ? 'primary-btn' : 'btn-secondary'} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: bal <= 0 ? 0.5 : 1 }}>
                              <Download size={14} /> Withdraw
                            </button>
                            <button onClick={() => handleEditStakeholder(eq)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDeleteStakeholder(eq.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

      {/* Stakeholder Modal */}
      <Modal isOpen={isStakeholderModalOpen} onClose={() => setIsStakeholderModalOpen(false)} title={editItem ? "Edit Stakeholder" : "Add Stakeholder"}>
        <form onSubmit={handleStakeholderSubmit} key={editItem ? editItem.id : 'new'}>
          <div className="form-group">
            <label>Stakeholder Name</label>
            <input name="stakeholder_name" required className="form-input" defaultValue={editItem?.stakeholder_name} placeholder="E.g., Jane Doe, Acme Ventures" />
          </div>
          <div className="form-group">
            <label>Role</label>
            <input name="role" required className="form-input" defaultValue={editItem?.role} placeholder="E.g., Co-Founder, Lead Investor" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Equity Percentage (%)</label>
              <input name="equity_percentage" type="number" step="0.01" required className="form-input" defaultValue={editItem?.equity_percentage} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Shares Held (Optional)</label>
              <input name="shares_held" type="number" className="form-input" defaultValue={editItem?.shares_held} placeholder="1000000" />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsStakeholderModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">{editItem ? "Save Changes" : "Save Stakeholder"}</button>
          </div>
        </form>
      </Modal>

      {/* Buffer Modal */}
      <Modal isOpen={isBufferModalOpen} onClose={() => setIsBufferModalOpen(false)} title="Set Min Cash Buffer">
        <form onSubmit={handleBufferSubmit}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}><ShieldAlert size={16} /> Safe Runway Target</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Enter the flat dollar amount you want to keep locked in the business bank account before allowing profit distributions. 
              (E.g., calculate your monthly burn rate and multiply by 3 or 6 months).
            </p>
          </div>

          <div className="form-group">
            <label>Buffer Amount ($)</label>
            <input name="amount" type="number" step="0.01" required className="form-input" defaultValue={minCashBuffer} placeholder="100000.00" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsBufferModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Target</button>
          </div>
        </form>
      </Modal>

      {/* Sweep Confirmation Modal */}
      <Modal isOpen={isSweepModalOpen} onClose={() => setIsSweepModalOpen(false)} title="Confirm Treasury Sweep">
        <div>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            The system will instantly allocate <strong>${distributableCash.toLocaleString()}</strong> into your stakeholders' internal wallets based on their cap table percentages.
          </p>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Wallet Allocation Preview</h4>
            {sweepSplits.map((split, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>{split.name} <span style={{ color: 'var(--text-secondary)' }}>({split.percentage}%)</span></span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>+${split.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsSweepModalOpen(false)}>Cancel</button>
            <button type="button" className="primary-btn" onClick={handleSweepConfirm}>Confirm Sweep</button>
          </div>
        </div>
      </Modal>

      {/* Withdraw Modal */}
      <Modal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} title="Process Withdrawal (Payout)">
        {withdrawStakeholder && (
          <form onSubmit={handleWithdrawSubmit}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-primary)' }}>{withdrawStakeholder.stakeholder_name}'s Wallet</h4>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                ${getStakeholderWalletBalance(withdrawStakeholder.id).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Logging a withdrawal marks the cash as physically transferred out of your actual bank account.
              </p>
            </div>

            <div className="form-group">
              <label>Withdrawal Amount ($)</label>
              <input name="amount" type="number" step="0.01" required className="form-input" placeholder={`E.g. 5000.00`} />
            </div>
            
            <div className="form-group">
              <label>Date Paid</label>
              <input name="date" type="date" required className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setIsWithdrawModalOpen(false)}>Cancel</button>
              <button type="submit" className="primary-btn">Log Cash Payout</button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
