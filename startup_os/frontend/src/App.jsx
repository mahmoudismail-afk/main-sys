import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import SettingsPage from './pages/Settings';
import AgencyHQ from './pages/AgencyHQ';
import CRM from './pages/CRM';
import Engineering from './pages/Engineering';
import Invoices from './pages/Invoices';
import Analytics from './pages/Analytics';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import Tasks from './pages/Tasks';
import Reminders from './pages/Reminders';
import CalendarView from './pages/CalendarView';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Profitability from './pages/Profitability';
import Leads from './pages/Leads';
import Equity from './pages/Equity';
import Capital from './pages/Capital';
import Inventory from './pages/Inventory';
import Engagements from './pages/Engagements';
import Payroll from './pages/Payroll';
import MessageCenter from './pages/MessageCenter';
import Debts from './pages/Debts';
import SuperAdmin from './pages/SuperAdmin';

import { 
  Target, Users, Server, DollarSign, BarChart2, LayoutDashboard, 
  Sun, Moon, Users2, FileText, CreditCard, Receipt, 
  PieChart, Briefcase, CheckSquare, Calendar, Bell, 
  Landmark, PackageOpen, Settings, LogOut, MessageSquare, Menu, X, ShieldAlert
} from 'lucide-react';

// Placeholder components for the new granular routes
const Placeholder = ({ title }) => (
  <div style={{ padding: '2rem' }}>
    <h1>{title}</h1>
    <p style={{ color: 'var(--text-secondary)' }}>This module is currently being scaffolded.</p>
  </div>
);

function App() {
  const [theme, setTheme] = useState('dark');
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Refresh session automatically if app_metadata is missing our new fields, to pull the latest JWT claims
      if (session && !session.user.app_metadata?.role) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        setSession(refreshed.session);
      } else {
        setSession(session);
      }
      setIsInitializing(false);
    });

    // Listen for changes on auth state (log in, log out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isInitializing) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}><div className="loader">Authenticating...</div></div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Router>
      <div className="app-container">
        
        {/* Mobile Header (Only visible on small screens) */}
        <div className="mobile-header">
          <h1>Startup OS</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }}>
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Sidebar Overlay for Mobile */}
        <div 
          className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={closeMobileMenu}
        ></div>

        {/* Granular Sidebar */}
        <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1 style={{ margin: 0, padding: 0 }}>Startup OS</h1>
            {/* Close button inside sidebar, only visible on mobile (via media queries if needed, but handled by absolute positioning or just inline here) */}
            <button className="mobile-close-btn" onClick={closeMobileMenu} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: window.innerWidth <= 768 ? 'block' : 'none' }}>
              <X size={20} />
            </button>
          </div>
          
          <div style={{ padding: '0 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '0', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '1px' }}>
            Executive
          </div>
          <NavLink to="/dashboard" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><LayoutDashboard size={18} /> CFO Dashboard</NavLink>
          <NavLink to="/hq" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Target size={18} /> Command Center</NavLink>

          <div style={{ padding: '0 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '1px' }}>
            CRM & Sales
          </div>
          <NavLink to="/clients" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Users size={18} /> Clients</NavLink>
          <NavLink to="/leads" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Users2 size={18} /> Possible Clients</NavLink>
          <NavLink to="/engagements" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Settings size={18} /> Engagements</NavLink>

          <div style={{ padding: '0 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '1px' }}>
            Finance & Metrics
          </div>
          <NavLink to="/invoices" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><FileText size={18} /> Invoices</NavLink>
          <NavLink to="/payments" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><CreditCard size={18} /> Payments</NavLink>
          <NavLink to="/expenses" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Receipt size={18} /> Expenses</NavLink>
          <NavLink to="/debts" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><DollarSign size={18} /> Debt Tracking</NavLink>
          <NavLink to="/reports" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><BarChart2 size={18} /> Monthly Report</NavLink>
          <NavLink to="/profitability" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><PieChart size={18} /> Client Profitability</NavLink>
          <NavLink to="/payroll" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Users size={18} /> Payroll & Dividends</NavLink>
          <NavLink to="/equity" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Briefcase size={18} /> Business Equity</NavLink>
          <NavLink to="/capital" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Landmark size={18} /> Capital</NavLink>

          <div style={{ padding: '0 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '1px' }}>
            Operations
          </div>
          <NavLink to="/tasks" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><CheckSquare size={18} /> Tasks</NavLink>
          <NavLink to="/messages" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><MessageSquare size={18} /> Message Center</NavLink>
          <NavLink to="/calendar" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Calendar size={18} /> Calendar</NavLink>
          <NavLink to="/reminders" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Bell size={18} /> Reminders</NavLink>
          <NavLink to="/inventory" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><PackageOpen size={18} /> Inventory</NavLink>

          <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            {session?.user?.app_metadata?.role === 'super_admin' && (
              <>
                <div style={{ padding: '0 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#ef4444', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '1px' }}>
                  Global Admin
                </div>
                <NavLink to="/admin" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} style={({isActive}) => isActive ? { color: '#ef4444'} : {}}><ShieldAlert size={18} /> Tenant Management</NavLink>
                <div style={{ margin: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
              </>
            )}

            <div style={{ padding: '0 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '1px' }}>
              System
            </div>
            <NavLink to="/settings" onClick={closeMobileMenu} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><Settings size={18} /> Settings</NavLink>
            <button 
              onClick={handleLogout} 
              className="nav-link" 
              style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#ef4444' }}
            >
              <LogOut size={18} /> Logout
            </button>
          </div>

        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/dashboard" element={<ExecutiveDashboard />} />
            <Route path="/hq" element={<AgencyHQ />} />
            
            {/* Direct mapped pages for now. We will replace these with true granular components as we build them out */}
            <Route path="/clients" element={<CRM />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/engagements" element={<Engagements />} />
            
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/reports" element={<Analytics />} />
            <Route path="/profitability" element={<Profitability />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/equity" element={<Equity />} />
            <Route path="/capital" element={<Capital />} />
            
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/messages" element={<MessageCenter />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/inventory" element={<Inventory />} />
            
            <Route path="/settings" element={<SettingsPage />} />
            {session?.user?.app_metadata?.role === 'super_admin' && (
              <Route path="/admin" element={<SuperAdmin />} />
            )}

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
