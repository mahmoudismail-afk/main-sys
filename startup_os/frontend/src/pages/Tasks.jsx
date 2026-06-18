import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckSquare, PlusCircle } from 'lucide-react';
import Modal from '../components/Modal';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: tasksData },
        { data: projectsData },
        { data: engData },
        { data: cliData }
      ] = await Promise.all([
        supabase.from('tasks').select('*, projects(name), engagements(name), clients(name)').order('due_date', { ascending: true }),
        supabase.from('projects').select('id, name'),
        supabase.from('engagements').select('id, name'),
        supabase.from('clients').select('id, name')
      ]);
      setTasks(tasksData || []);
      setProjects(projectsData || []);
      setEngagements(engData || []);
      setClients(cliData || []);
    } catch (err) {
      console.error(err);
      alert(`Error loading tasks: ${err.message}`);
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
      priority: formData.get('priority'),
      status: formData.get('status'),
      due_date: formData.get('due_date') || null,
      project_id: formData.get('project_id') || null,
      engagement_id: formData.get('engagement_id') || null,
      client_id: formData.get('client_id') || null
    };

    const { error } = await supabase.from('tasks').insert([payload]);
    if (error) {
      alert(`Error saving task: ${error.message}`);
    } else {
      setIsModalOpen(false);
      fetchData();
    }
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    fetchData();
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Tasks</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your daily execution across projects and engagements.</p>
        </div>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}><PlusCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> Add Task</button>
      </div>

      {loading ? <div className="loader">Loading Tasks...</div> : (
        <div className="glass-panel">
          {tasks.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No tasks assigned.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tasks.map(t => (
                <div key={t.id} className="list-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input 
                      type="checkbox" 
                      checked={t.status === 'done'} 
                      onChange={() => toggleStatus(t)} 
                      style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {t.due_date ? `Due: ${new Date(t.due_date).toLocaleDateString()}` : 'No due date'}
                        {t.clients && ` | Client: ${t.clients.name}`}
                        {t.projects && ` | Project: ${t.projects.name}`}
                        {t.engagements && ` | Engagement: ${t.engagements.name}`}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className={`badge ${t.priority === 'high' ? 'pending' : 'completed'}`}>{t.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Task">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Task Title</label>
            <input name="title" required className="form-input" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Priority</label>
              <select name="priority" className="form-select">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" className="form-select">
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input name="due_date" type="date" className="form-input" />
          </div>

          <div className="form-group">
            <label>Link to Client (Optional)</label>
            <select name="client_id" className="form-select">
              <option value="">None</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Link to Project (Optional)</label>
              <select name="project_id" className="form-select">
                <option value="">None</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Link to Engagement (Optional)</label>
              <select name="engagement_id" className="form-select">
                <option value="">None</option>
                {engagements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Task</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
