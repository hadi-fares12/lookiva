'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '../i18n/routing';
import { useTheme } from './theme-provider';

const localeOptions = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
] as const;

export function PortalControls() {
  const t = useTranslations('portal.shared');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState<'theme'|'language'|null>(null);

  const changeLocale = (next: 'en'|'ar'|'fr') => {
    router.replace(pathname || '/', { locale: next });
    setOpen(null);
  };

  return <div className="relative flex items-center gap-2">
    <div className="relative">
      <button type="button" onClick={()=>setOpen(open==='theme'?null:'theme')} className="w-9 h-9 rounded-radius-md border border-border-subtle flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-2" aria-label={t('theme')} title={t('theme')}>◐</button>
      {open==='theme'&&<div className="absolute end-0 z-50 mt-2 w-52 rounded-radius-lg border border-border-subtle bg-surface-1 p-1 shadow-shadow-4">
        {([['midnight-gold','midnightGold'],['silver-light','silverLight'],['system','system']] as const).map(([value,key])=><button key={value} type="button" onClick={()=>{setTheme(value);setOpen(null)}} className={`block w-full rounded-radius-md px-3 py-2 text-start text-sm ${theme===value?'bg-accent-gold-2/10 text-accent-gold-2':'text-secondary hover:bg-surface-2 hover:text-primary'}`}>{t(key)}</button>)}
      </div>}
    </div>
    <div className="relative">
      <button type="button" onClick={()=>setOpen(open==='language'?null:'language')} className="h-9 min-w-9 rounded-radius-md border border-border-subtle px-2 text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-2" aria-label={t('language')} title={t('language')}>{locale.toUpperCase()}</button>
      {open==='language'&&<div className="absolute end-0 z-50 mt-2 w-44 rounded-radius-lg border border-border-subtle bg-surface-1 p-1 shadow-shadow-4">
        {localeOptions.map(opt=><button key={opt.code} type="button" onClick={()=>changeLocale(opt.code)} className={`block w-full rounded-radius-md px-3 py-2 text-start text-sm ${locale===opt.code?'bg-accent-gold-2/10 text-accent-gold-2':'text-secondary hover:bg-surface-2 hover:text-primary'}`}>{opt.label}</button>)}
      </div>}
    </div>
  </div>;
}
