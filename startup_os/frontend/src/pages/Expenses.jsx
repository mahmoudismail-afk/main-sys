import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Receipt, PlusCircle, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      setExpenses(data || []);
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
      description: formData.get('description'),
      amount: formData.get('amount'),
      category: formData.get('category'),
      date: formData.get('date')
    };

    const { error } = await supabase.from('expenses').insert([payload]);
    if (error) {
      alert(`Error saving expense: ${error.message}`);
    } else {
      setIsModalOpen(false);
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) alert("Error deleting expense: " + error.message);
      else fetchData();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Expense Tracker</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track infrastructure, software subscriptions, and capital burn.</p>
        </div>
        <button className="primary-btn" onClick={() => setIsModalOpen(true)}><PlusCircle size={16} style={{ display: 'inline', marginRight: '0.5rem' }}/> Log Expense</button>
      </div>

      {loading ? <div className="loader">Loading Expenses...</div> : (
        <div className="glass-panel">
          {expenses.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No expenses recorded.</p> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id}>
                    <td>{new Date(exp.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500 }}>{exp.description}</td>
                    <td><span className="badge">{exp.category}</span></td>
                    <td style={{ color: '#ef4444', fontWeight: 600 }}>${Number(exp.amount).toLocaleString()}</td>
                    <td>
                      <button onClick={() => handleDelete(exp.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Expense">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Description (Vendor / Item)</label>
            <input name="description" required className="form-input" placeholder="E.g., AWS Hosting, Slack Seats" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Amount ($)</label>
              <input name="amount" type="number" step="0.01" required className="form-input" placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input name="date" type="date" required className="form-input" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select name="category" className="form-select">
              <option value="infrastructure">Infrastructure</option>
              <option value="subscriptions">Subscriptions</option>
              <option value="capital">Capital</option>
              <option value="hardware">Hardware</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Save Expense</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
