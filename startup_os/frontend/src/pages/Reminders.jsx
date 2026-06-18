import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, PlusCircle } from 'lucide-react';
import Modal from '../components/Modal';

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: remindersData },
        { data: clientsData }
      ] = await Promise.all([
        supabase.from('reminders').select('*, clients(name)').order('due_date', { ascending: true }),
        supabase.from('clients').select('id, name')
      ]);
      setReminders(remindersData || []);
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
    const payload = {
      title: formData.get('title'),
      description: formData.get('description') || null,
      due_date: formData.get('due_date') || null,
      client_id: formData.get('client_id') || null,
      status: 'pending'
    };

    await supabase.from('reminders').insert([payload]);
    setIsModalOpen(false);
    fetchData();
  };

  const markComplete = async (id) => {
    await supabase.from('reminders').update({ status: 'completed' }).eq('id', id);
    fetchData();
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reminders</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Follow-ups, alerts, and operational nudges.</p>
        </div>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}><PlusCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> Set Reminder</button>
      </div>

      {loading ? <div className="loader">Loading Reminders...</div> : (
        <div className="dashboard-grid">
          {reminders.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No active reminders.</p> : (
            reminders.map(r => (
              <div key={r.id} className="glass-panel" style={{ opacity: r.status === 'completed' ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, textDecoration: r.status === 'completed' ? 'line-through' : 'none' }}><Bell size={16} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--accent-secondary)' }}/> {r.title}</h3>
                  <span className={`badge ${r.status === 'completed' ? 'completed' : 'pending'}`}>{r.status}</span>
                </div>
                {r.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>{r.description}</p>}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{r.clients ? `Client: ${r.clients.name}` : 'General'}</span>
                  <span style={{ color: r.due_date && new Date(r.due_date) < new Date() && r.status !== 'completed' ? '#ef4444' : 'var(--text-secondary)' }}>
                    {r.due_date ? new Date(r.due_date).toLocaleDateString() : 'No date'}
                  </span>
                </div>

                {r.status !== 'completed' && (
                  <button onClick={() => markComplete(r.id)} className="btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>Mark Complete</button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Set Reminder">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Reminder Title</label>
            <input name="title" required className="form-input" placeholder="E.g., Ping CEO about contract" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" className="form-textarea" placeholder="Optional details..."></textarea>
          </div>
          <div className="form-group">
            <label>Link to Client (Optional)</label>
            <select name="client_id" className="form-select">
              <option value="">General</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input name="due_date" type="date" required className="form-input" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Reminder</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
