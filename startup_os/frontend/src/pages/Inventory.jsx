import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PackageOpen, PlusCircle } from 'lucide-react';
import Modal from '../components/Modal';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: invData },
        { data: depData }
      ] = await Promise.all([
        supabase.from('hardware_inventory').select('*, deployments(environment)').order('hardware_type', { ascending: true }),
        supabase.from('deployments').select('id, environment')
      ]);
      setInventory(invData || []);
      setDeployments(depData || []);
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
      hardware_type: formData.get('hardware_type'),
      mac_address: formData.get('mac_address') || null,
      deployment_id: formData.get('deployment_id') || null,
      status: formData.get('status') || 'active'
    };

    await supabase.from('hardware_inventory').insert([payload]);
    setIsModalOpen(false);
    fetchData();
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Hardware Inventory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track deployed servers, physical assets, and hardware linked to deployments.</p>
        </div>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}><PlusCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> Add Hardware</button>
      </div>

      {loading ? <div className="loader">Loading Inventory...</div> : (
        <div className="glass-panel">
          {inventory.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No hardware provisioned.</p> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hardware Type</th>
                  <th>MAC Address / Serial</th>
                  <th>Linked Deployment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{inv.hardware_type}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{inv.mac_address || '--'}</td>
                    <td>{inv.deployments?.environment || '--'}</td>
                    <td><span className={`badge ${inv.status === 'active' ? 'completed' : 'pending'}`}>{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Provision Hardware">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Hardware Type</label>
            <input name="hardware_type" required className="form-input" placeholder="E.g., Raspberry Pi 4, Local Server Blade" />
          </div>
          <div className="form-group">
            <label>MAC Address / Serial Number</label>
            <input name="mac_address" className="form-input" placeholder="00:1A:2B:3C:4D:5E" />
          </div>
          <div className="form-group">
            <label>Link to Software Deployment (Optional)</label>
            <select name="deployment_id" className="form-select">
              <option value="">None / Floating</option>
              {deployments.map(d => <option key={d.id} value={d.id}>{d.environment}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" className="form-select">
              <option value="active">Active (Deployed)</option>
              <option value="storage">In Storage</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Hardware</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
