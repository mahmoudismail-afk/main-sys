import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AlertCircle, DollarSign, Activity, Wallet, TrendingUp, Clock, CheckCircle } from 'lucide-react';

export default function ExecutiveDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [profitability, setProfitability] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [dividends, setDividends] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          { data: invData, error: err1 },
          { data: expData, error: err2 },
          { data: profData, error: err3 },
          { data: delData, error: err4 },
          { data: payData, error: err5 },
          { data: divData, error: err6 },
          { data: paymentsData, error: err7 }
        ] = await Promise.all([
          supabase.from('invoices').select('*, clients(name)'),
          supabase.from('expenses').select('*'),
          supabase.from('client_profitability_view').select('*'),
          supabase.from('deliverables').select('*, clients(name)').eq('status', 'pending'),
          supabase.from('payroll').select('*'),
          supabase.from('dividends').select('*'),
          supabase.from('payments').select('*')
        ]);
        
        if (err1) console.error(err1);
        if (err2) console.error(err2);
        if (err3) console.error(err3);
        if (err4) console.error(err4);
        if (err5) console.error(err5);
        if (err6) console.error(err6);
        if (err7) console.error(err7);

        setInvoices(invData || []);
        setExpenses(expData || []);
        setProfitability(profData || []);
        setDeliverables(delData || []);
        setPayroll(payData || []);
        setDividends(divData || []);
        setPaymentsList(paymentsData || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        alert(`Error loading Executive Dashboard: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute KPIs
  const totalRevenue = paymentsList.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const outstandingAR = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  
  const baseExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalPayroll = payroll.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalExpenses = baseExpenses + totalPayroll;
  
  const netProfit = totalRevenue - totalExpenses;
  const totalDividends = dividends.filter(d => d.type === 'payout').reduce((sum, d) => sum + Number(d.amount || 0), 0);

  // Monthly Cashflow Aggregation
  const monthlyDataMap = {};
  
  // Combine all months spanning the data using actual Payments received for Revenue
  paymentsList.forEach(p => {
    const date = new Date(p.payment_date || p.created_at || Date.now());
    const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (!monthlyDataMap[month]) monthlyDataMap[month] = { name: month, Revenue: 0, Expenses: 0, sortKey: date.getTime() };
    monthlyDataMap[month].Revenue += Number(p.amount || 0);
  });
  
  expenses.forEach(e => {
    const date = new Date(e.date || e.created_at || Date.now());
    const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (!monthlyDataMap[month]) monthlyDataMap[month] = { name: month, Revenue: 0, Expenses: 0, sortKey: date.getTime() };
    monthlyDataMap[month].Expenses += Number(e.amount || 0);
  });

  payroll.forEach(p => {
    const date = new Date(p.date || p.created_at || Date.now());
    const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (!monthlyDataMap[month]) monthlyDataMap[month] = { name: month, Revenue: 0, Expenses: 0, sortKey: date.getTime() };
    monthlyDataMap[month].Expenses += Number(p.amount || 0);
  });

  const cashflowData = Object.values(monthlyDataMap).sort((a, b) => a.sortKey - b.sortKey);

  // Profitability Chart Data
  const pieData = profitability
    .filter(p => Number(p.total_revenue) > 0)
    .map(p => ({ name: p.client_name, value: Number(p.total_revenue) }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

  const overdueInvoices = invoices.filter(i => i.status === 'overdue');

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Executive Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Fractional CFO operational overview and high-level financials.</p>
      </div>

      {loading ? (
        <div className="loader">Crunching Financials...</div>
      ) : (
        <div className="dashboard-grid">
          
          {/* KPI Row */}
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={16} /> Total Revenue (Collected)
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginTop: '0.5rem' }}>
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} /> Outstanding A/R
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '0.5rem' }}>
                ${outstandingAR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wallet size={16} /> Total Expenses
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444', marginTop: '0.5rem' }}>
                ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} /> Net Profit
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: netProfit >= 0 ? 'var(--text-primary)' : '#ef4444', marginTop: '0.5rem' }}>
                ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={16} /> Total Dividends (Out)
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6', marginTop: '0.5rem' }}>
                ${totalDividends.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="glass-panel" style={{ height: '380px' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={20} color="var(--accent-primary)"/> Monthly Cashflow</h2>
            {cashflowData.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No financial activity to chart yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={cashflowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value) => [`$${value.toLocaleString()}`, undefined]}
                  />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-panel" style={{ height: '380px' }}>
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Revenue by Client</h2>
            {pieData.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4rem' }}>No client revenue logged.</p>
            ) : (
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    formatter={(value) => [`$${value.toLocaleString()}`, undefined]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Alerts Row */}
          <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} /> Operational Alerts
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Overdue Invoices</h3>
                {overdueInvoices.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No overdue invoices.</p> : 
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {overdueInvoices.map(inv => (
                      <div key={inv.id} className="list-item" style={{ borderLeft: '4px solid #ef4444' }}>
                        <span>{inv.clients?.name || 'Unknown'}</span>
                        <span style={{ fontWeight: 'bold' }}>${Number(inv.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                }
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Pending Deliverables</h3>
                {deliverables.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No pending deliverables.</p> : 
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {deliverables.map(del => (
                      <div key={del.id} className="list-item" style={{ borderLeft: '4px solid #3b82f6' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} /> {del.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{del.clients?.name}</span>
                      </div>
                    ))}
                  </div>
                }
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
