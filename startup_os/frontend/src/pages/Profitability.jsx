import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, TrendingUp } from 'lucide-react';

export default function Profitability() {
  const [profitabilityData, setProfitabilityData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await supabase.from('client_profitability_view').select('*');
        setProfitabilityData(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Client Profitability</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Automated Net Margin analysis per client (Revenue vs Infrastructure Cost).</p>
      </div>

      {loading ? <div className="loader">Calculating Margins...</div> : (
        <div className="glass-panel">
          {profitabilityData.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No financial data mapped to clients yet.</p> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Total Revenue</th>
                  <th>Infra Costs</th>
                  <th>Net Margin</th>
                  <th>Margin %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {profitabilityData.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{row.client_name}</td>
                    <td style={{ color: '#10b981' }}>${Number(row.total_revenue).toLocaleString()}</td>
                    <td style={{ color: '#ef4444' }}>${Number(row.total_infrastructure_cost).toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: Number(row.net_margin) < 0 ? '#ef4444' : 'var(--text-primary)' }}>
                      ${Number(row.net_margin).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${Number(row.margin_percentage) > 50 ? 'completed' : Number(row.margin_percentage) > 0 ? 'pending' : ''}`}
                            style={Number(row.margin_percentage) < 0 ? { background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444'} : {}}>
                        {Number(row.margin_percentage).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      {Number(row.net_margin) < 0 ? 'Bleeding' : Number(row.margin_percentage) > 70 ? 'Cash Cow' : 'Healthy'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
