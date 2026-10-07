'use client';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { adminFetch } from '@/lib/api';

type Config = { key: string; endpoint: string };
const CONFIG: Record<string, Config> = {
  'users': { key: 'users', endpoint: '/admin/users?limit=100' },
  'businesses': { key: 'businesses', endpoint: '/admin/businesses?limit=100' },
  'verification': { key: 'verification', endpoint: '/admin/businesses?limit=100' },
  'branches': { key: 'branches', endpoint: '/admin/branches?limit=100' },
  'professionals': { key: 'professionals', endpoint: '/admin/professionals?limit=100' },
  'services': { key: 'services', endpoint: '/admin/services?limit=100' },
  'bookings': { key: 'bookings', endpoint: '/admin/bookings?limit=100' },
  'payments': { key: 'payments', endpoint: '/admin/payments?limit=100' },
  'refunds': { key: 'refunds', endpoint: '/admin/refunds?limit=100' },
  'moderation': { key: 'moderation', endpoint: '/admin/moderation/reports?limit=100' },
  'strikes': { key: 'strikes', endpoint: '/admin/strikes?limit=100' },
  'categories': { key: 'categories', endpoint: '/admin/categories' },
  'countries': { key: 'countries', endpoint: '/admin/countries' },
  'regions': { key: 'regions', endpoint: '/admin/regions' },
  'languages': { key: 'languages', endpoint: '/admin/languages' },
  'currencies': { key: 'currencies', endpoint: '/admin/currencies' },
  'themes': { key: 'themes', endpoint: '/admin/themes' },
  'plans': { key: 'plans', endpoint: '/admin/plans' },
  'subscriptions': { key: 'subscriptions', endpoint: '/admin/subscriptions?limit=100' },
  'commissions': { key: 'commissions', endpoint: '/admin/payments?limit=100' },
  'promotions': { key: 'promotions', endpoint: '/admin/promotions?limit=100' },
  'support': { key: 'support', endpoint: '/admin/support?limit=100' },
  'disputes': { key: 'disputes', endpoint: '/admin/disputes?limit=100' },
  'notifications': { key: 'notifications', endpoint: '/platform-ops-v2/workers/status' },
  'nearby': { key: 'nearby', endpoint: '/platform-ops-v2/workers/status' },
  'system': { key: 'system', endpoint: '/health' },
  'audit': { key: 'audit', endpoint: '/admin/audit?limit=100' },
  'feature-flags': { key: 'feature-flags', endpoint: '/admin/feature-flags' },
  'remote-config': { key: 'remote-config', endpoint: '/admin/remote-config' },
};

function rowsOf(section:string,data:any):any[]{
  if(section==='themes' && Array.isArray(data?.themes)) return data.themes;
  if(Array.isArray(data))return data;
  if(Array.isArray(data?.items))return data.items;
  if(Array.isArray(data?.reports))return data.reports;
  if(data&&typeof data==='object')return Object.entries(data).map(([key,value])=>({key,value:typeof value==='object'?JSON.stringify(value):String(value)}));
  return [];
}

function pretty(v:any){
  if(v===null||v===undefined||v==='') return '—';
  if(typeof v==='boolean') return v?'Active':'Inactive';
  if(typeof v==='object') return JSON.stringify(v);
  return String(v);
}

