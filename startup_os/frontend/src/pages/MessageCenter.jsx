import { useEffect, useState, useRef } from 'react';
import { useOrg } from '../lib/useOrg';
import { supabase } from '../lib/supabase';
import { MessageSquare, PlusCircle, Send, Hash, User, Pencil } from 'lucide-react';
import Modal from '../components/Modal';

export default function MessageCenter() {
  const { orgId } = useOrg();
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const messagesEndRef = useRef(null);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('message_threads').select('*').order('created_at', { ascending: false });
      if (error) alert(`Error loading threads: ${error.message}`);
      setThreads(data || []);
      
      // Select the first thread by default if none is selected
      if (!activeThread && data && data.length > 0) {
        setActiveThread(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (threadId) => {
    if (!threadId) return;
    try {
      const { data, error } = await supabase.from('thread_messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true });
      if (error) console.error(error);
      setMessages(data || []);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    fetchThreads();
  }, []);

  useEffect(() => {
    if (activeThread) {
      fetchMessages(activeThread.id);
    }
  }, [activeThread]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title');

    const { data, error } = await supabase.from('message_threads').insert([{
      title,
      organization_id: orgId,
      created_by: session?.user?.id
    }]).select();

    if (error) {
      alert(`Error creating thread: ${error.message}\nMake sure schema_v22 is applied.`);
    } else {
      setIsModalOpen(false);
      await fetchThreads();
      if (data && data.length > 0) {
        setActiveThread(data[0]);
      }
    }
  };

  const handleEditThread = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title');

    const { error } = await supabase.from('message_threads').update({ title }).eq('id', activeThread.id);

    if (error) {
      alert(`Error updating channel: ${error.message}`);
    } else {
      setIsEditModalOpen(false);
      setActiveThread({ ...activeThread, title });
      fetchThreads();
    }
  };

  const handleDeleteThread = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete the #${activeThread.title} channel and all its messages?`)) return;

    const { error } = await supabase.from('message_threads').delete().eq('id', activeThread.id);
    
    if (error) {
      alert(`Error deleting channel: ${error.message}`);
    } else {
      setIsEditModalOpen(false);
      setActiveThread(null);
      fetchThreads();
    }
  };

  const handleToggleArchive = async () => {
    const newStatus = activeThread.status === 'archived' ? 'active' : 'archived';
    const { error } = await supabase.from('message_threads').update({ status: newStatus }).eq('id', activeThread.id);
    
    if (error) {
      alert(`Error archiving channel: ${error.message}\nDid you run schema_v23?`);
    } else {
      setIsEditModalOpen(false);
      setActiveThread({ ...activeThread, status: newStatus });
      fetchThreads();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeThread) return;

    // Format the name to use display_name if available, otherwise prefix of email
    const fullEmail = session?.user?.email || 'Unknown';
    const metadataName = session?.user?.user_metadata?.display_name;
    const displayName = metadataName || fullEmail.split('@')[0];

    const payload = {
      thread_id: activeThread.id,
      organization_id: orgId,
      sender_id: session?.user?.id,
      sender_name: displayName,
      content: newMessage.trim()
    };

    // Optimistic UI update
    const tempMessage = { ...payload, id: 'temp-' + Date.now(), created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom();

    const { error } = await supabase.from('thread_messages').insert([payload]);
    if (error) {
      alert(`Error sending message: ${error.message}`);
      fetchMessages(activeThread.id); // Revert optimistic update on error
    } else {
      fetchMessages(activeThread.id); // Fetch real data with DB timestamp
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
      <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Message Center</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Discuss topics and leave notes with the team.</p>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '1rem', overflow: 'hidden' }}>
        
        {/* Left Panel: Threads */}
        <div className="glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Channels</h3>
            <button onClick={() => setIsModalOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}>
              <PlusCircle size={20} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {loading ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading threads...</p> : null}
            {!loading && threads.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No channels created yet.</p> : null}
            
            {threads.filter(t => t.status !== 'archived').map(thread => (
              <button 
                key={thread.id}
                onClick={() => setActiveThread(thread)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', 
                  padding: '0.75rem', borderRadius: '8px', border: 'none', 
                  background: activeThread?.id === thread.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: activeThread?.id === thread.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeThread?.id === thread.id ? '600' : 'normal',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                }}
              >
                <Hash size={16} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{thread.title}</span>
              </button>
            ))}

            {threads.filter(t => t.status === 'archived').length > 0 && (
              <>
                <div style={{ padding: '1rem 0 0.5rem 0', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '1px' }}>
                  Archived
                </div>
                {threads.filter(t => t.status === 'archived').map(thread => (
                  <button 
                    key={thread.id}
                    onClick={() => setActiveThread(thread)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.5rem', 
                      padding: '0.5rem 0.75rem', borderRadius: '8px', border: 'none', 
                      background: activeThread?.id === thread.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                      color: activeThread?.id === thread.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      opacity: activeThread?.id === thread.id ? 1 : 0.6,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                    }}
                  >
                    <Hash size={14} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.9rem' }}>{thread.title}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Panel: Chat Room */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {!activeThread ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <MessageSquare size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>Select or create a channel to start messaging.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                    <Hash size={20} color="var(--accent-primary)" /> {activeThread.title}
                  </h2>
                  <button onClick={() => setIsEditModalOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <Pencil size={16} />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {messages.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No messages in this channel yet.</p>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                        <User size={20} color="var(--text-secondary)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'capitalize' }}>{msg.sender_name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {new Date(msg.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem' }}>
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message #${activeThread.title}`} 
                    className="form-input" 
                    style={{ flex: 1, margin: 0 }} 
                  />
                  <button type="submit" className="primary-btn" disabled={!newMessage.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.5rem' }}>
                    <Send size={16} /> Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

      </div>

      {/* New Thread Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Channel">
        <form onSubmit={handleCreateThread}>
          <div className="form-group">
            <label>Channel Name</label>
            <input name="title" required className="form-input" placeholder="E.g. general, announcements, client-updates" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="primary-btn">Create Channel</button>
          </div>
        </form>
      </Modal>

      {/* Edit Thread Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Channel Name">
        <form onSubmit={handleEditThread} key={activeThread?.id}>
          <div className="form-group">
            <label>Channel Name</label>
            <input name="title" required className="form-input" defaultValue={activeThread?.title} placeholder="E.g. general, announcements" />
          </div>
          <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="nav-link" style={{ color: '#ef4444', padding: '0.5rem' }} onClick={handleDeleteThread}>Delete</button>
              <button type="button" className="nav-link" style={{ color: '#f59e0b', padding: '0.5rem' }} onClick={handleToggleArchive}>
                {activeThread?.status === 'archived' ? 'Unarchive' : 'Archive'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
              <button type="submit" className="primary-btn">Save Changes</button>
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
}
