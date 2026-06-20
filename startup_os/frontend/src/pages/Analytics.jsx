import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, AlertTriangle, BarChart2, PieChart as PieIcon, Briefcase } from 'lucide-react';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('6months');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  const [revenueData, setRevenueData] = useState([]);
  const [topEngagements, setTopEngagements] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);
  const [leadPipeline, setLeadPipeline] = useState([]);
  const [invoiceStatus, setInvoiceStatus] = useState([]);
  const [debtTotal, setDebtTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getLast6Months = () => {
    const months = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const past = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push({
        monthName: past.toLocaleString('default', { month: 'short' }),
        year: past.getFullYear(),
        month: past.getMonth(),
        revenue: 0,
        expenses: 0,
        margin: 0
      });
    }
    return months;
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let startDate, endDate;

      if (activeTab === '6months') {
        const d = new Date();
        d.setMonth(d.getMonth() - 5);
        d.setDate(1);
        startDate = d.toISOString();
        endDate = new Date().toISOString();
      } else {
        startDate = new Date(`${selectedYear}-01-01`).toISOString();
        endDate = new Date(`${selectedYear}-12-31T23:59:59.999Z`).toISOString();
      }

      const [
        { data: invoices },
        { data: expenses },
        { data: leads },
        { data: payments }
      ] = await Promise.all([
        supabase.from('invoices').select('*, engagements(name)').gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('expenses').select('*').gte('date', startDate).lte('date', endDate),
        supabase.from('leads_pipeline').select('*'), // Leads are typically snapshot, not date gated
        supabase.from('payments').select('amount, payment_date').gte('payment_date', startDate).lte('payment_date', endDate)
      ]);

      const trendMap = {};
      if (activeTab === '6months') {
        getLast6Months().forEach(m => trendMap[`${m.year}-${m.month}`] = m);
      } else {
        for (let i = 0; i < 12; i++) {
          const mName = new Date(selectedYear, i, 1).toLocaleString('default', { month: 'short' });
          trendMap[`${selectedYear}-${i}`] = { monthName: mName, year: selectedYear, month: i, revenue: 0, expenses: 0, margin: 0 };
        }
      }

      let totalUnpaid = 0;
      const engMap = {};
      const expMap = {};
      const invStatusMap = { paid: 0, sent: 0, overdue: 0, draft: 0 };

      (invoices || []).forEach(inv => {
        invStatusMap[inv.status] = (invStatusMap[inv.status] || 0) + Number(inv.amount);

        if (inv.status !== 'paid') {
          totalUnpaid += Number(inv.amount);
        } else {
          const engName = inv.engagements?.name || 'Other';
          engMap[engName] = (engMap[engName] || 0) + Number(inv.amount);
        }
      });

      (payments || []).forEach(p => {
        const d = new Date(p.payment_date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (trendMap[key]) {
          trendMap[key].revenue += Number(p.amount);
        }
      });

      (expenses || []).forEach(exp => {
        const d = new Date(exp.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (trendMap[key]) {
          trendMap[key].expenses += Number(exp.amount);
        }
        expMap[exp.category] = (expMap[exp.category] || 0) + Number(exp.amount);
      });

      // Calculate margins
      Object.values(trendMap).forEach(m => {
        m.margin = m.revenue - m.expenses;
      });

      setRevenueData(Object.values(trendMap));
      setDebtTotal(totalUnpaid);

      setTopEngagements(
        Object.keys(engMap)
          .map(name => ({ name, revenue: engMap[name] }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      );

      setExpenseBreakdown(
        Object.keys(expMap).map(category => ({ name: category, value: expMap[category] }))
      );

      setInvoiceStatus(
        Object.keys(invStatusMap).filter(k => invStatusMap[k] > 0).map(status => ({ name: status, value: invStatusMap[status] }))
      );

      const leadStageMap = {};
      (leads || []).forEach(l => {
        leadStageMap[l.stage] = (leadStageMap[l.stage] || 0) + Number(l.value);
      });
      setLeadPipeline(
        Object.keys(leadStageMap).map(stage => ({ name: stage, value: leadStageMap[stage] }))
      );

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeTab, selectedYear]);

  const currentYear = new Date().getFullYear();
  const archiveYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(String);

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reporting & Analytics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track revenue trends, top-selling items, and historic archives.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button 
            className={`btn-secondary ${activeTab === '6months' ? 'active-tab-btn' : ''}`} 
            style={{ border: 'none', background: activeTab === '6months' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            onClick={() => setActiveTab('6months')}
          >
            Rolling 6-Month
          </button>
          <button 
            className={`btn-secondary ${activeTab === 'archive' ? 'active-tab-btn' : ''}`} 
            style={{ border: 'none', background: activeTab === 'archive' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            onClick={() => setActiveTab('archive')}
          >
            Yearly Archive
          </button>
        </div>
      </div>

      {activeTab === 'archive' && (
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Select Archive Year:</span>
          {archiveYears.map(yr => (
            <button 
              key={yr}
              className={`badge ${selectedYear === yr ? 'completed' : 'pending'}`}
              onClick={() => setSelectedYear(yr)}
              style={{ cursor: 'pointer', border: '1px solid var(--border-color)' }}
            >
              {yr}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loader">Generating Reports...</div>
      ) : (
        <div className="dashboard-grid">
          
          {/* Revenue vs Expenses */}
          <div className="glass-panel" style={{ gridColumn: 'span 2', height: '350px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '1.5rem' }}><TrendingUp size={20} color="var(--accent-primary)" /> Cash Flow Trend</h2>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="monthName" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Cash In (Paid)" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" name="Cash Out" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Net Margin Line Chart */}
          <div className="glass-panel" style={{ gridColumn: 'span 1', height: '350px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '1.5rem' }}><BarChart2 size={20} color="var(--accent-secondary)" /> Net Margin Trend</h2>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <XAxis dataKey="monthName" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }} />
                <Line type="monotone" dataKey="margin" name="Net Margin" stroke="var(--accent-secondary)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Breakdown */}
          <div className="glass-panel" style={{ gridColumn: 'span 1', height: '350px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '1.5rem' }}><PieIcon size={20} color="#f59e0b" /> Expense Breakdown</h2>
            {expenseBreakdown.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No expenses logged.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Leads Pipeline Value */}
          <div className="glass-panel" style={{ gridColumn: 'span 1', height: '350px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '1.5rem' }}><Briefcase size={20} color="#3b82f6" /> Pipeline Value by Stage</h2>
            {leadPipeline.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Pipeline is empty.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadPipeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }} />
                  <Bar dataKey="value" name="Value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Invoice Status Distribution */}
          <div className="glass-panel" style={{ gridColumn: 'span 1', height: '350px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '1.5rem' }}><AlertTriangle size={20} color="#ef4444" /> Invoice Status Volumes</h2>
            {invoiceStatus.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No invoices logged.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={invoiceStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {invoiceStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'paid' ? '#10b981' : entry.name === 'overdue' ? '#ef4444' : entry.name === 'sent' ? '#3b82f6' : '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Selling & Debt List */}
          <div className="glass-panel" style={{ gridColumn: 'span 2', display: 'flex', gap: '2rem' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ marginBottom: '1rem', color: '#ef4444' }}><AlertTriangle size={20} /> Outstanding Debt</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Unpaid or overdue invoices</p>
              <h1 style={{ fontSize: '3rem', margin: 0, color: '#ef4444' }}>${debtTotal.toLocaleString()}</h1>
            </div>
            
            <div style={{ flex: 2 }}>
              <h2 style={{ marginBottom: '1rem' }}><BarChart2 size={20} color="var(--accent-secondary)" /> Top Engagements (Paid)</h2>
              {topEngagements.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No revenue data yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {topEngagements.map((eng, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                      <span>{eng.name}</span>
                      <span style={{ fontWeight: 'bold', color: '#10b981' }}>${eng.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
