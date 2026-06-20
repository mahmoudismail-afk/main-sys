import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users2, PlusCircle, Pencil } from 'lucide-react';
import Modal from '../components/Modal';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('leads_pipeline').select('*').order('created_at', { ascending: false });
      setLeads(data || []);
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
      client_name: formData.get('client_name'),
      stage: formData.get('stage'),
      value: formData.get('value') || 0,
      close_date: formData.get('close_date') || null
    };

    if (editItem) {
      await supabase.from('leads_pipeline').update(payload).eq('id', editItem.id);
    } else {
      await supabase.from('leads_pipeline').insert([payload]);
    }
    
    setIsModalOpen(false);
    setEditItem(null);
    fetchData();
  };

  const handleAdd = () => {
    setEditItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (lead) => {
    setEditItem(lead);
    setIsModalOpen(true);
  };

  const updateStage = async (id, stage) => {
    await supabase.from('leads_pipeline').update({ stage }).eq('id', id);
    fetchData();
  };

  const stages = ['Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Possible Clients</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your sales pipeline and forecast future revenue.</p>
        </div>
        <button className="primary-btn" onClick={handleAdd}><PlusCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> Add Lead</button>
      </div>

      {loading ? <div className="loader">Loading Pipeline...</div> : (
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          {stages.map(stage => (
            <div key={stage} style={{ flex: '0 0 300px', background: 'var(--bg-panel)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {stage} 
                <span className="badge">{leads.filter(l => l.stage === stage).length}</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {leads.filter(l => l.stage === stage).map(lead => (
                  <div key={lead.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{lead.client_name}</div>
                      <button onClick={() => handleEdit(lead)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <Pencil size={14} />
                      </button>
                    </div>
                    <div style={{ color: '#10b981', fontWeight: 500, marginBottom: '0.5rem' }}>${Number(lead.value).toLocaleString()}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Close: {lead.close_date ? new Date(lead.close_date).toLocaleDateString() : 'TBD'}
                    </div>
                    <select 
                      className="form-select" 
                      style={{ padding: '0.25rem', fontSize: '0.8rem' }} 
                      value={lead.stage}
                      onChange={(e) => updateStage(lead.id, e.target.value)}
                    >
                      {stages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editItem ? "Edit Lead" : "Add Lead"}>
        <form onSubmit={handleSubmit} key={editItem ? editItem.id : 'new'}>
          <div className="form-group">
            <label>Prospect Name / Company</label>
            <input name="client_name" required className="form-input" defaultValue={editItem?.client_name} placeholder="E.g., Globex Corp" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Estimated Value ($)</label>
              <input name="value" type="number" step="0.01" className="form-input" defaultValue={editItem?.value} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Projected Close Date</label>
              <input name="close_date" type="date" className="form-input" defaultValue={editItem?.close_date} />
            </div>
          </div>
          <div className="form-group">
            <label>Current Stage</label>
            <select name="stage" className="form-select" defaultValue={editItem?.stage || "Discovery"}>
              {stages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Lead</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
