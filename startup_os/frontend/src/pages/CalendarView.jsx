import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          { data: tasks },
          { data: reminders },
          { data: invoices },
          { data: meetings }
        ] = await Promise.all([
          supabase.from('tasks').select('*').not('due_date', 'is', null),
          supabase.from('reminders').select('*').not('due_date', 'is', null),
          supabase.from('invoices').select('*, clients(name)').not('due_date', 'is', null),
          supabase.from('meetings').select('*').not('meeting_date', 'is', null)
        ]);

        const formattedEvents = [];

        // Tasks
        (tasks || []).forEach(t => {
          formattedEvents.push({
            title: `[Task] ${t.title}`,
            start: new Date(t.due_date),
            end: new Date(t.due_date),
            allDay: true,
            resource: { type: 'task', status: t.status }
          });
        });

        // Reminders
        (reminders || []).forEach(r => {
          formattedEvents.push({
            title: `[Reminder] ${r.title}`,
            start: new Date(r.due_date),
            end: new Date(r.due_date),
            allDay: true,
            resource: { type: 'reminder', status: r.status }
          });
        });

        // Invoices
        (invoices || []).forEach(i => {
          formattedEvents.push({
            title: `[Invoice] ${i.clients?.name || 'Client'} - $${i.amount}`,
            start: new Date(i.due_date),
            end: new Date(i.due_date),
            allDay: true,
            resource: { type: 'invoice', status: i.status }
          });
        });

        // Meetings
        (meetings || []).forEach(m => {
          const start = new Date(m.meeting_date);
          const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default
          formattedEvents.push({
            title: `[Meeting] ${m.title}`,
            start,
            end,
            allDay: false,
            resource: { type: 'meeting', status: m.status }
          });
        });

        setEvents(formattedEvents);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3b82f6'; // default blue
    
    if (event.resource.type === 'task') {
      backgroundColor = event.resource.status === 'done' ? '#64748b' : '#3b82f6';
    } else if (event.resource.type === 'reminder') {
      backgroundColor = event.resource.status === 'completed' ? '#64748b' : '#f59e0b';
    } else if (event.resource.type === 'invoice') {
      backgroundColor = event.resource.status === 'paid' ? '#10b981' : '#ef4444';
    } else if (event.resource.type === 'meeting') {
      backgroundColor = '#8b5cf6';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block'
      }
    };
  };

  return (
    <div style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Master Calendar</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Unified view of Tasks, Reminders, Invoices, and Meetings.</p>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#3b82f6', borderRadius: '50%' }}></span> Tasks</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%' }}></span> Reminders</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }}></span> Invoices (Unpaid)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#10b981', borderRadius: '50%' }}></span> Invoices (Paid)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#8b5cf6', borderRadius: '50%' }}></span> Meetings</span>
        </div>
      </div>

      {loading ? (
        <div className="loader">Loading Timeline...</div>
      ) : (
        <div className="glass-panel" style={{ flex: 1, padding: '1rem', background: 'var(--bg-panel)' }}>
          <style>
            {`
              .rbc-calendar { font-family: inherit; color: var(--text-primary); }
              .rbc-toolbar button { color: var(--text-primary); border-color: var(--border-color); }
              .rbc-toolbar button:active, .rbc-toolbar button.rbc-active { background-color: var(--accent-primary); color: white; }
              .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: var(--border-color); }
              .rbc-day-bg + .rbc-day-bg, .rbc-month-row + .rbc-month-row, .rbc-header + .rbc-header { border-color: var(--border-color); }
              .rbc-header { border-bottom-color: var(--border-color); padding: 0.5rem 0; font-weight: 600; }
              .rbc-off-range-bg { background-color: rgba(0,0,0,0.1); }
              .rbc-today { background-color: rgba(59, 130, 246, 0.1); }
            `}
          </style>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day', 'agenda']}
          />
        </div>
      )}
    </div>
  );
}
