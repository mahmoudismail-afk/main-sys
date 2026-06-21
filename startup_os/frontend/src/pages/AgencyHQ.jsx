import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Target, BookOpen, Lightbulb } from 'lucide-react';
import Modal from '../components/Modal';

export default function AgencyHQ() {
  const [okrs, setOkrs] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isOkrModalOpen, setOkrModalOpen] = useState(false);
  const [isDecisionModalOpen, setDecisionModalOpen] = useState(false);

  const fetchOkrs = async () => {
    const { data, error } = await supabase.from('okrs').select('*').order('created_at', { ascending: false }).limit(5);
    if (error) alert(`Error loading OKRs: ${error.message}`);
    setOkrs(data || []);
  };

  const fetchDecisions = async () => {
    const { data, error } = await supabase.from('decisions_log').select('*').order('created_at', { ascending: false }).limit(5);
    if (error) alert(`Error loading decisions: ${error.message}`);
    setDecisions(data || []);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        await Promise.all([fetchOkrs(), fetchDecisions()]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleOkrSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title');
    const description = formData.get('description');
    const type = formData.get('type');
    const status = formData.get('status');
    const quarter = formData.get('quarter');

    // We pass `name: title` to satisfy legacy database schemas that had a strict 'name' column instead of 'title'
    const { error } = await supabase.from('okrs').insert([{ name: title, title, description, type, status, quarter }]);
    if (error) {
      alert(`Error saving OKR: ${error.message}`);
    } else {
      setOkrModalOpen(false);
      fetchOkrs();
    }
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title');
    const context = formData.get('context');
    const rationale = formData.get('rationale');
    const outcome = formData.get('outcome');

    const { error } = await supabase.from('decisions_log').insert([{ title, context, rationale, outcome }]);
    if (error) {
      alert(`Error saving decision: ${error.message}`);
    } else {
      setDecisionModalOpen(false);
      fetchDecisions();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Agency HQ</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome to the Command Center. Manage your strategy, objectives, and knowledge base here.</p>
      </div>

      {loading ? (
        <div className="loader">Loading Agency HQ...</div>
      ) : (
        <div className="dashboard-grid">
          
          <div className="glass-panel">
            <h2><Target size={20} color="var(--accent-primary)" /> Active OKRs</h2>
            {okrs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No OKRs found. Time to set some goals!</p>
            ) : (
              okrs.map(okr => (
                <div key={okr.id} className="list-item">
                  <span>{okr.title || okr.name}</span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {okr.quarter && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>{okr.quarter}</span>}
                    <span className={`badge ${okr.status === 'completed' ? 'completed' : 'pending'}`}>{okr.status}</span>
                  </div>
                </div>
              ))
            )}
            <button className="primary-btn" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setOkrModalOpen(true)}>+ New Objective</button>
          </div>

          <div className="glass-panel">
            <h2><Lightbulb size={20} color="#f59e0b" /> Recent Decisions</h2>
            {decisions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No strategic decisions logged yet.</p>
            ) : (
              decisions.map(dec => (
                <div key={dec.id} className="list-item">
                  <span>{dec.title}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dec.outcome}</span>
                </div>
              ))
            )}
            <button className="primary-btn" style={{ width: '100%', marginTop: '1rem', background: 'rgba(255,255,255,0.1)' }} onClick={() => setDecisionModalOpen(true)}>Log Decision</button>
          </div>

        </div>
      )}

      <Modal isOpen={isOkrModalOpen} onClose={() => setOkrModalOpen(false)} title="New Objective">
        <form onSubmit={handleOkrSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input name="title" required className="form-input" placeholder="E.g., Increase Q3 Revenue by 20%" />
          </div>
          <div className="form-group">
            <label>Quarter</label>
            <input name="quarter" required className="form-input" placeholder="E.g., Q3 2026" defaultValue={`Q${Math.floor((new Date().getMonth() + 3) / 3)} ${new Date().getFullYear()}`} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" className="form-textarea" placeholder="Brief description of the objective..." />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select name="type" className="form-select">
              <option value="objective">Objective</option>
              <option value="key_result">Key Result</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" className="form-select">
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setOkrModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Objective</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDecisionModalOpen} onClose={() => setDecisionModalOpen(false)} title="Log Strategic Decision">
        <form onSubmit={handleDecisionSubmit}>
          <div className="form-group">
            <label>Decision Title</label>
            <input name="title" required className="form-input" placeholder="E.g., Switched to Cloudflare Workers" />
          </div>
          <div className="form-group">
            <label>Context</label>
            <textarea name="context" className="form-textarea" placeholder="What was the situation?" />
          </div>
          <div className="form-group">
            <label>Rationale</label>
            <textarea name="rationale" className="form-textarea" placeholder="Why was this decision made?" />
          </div>
          <div className="form-group">
            <label>Outcome / Expected Result</label>
            <input name="outcome" className="form-input" placeholder="E.g., Reduced latency by 50ms" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setDecisionModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Log Decision</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
