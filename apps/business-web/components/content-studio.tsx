'use client';

import * as React from 'react';
import { businessFetch, businessUpload, getBusinessSession } from '@/lib/api';

function mediaUrl(media:any): string | null {
  const base=(process.env.NEXT_PUBLIC_MEDIA_BASE_URL||'').replace(/\/$/,'');
  const variants=Array.isArray(media?.variants)?media.variants:[];
  const preferred=variants.find((v:any)=>v?.variant==='medium')||variants.find((v:any)=>v?.variant==='thumb')||variants[0];
  if(preferred?.url)return preferred.url;
  if(base&&media?.storage_bucket&&media?.storage_key)return `${base}/${media.storage_bucket}/${media.storage_key}`;
  return media?.originalUrl||null;
}

export function BusinessContentStudio(){
  const session=React.useMemo(()=>getBusinessSession(),[]);
  const [services,setServices]=React.useState<any[]>([]);
  const [posts,setPosts]=React.useState<any[]>([]);
  const [files,setFiles]=React.useState<File[]>([]);
  const [selectedServices,setSelectedServices]=React.useState<string[]>([]);
  const [busy,setBusy]=React.useState(false);
  const [error,setError]=React.useState('');
  const [notice,setNotice]=React.useState('');

  const load=React.useCallback(async()=>{
    if(!session)return;
    try{
      const [serviceRows,postRows]=await Promise.all([
        businessFetch<any[]>(`/business-ops/${session.companyId}/services`),
        businessFetch<any[]>(`/social/posts?businessId=${encodeURIComponent(session.companyId)}&limit=50`),
      ]);
      setServices(Array.isArray(serviceRows)?serviceRows:[]);
      setPosts(Array.isArray(postRows)?postRows:[]);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load content');}
  },[session]);

  React.useEffect(()=>{void load();},[]);

  function toggleService(id:string){
    setSelectedServices((current)=>current.includes(id)?current.filter((x)=>x!==id):[...current,id]);
  }

  async function publish(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!session)return;
    const fd=new FormData(event.currentTarget);
    const body=String(fd.get('body')||'').trim();
    const title=String(fd.get('title')||'').trim();
    if(!body&&!title&&!files.length){setError('Add a caption, title, photo, or video before publishing.');return;}
    setBusy(true);setError('');setNotice('');
    try{
      const mediaIds:string[]=[];
      for(const file of files){
        const uploaded=await businessUpload<any>(
          `/media/upload?isPublic=true&companyId=${encodeURIComponent(session.companyId)}`,
          file,
        );
        mediaIds.push(uploaded.id);
      }
      await businessFetch('/social-v2/posts',{
        method:'POST',
        body:JSON.stringify({
          companyId:session.companyId,
          title:title||undefined,
          bodyPlain:body||undefined,
          mediaIds,
          serviceIds:selectedServices,
          tags:String(fd.get('tags')||'').split(',').map((x)=>x.trim()).filter(Boolean),
          isPromotion:fd.get('isPromotion')==='on',
        }),
      });
      event.currentTarget.reset();
      setFiles([]);setSelectedServices([]);
      setNotice('Published successfully. Customers can now see this content on your LOOKIVA profile.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to publish content');}
    finally{setBusy(false);}
  }

  return <div className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold-2">Social profile</p><h1 className="mt-2 text-3xl font-bold text-primary">Content studio</h1><p className="mt-2 text-secondary">Publish photos, before/after work, videos, reels, offers and service-linked inspiration.</p></div>
    {error&&<div className="rounded-radius-lg border border-accent-red/30 bg-accent-red/10 p-4 text-sm text-accent-red">{error}</div>}
    {notice&&<div className="rounded-radius-lg border border-accent-green/30 bg-accent-green/10 p-4 text-sm text-accent-green">{notice}</div>}
    <form onSubmit={publish} className="space-y-4 rounded-radius-2xl border border-border-subtle bg-surface-1 p-5 md:p-6">
      <div className="grid gap-3 md:grid-cols-2">
        <input name="title" placeholder="Post title (optional)" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary outline-none focus:border-accent-gold-2"/>
        <input name="tags" placeholder="Tags: fade, beard, color…" className="h-11 rounded-radius-md border border-border-subtle bg-surface-0 px-3 text-primary outline-none focus:border-accent-gold-2"/>
      </div>
      <textarea name="body" rows={4} placeholder="Tell customers about this look, service or offer…" className="w-full rounded-radius-md border border-border-subtle bg-surface-0 p-3 text-primary outline-none focus:border-accent-gold-2"/>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="rounded-radius-lg border border-dashed border-border-strong bg-surface-2 p-4 text-sm text-secondary">
          <span className="block font-semibold text-primary">Photos / videos</span>
          <span className="mt-1 block text-xs text-muted">JPEG, PNG, WEBP or MP4. Video up to backend limits.</span>
          <input type="file" multiple accept="image/png,image/jpeg,image/webp,video/mp4" onChange={(e)=>setFiles(Array.from(e.target.files||[]).slice(0,10))} className="mt-3 block w-full"/>
        </label>
        <label className="rounded-radius-lg border border-dashed border-border-strong bg-surface-2 p-4 text-sm text-secondary">
          <span className="block font-semibold text-primary">Camera</span>
          <span className="mt-1 block text-xs text-muted">On supported phones/tablets, take a photo directly.</span>
          <input type="file" accept="image/*" capture="environment" onChange={(e)=>{const f=e.target.files?.[0];if(f)setFiles((current)=>[...current,f].slice(0,10));}} className="mt-3 block w-full"/>
        </label>
      </div>
      {!!files.length&&<div className="rounded-radius-lg bg-surface-2 p-3 text-sm text-secondary">{files.map((f)=><div key={`${f.name}-${f.size}`}>{f.name} · {(f.size/1024/1024).toFixed(1)} MB</div>)}</div>}
      {!!services.length&&<div><p className="mb-2 text-sm font-semibold text-primary">Link services</p><div className="flex flex-wrap gap-2">{services.map((s:any)=><button type="button" key={s.id} onClick={()=>toggleService(s.id)} className={`rounded-radius-full border px-3 py-2 text-xs font-semibold ${selectedServices.includes(s.id)?'border-accent-gold-2 bg-accent-gold-2/10 text-accent-gold-2':'border-border-subtle text-secondary'}`}>{s.name}</button>)}</div></div>}
      <label className="flex items-center gap-2 text-sm text-secondary"><input name="isPromotion" type="checkbox" className="accent-accent-gold-2"/> Mark as promotional content</label>
      <button disabled={busy} className="h-11 rounded-radius-md bg-accent-gold-2 px-6 font-semibold text-surface-0 disabled:opacity-50">{busy?'Uploading & publishing…':'Publish'}</button>
    </form>

    <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold text-primary">Published content</h2><button onClick={()=>void load()} className="text-sm font-semibold text-accent-gold-2">Refresh</button></div>
      {!posts.length?<div className="rounded-radius-xl border border-border-subtle bg-surface-1 p-8 text-center text-sm text-muted">No posts yet.</div>:
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{posts.map((post:any)=>{
        const first=post.media_list?.[0]; const url=first?.media?mediaUrl(first.media):null;
        return <article key={post.id} className="overflow-hidden rounded-radius-xl border border-border-subtle bg-surface-1">
          {url&&<div className="aspect-[4/3] bg-surface-2"><img src={url} alt={post.title||'Business content'} className="h-full w-full object-cover"/></div>}
          <div className="p-4"><p className="font-semibold text-primary">{post.title||'LOOKIVA post'}</p><p className="mt-2 line-clamp-3 text-sm text-secondary">{post.body_plain||'Media post'}</p><p className="mt-3 text-xs text-muted">{post.like_count||post.likes_count||0} likes · {post.comment_count||0} comments</p></div>
        </article>;
      })}</div>}
    </section>
  </div>;
}
