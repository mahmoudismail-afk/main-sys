import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Server, Activity, Code } from 'lucide-react';
import Modal from '../components/Modal';

export default function Engineering() {
  const [tasks, setTasks] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isTaskModalOpen, setTaskModalOpen] = useState(false);

  const fetchTasks = async () => {
    const { data, error } = await supabase.from('roadmap_tasks').select('*').order('created_at', { ascending: false });
    if (error) alert(`Error loading roadmap tasks: ${error.message}`);
    setTasks(data || []);
  };

  const fetchDeployments = async () => {
    const { data, error } = await supabase.from('deployments').select('*, clients(name)').order('created_at', { ascending: false });
    if (error) alert(`Error loading deployments: ${error.message}`);
    setDeployments(data || []);
  };

  const fetchSyncLogs = async () => {
    const { data, error } = await supabase.from('sync_logs').select('*, deployments(clients(name))').order('synced_at', { ascending: false }).limit(10);
    if (error) alert(`Error loading sync logs: ${error.message}`);
    setSyncLogs(data || []);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        await Promise.all([fetchTasks(), fetchDeployments(), fetchSyncLogs()]);
      } catch (error) {
        console.error('Error fetching engineering data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title');
    const description = formData.get('description');
    const area = formData.get('area');
    const priority = formData.get('priority');
    const status = formData.get('status');

    const { error } = await supabase.from('roadmap_tasks').insert([{ title, description, area, priority, status }]);
    if (error) {
      alert(`Error saving roadmap task: ${error.message}`);
    } else {
      setTaskModalOpen(false);
      fetchTasks();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Engineering & Deployments</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage roadmap execution, isolated deployments, and edge sync health.</p>
      </div>

      {loading ? (
        <div className="loader">Loading Dev Wing...</div>
      ) : (
        <div className="dashboard-grid">
          
          {/* Roadmap Tasks */}
          <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
            <h2><Code size={20} color="var(--accent-primary)" /> Roadmap & Execution</h2>
            {tasks.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No pending tasks in the roadmap.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Area</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>
                        {t.title}
                        {t.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{t.description}</div>}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{t.area}</td>
                      <td>
                        <span className={`badge ${t.priority === 'high' ? 'pending' : ''}`}>{t.priority || 'Normal'}</span>
                      </td>
                      <td>{t.status || 'Backlog'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="primary-btn" style={{ marginTop: '1rem' }} onClick={() => setTaskModalOpen(true)}>+ Add Task</button>
          </div>

          {/* Sync Logs */}
          <div className="glass-panel">
            <h2><Activity size={20} color="#10b981" /> Edge Sync Logs</h2>
            {syncLogs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No sync activity detected.</p>
            ) : (
              syncLogs.map(log => (
                <div key={log.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500 }}>{log.deployments?.clients?.name || 'Unknown Client'}</span>
                    <span className={`badge ${log.status === 'error' ? 'health-poor' : 'health-good'}`}>
                      {log.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {log.details || 'Sync completed normally'} • {new Date(log.synced_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Active Deployments */}
          <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
            <h2><Server size={20} color="var(--accent-secondary)" /> Isolated Deployments</h2>
            {deployments.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No deployments active.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Cloudflare Route ID</th>
                    <th>Software Version</th>
                    <th>Deployed On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map(dep => (
                    <tr key={dep.id}>
                      <td style={{ fontWeight: 500 }}>{dep.clients?.name || 'Unknown'}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{dep.cloudflare_route_id || 'N/A'}</td>
                      <td><span className="badge">v{dep.version || '1.0.0'}</span></td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {dep.created_at ? new Date(dep.created_at).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td>
                        <button style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                          Manage Keys
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      )}

      {/* Add Task Modal */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setTaskModalOpen(false)} title="Add Roadmap Task">
        <form onSubmit={handleTaskSubmit}>
          <div className="form-group">
            <label>Task Title</label>
            <input name="title" required className="form-input" placeholder="E.g., Implement Redis Caching" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" className="form-textarea" placeholder="More details..." />
          </div>
          <div className="form-group">
            <label>Area</label>
            <select name="area" className="form-select">
              <option value="product">Product</option>
              <option value="execution">Execution</option>
            </select>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select name="priority" className="form-select">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" className="form-select">
              <option value="Backlog">Backlog</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setTaskModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Task</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
