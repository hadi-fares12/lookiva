'use client';
import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import axios, { getAccessToken } from '@/lib/axios';

function isoLocalValue(date: Date) {
  const pad=(n:number)=>String(n).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function BookingPage(){
  const {serviceId}=useParams<{serviceId:string}>(); const locale=useLocale(); const t=useTranslations('customerBooking');
  const [service,setService]=React.useState<any>(null); const [branches,setBranches]=React.useState<any[]>([]); const [resources,setResources]=React.useState<any[]>([]);
  const [branchId,setBranchId]=React.useState(''); const [professionalId,setProfessionalId]=React.useState(''); const [resourceId,setResourceId]=React.useState('');
  const [startsAt,setStartsAt]=React.useState(()=>isoLocalValue(new Date(Date.now()+2*60*60*1000))); const [notes,setNotes]=React.useState(''); const [status,setStatus]=React.useState(''); const [loading,setLoading]=React.useState(true); const [submitting,setSubmitting]=React.useState(false);

  React.useEffect(()=>{axios.get(`/services/${serviceId}`).then(async r=>{setService(r.data);const companyId=r.data?.company?.id||r.data?.company_id;if(companyId){const br=await axios.get(`/businesses/${companyId}/branches`);const arr=Array.isArray(br.data)?br.data:(br.data?.items||[]);setBranches(arr);if(arr[0])setBranchId(arr[0].id);} }).catch(e=>setStatus(e instanceof Error?e.message:t('loadError'))).finally(()=>setLoading(false));},[serviceId,t]);
  React.useEffect(()=>{if(!branchId)return;axios.get(`/branches/${branchId}/resources`).then(r=>setResources(Array.isArray(r.data)?r.data:(r.data?.items||[]))).catch(()=>setResources([]));},[branchId]);

  async function confirm(){
    if(!getAccessToken()){setStatus(t('signInRequired'));return;}
    if(!service||!branchId||!startsAt){setStatus(t('selectBranchTime'));return;}
    setSubmitting(true);setStatus(t('checking'));
    try{
      const start=new Date(startsAt); const end=new Date(start.getTime()+Number(service.duration_minutes||30)*60000);
      const companyId=service.company?.id||service.company_id;
      const common={companyId,branchId,professionalId:professionalId||undefined,resourceIds:resourceId?[resourceId]:[],serviceIds:[serviceId],startsAt:start.toISOString(),endsAt:end.toISOString()};
      const available=await axios.get('/booking-v2/availability',{params:{branchId,startsAt:start.toISOString(),endsAt:end.toISOString(),professionalId:professionalId||undefined,resourceIds:resourceId||undefined}});
      if(available.data?.available===false){setStatus(t('unavailable'));return;}
      setStatus(t('holding'));
      const hold=await axios.post('/booking-v2/holds',common);
      const token=hold.data?.hold_token||hold.data?.holdToken;
      setStatus(t('confirming'));
      const created=await axios.post('/booking-v2/appointments',{...common,holdToken:token,notesCustomer:notes||undefined,source:'customer_web'});
      setStatus(`${t('confirmed')}${created.data?.id?` — ${created.data.id}`:''}.`);
    }catch(e:any){setStatus(e?.response?.data?.message||e?.message||t('failed'));}
    finally{setSubmitting(false);}
  }

  if(loading)return <div className="mx-auto max-w-3xl p-6 text-secondary">{t('loading')}</div>;
  if(!service)return <div className="mx-auto max-w-3xl p-6 text-accent-red">{status||t('notFound')}</div>;
  const professionals=service.professionals||[];
  return <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 md:px-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold-2">{t('secure')}</p><h1 className="mt-2 text-3xl font-bold text-primary">{service.name}</h1><p className="mt-2 text-secondary">{service.duration_minutes} {t('minutes')} · {service.base_price} {service.currency_code}</p></div><div className="rounded-radius-2xl border border-border-subtle bg-surface-1 p-5 md:p-6 space-y-5"><label className="block"><span className="mb-1.5 block text-sm font-medium text-secondary">{t('branch')}</span><select value={branchId} onChange={e=>setBranchId(e.target.value)} className="w-full h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary">{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-sm font-medium text-secondary">{t('professional')}</span><select value={professionalId} onChange={e=>setProfessionalId(e.target.value)} className="w-full h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"><option value="">{t('anyProfessional')}</option>{professionals.map((p:any)=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-sm font-medium text-secondary">{t('dateTime')}</span><input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="w-full h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/></label><label className="block"><span className="mb-1.5 block text-sm font-medium text-secondary">{t('resource')}</span><select value={resourceId} onChange={e=>setResourceId(e.target.value)} className="w-full h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"><option value="">{t('anyResource')}</option>{resources.map(r=><option key={r.id} value={r.id}>{r.name} · {r.type}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-sm font-medium text-secondary">{t('notes')}</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} className="w-full rounded-radius-md border border-border-subtle bg-surface-0 p-3 text-primary" placeholder={t('notesPlaceholder')}/></label>{status&&<div className="rounded-radius-md border border-border-subtle bg-surface-2 p-3 text-sm text-secondary">{status}</div>}<button disabled={submitting} onClick={()=>void confirm()} className="w-full rounded-radius-md bg-accent-gold-2 px-5 py-3 font-semibold text-surface-0 disabled:opacity-50">{submitting?t('processing'):t('confirm')}</button>{!getAccessToken()&&<Link href={`/${locale}/login`} className="block text-center text-sm text-accent-gold-2">{t('signIn')}</Link>}</div></div>;
}
