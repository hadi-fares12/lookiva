'use client';

import * as React from 'react';
import { businessFetch, getBusinessSession } from '@/lib/api';

export function BusinessMessagesPage() {
  const session = React.useMemo(() => getBusinessSession(), []);
  const [conversations, setConversations] = React.useState<any[]>([]);
  const [activeId, setActiveId] = React.useState('');
  const [messages, setMessages] = React.useState<any[]>([]);
  const [body, setBody] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadConversations = React.useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const rows = await businessFetch<any[]>(`/business-ops/${session.companyId}/conversations?limit=100`);
      setConversations(Array.isArray(rows) ? rows : []);
      if (!activeId && rows?.[0]?.id) setActiveId(rows[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load conversations');
    } finally {
      setLoading(false);
    }
  }, [session, activeId]);

  const loadMessages = React.useCallback(async () => {
    if (!session || !activeId) { setMessages([]); return; }
    try {
      const rows = await businessFetch<any[]>(`/business-ops/${session.companyId}/conversations/${activeId}/messages?limit=200`);
      setMessages(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load messages');
    }
  }, [session, activeId]);

  React.useEffect(() => { void loadConversations(); }, []);
  React.useEffect(() => { void loadMessages(); }, [activeId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const clean = body.trim();
    if (!session || !activeId || !clean) return;
    setSending(true);
    setError('');
    try {
      await businessFetch(`/business-ops/${session.companyId}/conversations/${activeId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: clean, messageType: 'text' }),
      });
      setBody('');
      await Promise.all([loadMessages(), loadConversations()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send message');
    } finally {
      setSending(false);
    }
  }

  const active = conversations.find((c) => c.id === activeId);
  const otherMembers = (active?.members || []).filter((m: any) => m.user_id !== session?.user.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold-2">Communication</p>
          <h1 className="mt-2 text-3xl font-bold text-primary">Messages</h1>
          <p className="mt-2 text-secondary">Customer conversations stay linked to the business and notify the other participant.</p>
        </div>
        <button onClick={()=>void loadConversations()} className="h-10 rounded-radius-md border border-border-subtle bg-surface-1 px-4 text-sm font-semibold text-primary">Refresh</button>
      </div>

      {error && <div className="rounded-radius-lg border border-accent-red/30 bg-accent-red/10 p-4 text-sm text-accent-red">{error}</div>}

      <div className="grid min-h-[65vh] overflow-hidden rounded-radius-2xl border border-border-subtle bg-surface-1 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-border-subtle lg:border-b-0 lg:border-r">
          <div className="border-b border-border-subtle p-4 text-sm font-semibold text-primary">Conversations</div>
          <div className="max-h-[65vh] overflow-y-auto">
            {loading && <p className="p-4 text-sm text-muted">Loading…</p>}
            {!loading && !conversations.length && <p className="p-4 text-sm text-muted">No customer conversations yet.</p>}
            {conversations.map((conversation:any)=>{
              const member=(conversation.members||[]).find((m:any)=>m.user_id!==session?.user.id);
              const last=conversation.messages?.[0];
              return <button key={conversation.id} type="button" onClick={()=>setActiveId(conversation.id)} className={`w-full border-b border-border-subtle p-4 text-left transition ${activeId===conversation.id?'bg-accent-gold-2/10':'hover:bg-surface-2'}`}>
                <p className="font-semibold text-primary">{member?.user?.full_name || 'Customer'}</p>
                <p className="mt-1 line-clamp-1 text-xs text-muted">{last?.body_plain || 'Start the conversation'}</p>
                {conversation.last_message_at&&<p className="mt-1 text-[11px] text-muted">{new Date(conversation.last_message_at).toLocaleString()}</p>}
              </button>;
            })}
          </div>
        </aside>

        <section className="flex min-h-[65vh] flex-col">
          {!activeId ? <div className="flex flex-1 items-center justify-center p-8 text-center text-muted">Choose a conversation.</div> : <>
            <div className="border-b border-border-subtle p-4">
              <p className="font-semibold text-primary">{otherMembers.map((m:any)=>m.user?.full_name).filter(Boolean).join(', ') || 'Customer'}</p>
              <p className="text-xs text-muted">{active?.appointment_id ? `Appointment ${active.appointment_id}` : 'Direct customer conversation'}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m:any)=>{
                const mine=m.sender_user_id===session?.user.id;
                return <div key={m.id} className={`flex ${mine?'justify-end':'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-radius-xl px-4 py-3 text-sm ${mine?'bg-accent-gold-2 text-surface-0':'bg-surface-2 text-primary'}`}>
                    {!mine&&<p className="mb-1 text-xs font-semibold opacity-75">{m.sender?.full_name || 'Customer'}</p>}
                    <p className="whitespace-pre-wrap">{m.body_plain}</p>
                    <p className="mt-1 text-[10px] opacity-65">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                </div>;
              })}
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-border-subtle p-4">
              <textarea value={body} onChange={(e)=>setBody(e.target.value)} rows={2} maxLength={4000} placeholder="Write a message…" className="min-h-12 flex-1 rounded-radius-lg border border-border-subtle bg-surface-0 px-4 py-3 text-primary outline-none focus:border-accent-gold-2"/>
              <button disabled={sending||!body.trim()} className="rounded-radius-lg bg-accent-gold-2 px-5 font-semibold text-surface-0 disabled:opacity-50">{sending?'Sending…':'Send'}</button>
            </form>
          </>}
        </section>
      </div>
    </div>
  );
}