function StatusPill({value}:{value:any}){
  const text=String(value??'unknown').toLowerCase();
  const good=['active','approved','resolved','completed','success','healthy','true'].some(x=>text===x||text.includes(x));
  const bad=['inactive','suspended','rejected','failed','cancelled','false'].some(x=>text===x||text.includes(x));
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${good?'bg-accent-green/10 text-accent-green':bad?'bg-accent-red/10 text-accent-red':'bg-accent-gold-2/10 text-accent-gold-2'}`}>{pretty(value)}</span>;
}

export function AdminOperationsPage({section}:{section:string}){
  const t = useTranslations('adminOps');
  const cfg=CONFIG[section]||CONFIG.system;
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState('');

  const load=async()=>{
    setLoading(true);setError('');
    try{setData(await adminFetch(cfg.endpoint));}
    catch(e){setError(e instanceof Error?e.message:t('loadError'));}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[section]);

  const rows=useMemo(()=>rowsOf(section,data).slice(0,100),[section,data]);
  const cols=useMemo(()=>{
    if(!rows.length)return [];
    const preferred=['display_name','full_name','name','key','subject','status','verification_status','is_active','is_enabled','email','currency_code','created_at','updated_at'];
    const keys=Object.keys(rows[0]).filter(k=>!['password_hash','raw_response','metadata','refresh_token_hash'].includes(k));
    return [...preferred.filter(k=>keys.includes(k)),...keys.filter(k=>!preferred.includes(k))].slice(0,8);
  },[rows]);

  const mutate=async(key:string,path:string,body:any,success:string)=>{
    setBusy(key);setError('');setNotice('');
    try{await adminFetch(path,{method:'PATCH',body:JSON.stringify(body)});setNotice(success);await load();}
    catch(e){setError(e instanceof Error?e.message:t('operationError'));}
    finally{setBusy('');}
  };
  const post=async(key:string,path:string,body:any,success:string)=>{
    setBusy(key);setError('');setNotice('');
    try{await adminFetch(path,{method:'POST',body:JSON.stringify(body)});setNotice(success);await load();}
    catch(e){setError(e instanceof Error?e.message:t('operationError'));}
    finally{setBusy('');}
  };
  const remove=async(key:string,path:string,body:any,success:string)=>{
    setBusy(key);setError('');setNotice('');
    try{await adminFetch(path,{method:'DELETE',body:JSON.stringify(body||{})});setNotice(success);await load();}
    catch(e){setError(e instanceof Error?e.message:t('operationError'));}
    finally{setBusy('');}
  };

  const actionsFor=(r:any)=>{
    const id=String(r.id||'');
    if(section==='users'&&id){
      const active=r.is_active!==false && r.status!=='suspended';
      return <div className="flex flex-wrap gap-2">
        <button disabled={busy===id} onClick={()=>{const reason=window.prompt(`${active?t('suspend'):t('reactivate')} — ${t('prompts.reason')}`,'')??undefined;void mutate(id,`/admin/users/${id}/status`,{isActive:!active,reason},active?t('messages.userSuspended'):t('messages.userReactivated'));}} className="action-btn">{busy===id?t('saving'):active?t('suspend'):t('reactivate')}</button>
        <button disabled={!!busy} onClick={()=>{const reason=window.prompt('Reason for revoking all sessions','Security review')||undefined;void post(id+'sessions',`/admin/users/${id}/revoke-sessions`,{reason},'All user sessions revoked.');}} className="action-btn">Revoke sessions</button>
        <button disabled={!!busy||!r.email} onClick={()=>void post(id+'reset',`/admin/users/${id}/password-reset`,{},'Password reset sent to the user.')} className="action-btn">Send reset</button>
        <button disabled={!!busy||!r.phone} onClick={()=>void post(id+'otp',`/admin/users/${id}/send-otp`,{},'OTP sent to the user.')} className="action-btn">Send OTP</button>
        <button disabled={!!busy||!active} onClick={()=>void startImpersonation(id)} className="action-btn">Impersonate</button>
        <button disabled={!!busy} onClick={()=>{const reasonType=window.prompt('Strike reason type','policy_violation');if(!reasonType?.trim())return;const reasonText=window.prompt('Strike details','')||undefined;void post(id+'strike',`/admin/users/${id}/strikes`,{severity:'warning',reasonType:reasonType.trim(),reasonText},'Strike issued.');}} className="action-btn danger">Issue strike</button>
      </div>;
    }
    if(section==='businesses'&&id){
      const active=r.is_active!==false;
      return <button disabled={busy===id} onClick={()=>{const reason=window.prompt(`${active?t('suspend'):t('reactivate')} — ${t('prompts.reason')}`,'')??undefined;void mutate(id,`/admin/businesses/${id}/status`,{isActive:!active,reason},active?t('messages.businessSuspended'):t('messages.businessReactivated'));}} className="action-btn">{busy===id?t('saving'):active?t('suspend'):t('reactivate')}</button>;
    }
    if(section==='verification'&&id){
      const status=String(r.verification?.status||r.verification_status||'draft');
      return <div className="flex flex-wrap gap-2"><button disabled={!!busy||status==='approved'} onClick={()=>void post(id+'a',`/admin/businesses/${id}/verification`,{status:'approved'},t('messages.verificationApproved'))} className="action-btn">{t('approve')}</button><button disabled={!!busy} onClick={()=>{const reason=window.prompt(t('prompts.rejectionReason'),'');if(reason?.trim())void post(id+'r',`/admin/businesses/${id}/verification`,{status:'rejected',reason:reason.trim()},t('messages.verificationRejected'));}} className="action-btn danger">{t('reject')}</button></div>;
    }
    if(section==='categories'&&id){
      const active=r.is_active!==false;
      return <button disabled={busy===id} onClick={()=>void mutate(id,`/admin/categories/${id}`,{isActive:!active},active?t('messages.categoryDisabled'):t('messages.categoryEnabled'))} className="action-btn">{active?t('disable'):t('enable')}</button>;
    }
    if(section==='countries'&&id){
      const active=r.is_active!==false;
      return <button disabled={busy===id} onClick={()=>void mutate(id,`/admin/countries/${id}`,{isActive:!active},active?t('messages.marketDisabled'):t('messages.marketEnabled'))} className="action-btn">{active?t('disable'):t('enable')}</button>;
    }
    if(section==='themes'&&id){
      return <div className="flex flex-wrap gap-2"><button disabled={busy===id+'d'||r.is_default} onClick={()=>void mutate(id+'d',`/admin/themes/${id}`,{isDefault:true,isActive:true},t('messages.defaultThemeUpdated'))} className="action-btn">{r.is_default?t('default'):t('makeDefault')}</button><button disabled={busy===id} onClick={()=>void mutate(id,`/admin/themes/${id}`,{isActive:r.is_active===false},r.is_active===false?t('messages.themeEnabled'):t('messages.themeDisabled'))} className="action-btn">{r.is_active===false?t('enable'):t('disable')}</button></div>;
    }
    if(section==='support'&&id){
      const closed=['resolved','closed'].includes(String(r.status));
      return <div className="flex flex-wrap gap-2">
        <button disabled={!!busy} onClick={()=>{const body=window.prompt('Reply to support ticket','');if(!body?.trim())return;void post(id+'reply',`/admin/support/${id}/replies`,{body:body.trim()},'Support reply sent.');}} className="action-btn">Reply</button>
        <button disabled={busy===id||closed} onClick={()=>void mutate(id,`/admin/support/${id}`,{status:'resolved'},t('messages.supportResolved'))} className="action-btn">{closed?t('resolved'):t('resolve')}</button>
      </div>;
    }
    if(section==='disputes'&&id){
      const closed=['resolved','closed'].includes(String(r.status));
      return <button disabled={busy===id||closed} onClick={()=>{const resolution=window.prompt(t('prompts.resolution'),'Resolved by platform review.')||'Resolved by platform review.';void mutate(id,`/admin/disputes/${id}`,{status:'resolved',resolution},t('messages.disputeResolved'));}} className="action-btn">{closed?t('resolved'):t('resolve')}</button>;
    }
    if(section==='moderation'&&id){
      const closed=['resolved','dismissed'].includes(String(r.status));
      return <div className="flex flex-wrap gap-2">
        <button disabled={!!busy||closed} onClick={()=>void mutate(id+'resolve',`/admin/moderation/reports/${id}`,{status:'resolved',actionTaken:'reviewed'},'Moderation report resolved.')} className="action-btn">Resolve</button>
        <button disabled={!!busy||closed} onClick={()=>void mutate(id+'dismiss',`/admin/moderation/reports/${id}`,{status:'dismissed',actionTaken:'dismissed'},'Moderation report dismissed.')} className="action-btn">Dismiss</button>
      </div>;
    }
    if(section==='strikes'&&id){
      return <button disabled={!!busy||r.is_active===false} onClick={()=>void remove(id,`/admin/strikes/${id}`,{reason:'Cleared by platform admin'},'Strike deactivated.')} className="action-btn">{r.is_active===false?'Inactive':'Deactivate'}</button>;
    }
    if(section==='branches'&&id){
      const active=r.is_active!==false;
      return <button disabled={!!busy} onClick={()=>void mutate(id,`/admin/branches/${id}`,{isActive:!active},active?'Branch disabled.':'Branch activated.')} className="action-btn">{active?t('suspend'):t('reactivate')}</button>;
    }
    if(section==='professionals'&&id){
      const active=r.is_active!==false;
      return <div className="flex flex-wrap gap-2"><button disabled={!!busy} onClick={()=>void mutate(id,`/admin/professionals/${id}`,{isActive:!active},active?'Professional disabled.':'Professional activated.')} className="action-btn">{active?t('suspend'):t('reactivate')}</button><button disabled={!!busy} onClick={()=>void mutate(id+'verified',`/admin/professionals/${id}`,{isVerified:!r.is_verified},r.is_verified?'Verification removed.':'Professional verified.')} className="action-btn">{r.is_verified?'Unverify':'Verify'}</button></div>;
    }
    if(section==='services'&&id){
      const active=r.is_active!==false;
      return <button disabled={!!busy} onClick={()=>void mutate(id,`/admin/services/${id}`,{isActive:!active},active?'Service disabled.':'Service activated.')} className="action-btn">{active?t('suspend'):t('reactivate')}</button>;
    }
    if(section==='regions'&&id){
      const active=r.is_active!==false;
      return <button disabled={!!busy} onClick={()=>void mutate(id,`/admin/regions/${id}`,{isActive:!active},active?'Region disabled.':'Region activated.')} className="action-btn">{active?t('suspend'):t('reactivate')}</button>;
    }
    if(section==='languages'&&id){
      const active=r.is_active!==false;
      return <button disabled={!!busy} onClick={()=>void mutate(id,`/admin/languages/${id}`,{isActive:!active},active?'Language disabled.':'Language activated.')} className="action-btn">{active?t('suspend'):t('reactivate')}</button>;
    }
    if(section==='currencies'&&id){
      const active=r.is_active!==false;
      return <button disabled={!!busy} onClick={()=>void mutate(id,`/admin/currencies/${id}`,{isActive:!active},active?'Currency disabled.':'Currency activated.')} className="action-btn">{active?t('suspend'):t('reactivate')}</button>;
    }
    if(section==='plans'&&id){
      const active=r.is_active!==false;
      return <button disabled={!!busy} onClick={()=>void mutate(id,`/admin/plans/${id}`,{isActive:!active},active?'Plan disabled.':'Plan activated.')} className="action-btn">{active?t('suspend'):t('reactivate')}</button>;
    }
    if(section==='feature-flags'&&r.key){
      const key=String(r.key);const enabled=Boolean(r.is_enabled);
      return <button disabled={busy===key} onClick={()=>void mutate(key,`/admin/feature-flags/${encodeURIComponent(key)}`,{isEnabled:!enabled},enabled?t('messages.featureDisabled'):t('messages.featureEnabled'))} className="action-btn">{enabled?t('disable'):t('enable')}</button>;
    }
    if(section==='remote-config'&&r.key){
      const key=String(r.key);
      return <button disabled={busy===key} onClick={()=>{const current=typeof r.value==='string'?r.value:JSON.stringify(r.value??'');const raw=window.prompt(t('prompts.newValue',{key}),current);if(raw===null)return;let value:any=raw;try{value=JSON.parse(raw);}catch{}void mutate(key,`/admin/remote-config/${encodeURIComponent(key)}`,{value,valueType:Array.isArray(value)?'array':typeof value},t('messages.remoteUpdated'));}} className="action-btn">{t('edit')}</button>;
    }
    return null;
  };
  const hasActions=['users','businesses','verification','branches','professionals','services','moderation','strikes','categories','countries','regions','languages','currencies','plans','themes','support','disputes','feature-flags','remote-config'].includes(section);

  const startImpersonation=async(userId:string)=>{
    setBusy(userId+'impersonate');setError('');setNotice('');
    try{
      const result=await adminFetch(`/admin/users/${userId}/impersonate`,{method:'POST',body:'{}'});
      const access=encodeURIComponent(String(result?.accessToken||''));
      const refresh=encodeURIComponent(String(result?.refreshToken||''));
      if(!access||!refresh)throw new Error('Impersonation tokens were not returned');
      const customerBase=(process.env.NEXT_PUBLIC_CUSTOMER_WEB_URL||'http://localhost:3001').replace(/\/$/,'');
      window.open(`${customerBase}/en/impersonate#access=${access}&refresh=${refresh}`,'_blank','noopener,noreferrer');
      setNotice('Audited impersonation session opened in a new tab.');
    }catch(e){setError(e instanceof Error?e.message:t('operationError'));}
    finally{setBusy('');}
  };

  const createRegion=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();const fd=new FormData(event.currentTarget);
    await post('create-region','/admin/regions',{countryId:String(fd.get('countryId')||''),code:String(fd.get('code')||'')||undefined,name:String(fd.get('name')||'')},'Region created.');
    event.currentTarget.reset();
  };
  const createLanguage=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();const fd=new FormData(event.currentTarget);
    await post('create-language','/admin/languages',{isoCode:String(fd.get('isoCode')||''),name:String(fd.get('name')||''),nativeName:String(fd.get('nativeName')||''),direction:String(fd.get('direction')||'ltr')},'Language created.');
    event.currentTarget.reset();
  };
  const createCurrency=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();const fd=new FormData(event.currentTarget);
    await post('create-currency','/admin/currencies',{isoCode:String(fd.get('isoCode')||''),name:String(fd.get('name')||''),symbol:String(fd.get('symbol')||''),decimalDigits:Number(fd.get('decimalDigits')||2)},'Currency created.');
    event.currentTarget.reset();
  };
  const createPlan=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();const fd=new FormData(event.currentTarget);
    await post('create-plan','/admin/plans',{name:String(fd.get('name')||''),code:String(fd.get('code')||''),currencyCode:String(fd.get('currencyCode')||'USD'),priceMonthly:Number(fd.get('priceMonthly')||0),priceYearly:Number(fd.get('priceYearly')||0),trialDays:Number(fd.get('trialDays')||0)},'Subscription plan created.');
    event.currentTarget.reset();
  };

  const createCategory=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();const fd=new FormData(event.currentTarget);
    await post('create-category','/admin/categories',{name:String(fd.get('name')||''),slug:String(fd.get('slug')||'')||undefined,iconKey:String(fd.get('iconKey')||'')||undefined},'Category created.');
    event.currentTarget.reset();
  };
  const createCountry=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();const fd=new FormData(event.currentTarget);
    await post('create-country','/admin/countries',{isoCode:String(fd.get('isoCode')||''),name:String(fd.get('name')||''),dialCode:String(fd.get('dialCode')||''),currencyCode:String(fd.get('currencyCode')||'')},'Country created.');
    event.currentTarget.reset();
  };

  return <div className="space-y-6">
    <style>{`.action-btn{border:1px solid var(--border-subtle);background:var(--surface-2);padding:.45rem .7rem;border-radius:.65rem;font-size:.75rem;font-weight:700;color:var(--text-primary);white-space:nowrap}.action-btn:hover:not(:disabled){filter:brightness(1.08)}.action-btn:disabled{opacity:.5;cursor:not-allowed}.action-btn.danger{border-color:color-mix(in srgb,var(--accent-red) 45%,transparent);color:var(--accent-red)}`}</style>
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold-2">{t('eyebrow')}</p><h1 className="mt-2 text-3xl font-bold text-primary">{t(`sections.${cfg.key}.title`)}</h1><p className="mt-2 text-secondary">{t(`sections.${cfg.key}.subtitle`)}</p></div><button onClick={()=>void load()} className="h-10 rounded-radius-md border border-border-subtle bg-surface-1 px-4 text-sm font-semibold text-primary hover:bg-surface-2">{t('refresh')}</button></div>
    {section==='regions'&&<form onSubmit={createRegion} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-4"><input name="countryId" required placeholder="Country ID" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="code" placeholder="Region code" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="name" required placeholder="Region name" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0">Create region</button></form>}
    {section==='languages'&&<form onSubmit={createLanguage} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-5"><input name="isoCode" required placeholder="ISO code" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="name" required placeholder="Language name" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="nativeName" required placeholder="Native name" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><select name="direction" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"><option value="ltr">LTR</option><option value="rtl">RTL</option></select><button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0">Create language</button></form>}
    {section==='currencies'&&<form onSubmit={createCurrency} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-5"><input name="isoCode" required maxLength={3} placeholder="USD" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="name" required placeholder="Currency name" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="symbol" required placeholder="$" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="decimalDigits" type="number" min="0" max="6" defaultValue="2" aria-label="Decimal digits" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0">Create currency</button></form>}
    {section==='plans'&&<form onSubmit={createPlan} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-7"><input name="name" required placeholder="Plan name" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="code" required placeholder="plan-code" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="currencyCode" required defaultValue="USD" maxLength={3} className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="priceMonthly" type="number" min="0" step="0.01" defaultValue="0" aria-label="Monthly price" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="priceYearly" type="number" min="0" step="0.01" defaultValue="0" aria-label="Yearly price" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="trialDays" type="number" min="0" defaultValue="0" aria-label="Trial days" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0">Create plan</button></form>}
    {section==='categories'&&<form onSubmit={createCategory} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-4"><input name="name" required placeholder="Category name" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="slug" placeholder="Slug (optional)" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="iconKey" placeholder="Icon key" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0">Create category</button></form>}
    {section==='countries'&&<form onSubmit={createCountry} className="grid gap-3 rounded-radius-xl border border-border-subtle bg-surface-1 p-5 md:grid-cols-5"><input name="isoCode" required maxLength={3} placeholder="ISO code" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="name" required placeholder="Country name" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="dialCode" required placeholder="+961" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><input name="currencyCode" required maxLength={3} placeholder="USD" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary"/><button disabled={!!busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-5 font-semibold text-surface-0">Create country</button></form>}
    {notice&&<div className="rounded-radius-lg border border-accent-green/30 bg-accent-green/10 px-4 py-3 text-sm font-semibold text-accent-green">{notice}</div>}
    {loading&&<div className="grid gap-3 md:grid-cols-3">{[1,2,3].map(i=><div key={i} className="h-28 animate-pulse rounded-radius-xl bg-surface-2"/>)}</div>}
    {error&&<div className="rounded-radius-xl border border-accent-red/40 bg-accent-red/10 p-5"><p className="font-semibold text-accent-red">{t('operationPanelError')}</p><p className="mt-1 text-sm text-secondary">{error}</p><button onClick={()=>void load()} className="mt-4 rounded-radius-md bg-accent-gold-2 px-4 py-2 text-sm font-semibold text-surface-0">{t('retry')}</button></div>}
    {!loading&&!error&&rows.length===0&&<div className="rounded-radius-xl border border-border-subtle bg-surface-1 p-10 text-center"><h2 className="text-lg font-semibold text-primary">{t('noRecords')}</h2><p className="mt-2 text-sm text-muted">{t('liveEmpty')}</p></div>}
    {!loading&&rows.length>0&&<div className="overflow-x-auto rounded-radius-xl border border-border-subtle bg-surface-1"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-surface-2 text-xs uppercase text-muted"><tr>{cols.map(c=><th key={c} className="px-4 py-3">{c.replaceAll('_',' ')}</th>)}{hasActions&&<th className="px-4 py-3">{t('actions')}</th>}</tr></thead><tbody className="divide-y divide-border-subtle">{rows.map((r,i)=><tr key={r.id||r.key||i} className="align-top hover:bg-surface-2/60">{cols.map(c=><td key={c} className="max-w-[280px] px-4 py-3 text-secondary">{['status','verification_status','is_active','is_enabled'].includes(c)?<StatusPill value={r[c]}/>:<span className="line-clamp-3 break-words">{pretty(r[c])}</span>}</td>)}{hasActions&&<td className="px-4 py-3">{actionsFor(r)}</td>}</tr>)}</tbody></table></div>}
  </div>;
}
