'use client';
import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import axios, { getAccessToken } from '@/lib/axios';
import { useCustomerRealtimeReload } from '@/lib/realtime';

export default function ConversationPage(){
  const {locale,id}=useParams<{locale:string;id:string}>(); const t=useTranslations('customerChat');
  const [messages,setMessages]=React.useState<any[]>([]);const [body,setBody]=React.useState('');const [error,setError]=React.useState('');const [sending,setSending]=React.useState(false);
  const load=React.useCallback(async()=>{if(!getAccessToken())return;try{const r=await axios.get(`/customer-ops/conversations/${id}/messages?limit=200`);setMessages(Array.isArray(r.data)?r.data:[]);setError('');}catch(e){setError(e instanceof Error?e.message:t('loadError'));}},[id,t]);
  React.useEffect(()=>{void load();},[load]);
  useCustomerRealtimeReload(['message:created'], ()=>void load(), {conversationId:id});
  async function send(e:React.FormEvent){e.preventDefault();const clean=body.trim();if(!clean)return;setSending(true);try{await axios.post(`/customer-ops/conversations/${id}/messages`,{body:clean,messageType:'text'});setBody('');await load();}catch(err){setError(err instanceof Error?err.message:t('sendError'));}finally{setSending(false);}}
  return <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col px-4 py-8 md:px-6"><div className="flex items-center gap-3"><Link href={`/${locale}/chat`} className="text-sm font-semibold text-accent-gold-2">← {t('back')}</Link><h1 className="text-2xl font-bold text-primary">{t('title')}</h1></div>{error&&<div className="mt-4 rounded-radius-lg border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red">{error}</div>}<div className="mt-5 flex-1 space-y-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-4">{messages.length?messages.map((m:any)=><div key={m.id} className="rounded-radius-lg bg-surface-2 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-primary">{m.sender?.full_name||t('user')}</p><p className="text-xs text-muted">{new Date(m.created_at).toLocaleString(locale)}</p></div><p className="mt-2 whitespace-pre-wrap text-sm text-secondary">{m.body_plain||''}</p></div>):<p className="p-6 text-center text-sm text-muted">{t('empty')}</p>}</div><form onSubmit={send} className="mt-4 flex gap-2"><textarea value={body} onChange={e=>setBody(e.target.value)} rows={2} maxLength={4000} placeholder={t('placeholder')} className="min-h-12 flex-1 rounded-radius-lg border border-border-subtle bg-surface-1 px-4 py-3 text-primary outline-none focus:border-accent-gold-2"/><button disabled={sending||!body.trim()} className="rounded-radius-lg bg-accent-gold-2 px-5 font-semibold text-surface-0 disabled:opacity-50">{sending?t('sending'):t('send')}</button></form></div>;
}
