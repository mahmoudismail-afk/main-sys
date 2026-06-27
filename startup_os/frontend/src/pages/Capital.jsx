import { useEffect, useState } from 'react';
import { useOrg } from '../lib/useOrg';
import { supabase } from '../lib/supabase';
import { Landmark, PlusCircle, Edit2, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

export default function Capital() {
  const { orgId } = useOrg();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddCapitalModalOpen, setIsAddCapitalModalOpen] = useState(false);
  const [addCapitalItem, setAddCapitalItem] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('funding_milestones').select('*').order('target_date', { ascending: true });
      if (error) alert(`Error loading capital milestones: ${error.message}`);
      setMilestones(data || []);
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
    const payload = {
      title: formData.get('title'),
      organization_id: orgId,
      target_amount: formData.get('target_amount'),
      raised_amount: formData.get('raised_amount') || 0,
      target_date: formData.get('target_date') || null,
      status: formData.get('status') || 'active'
    };

    if (editItem) {
      const { error } = await supabase.from('funding_milestones').update(payload).eq('id', editItem.id);
      if (error) {
        alert(`Error updating milestone: ${error.message}`);
      } else {
        setIsModalOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('funding_milestones').insert([payload]);
      if (error) {
        alert(`Error saving milestone: ${error.message}`);
      } else {
        setIsModalOpen(false);
        fetchData();
      }
    }
  };

  const handleAddCapitalSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const amountToAdd = Number(formData.get('amount'));
    
    const newRaised = Number(addCapitalItem.raised_amount || 0) + amountToAdd;
    const isCompleted = newRaised >= Number(addCapitalItem.target_amount);
    
    const payload = { raised_amount: newRaised };
    if (isCompleted) payload.status = 'completed';

    const { error } = await supabase.from('funding_milestones').update(payload).eq('id', addCapitalItem.id);
    if (error) {
      alert(`Error adding capital: ${error.message}`);
    } else {
      setIsAddCapitalModalOpen(false);
      fetchData();
    }
  };

  const openAddCapital = (item) => {
    setAddCapitalItem(item);
    setIsAddCapitalModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this funding milestone? This cannot be undone.")) return;
    
    const { error } = await supabase.from('funding_milestones').delete().eq('id', id);
    if (error) {
      alert(`Error deleting milestone: ${error.message}`);
    } else {
      fetchData();
    }
  };

  const calculateProgress = (raised, target) => {
    if (!target) return 0;
    const pct = (Number(raised) / Number(target)) * 100;
    return pct > 100 ? 100 : pct;
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Capital & Funding</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track investment rounds, raised capital, and runway goals.</p>
        </div>
        <button className="primary-btn" onClick={() => { setEditItem(null); setIsModalOpen(true); }}><PlusCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> Add Funding Goal</button>
      </div>

      {loading ? <div className="loader">Loading Capital...</div> : (
        <div className="dashboard-grid">
          {milestones.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No funding milestones set.</p> : (
            milestones.map(m => {
              const progress = calculateProgress(m.raised_amount, m.target_amount);
              return (
                <div key={m.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Landmark size={18} color="var(--accent-primary)" /> {m.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className={`badge ${m.status === 'completed' ? 'completed' : 'pending'}`}>{m.status}</span>
                      <button onClick={() => { setEditItem(m); setIsModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Edit Goal">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(m.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Delete Goal">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Raised: <span style={{ color: '#10b981', fontWeight: 600 }}>${Number(m.raised_amount).toLocaleString()}</span></span>
                    <span style={{ color: 'var(--text-secondary)' }}>Target: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${Number(m.target_amount).toLocaleString()}</span></span>
                  </div>

                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? '#10b981' : 'var(--accent-primary)', transition: 'width 0.5s ease' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Target Date: {m.target_date ? new Date(m.target_date).toLocaleDateString() : 'TBD'}
                    </div>
                    {m.status !== 'completed' && (
                      <button onClick={() => openAddCapital(m)} className="primary-btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <PlusCircle size={12} /> Add Cash
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editItem ? "Edit Funding Milestone" : "Add Funding Milestone"}>
        <form onSubmit={handleSubmit} key={editItem ? editItem.id : 'new'}>
          <div className="form-group">
            <label>Round Name / Goal Title</label>
            <input name="title" required className="form-input" placeholder="E.g., Seed Round, Q3 Cash Reserve" defaultValue={editItem?.title || ''} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Target Amount ($)</label>
              <input name="target_amount" type="number" required className="form-input" placeholder="1000000" defaultValue={editItem?.target_amount || ''} />
            </div>
            <div className="form-group">
              <label>Amount Already Raised ($)</label>
              <input name="raised_amount" type="number" className="form-input" defaultValue={editItem?.raised_amount || "0"} />
            </div>
          </div>
          <div className="form-group">
            <label>Target Close Date</label>
            <input name="target_date" type="date" required className="form-input" defaultValue={editItem?.target_date ? editItem.target_date.split('T')[0] : ''} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" className="form-select" defaultValue={editItem?.status || 'active'}>
              <option value="planning">Planning</option>
              <option value="active">Active Fundraising</option>
              <option value="completed">Completed / Closed</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">{editItem ? "Update Milestone" : "Save Milestone"}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddCapitalModalOpen} onClose={() => setIsAddCapitalModalOpen(false)} title={`Add Capital to ${addCapitalItem?.title}`}>
        {addCapitalItem && (
          <form onSubmit={handleAddCapitalSubmit}>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Target: <strong>${Number(addCapitalItem.target_amount).toLocaleString()}</strong><br />
                Currently Raised: <strong style={{ color: '#10b981' }}>${Number(addCapitalItem.raised_amount).toLocaleString()}</strong>
              </p>
            </div>
            
            <div className="form-group">
              <label>Amount to Add ($)</label>
              <input name="amount" type="number" step="0.01" required className="form-input" placeholder="E.g. 50000" />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setIsAddCapitalModalOpen(false)}>Cancel</button>
              <button type="submit" className="primary-btn">Record Capital Injection</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
