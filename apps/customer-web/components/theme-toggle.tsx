'use client';

import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';
import { useTranslations } from 'next-intl';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('profile');
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const options: Array<{
    key: 'midnight-gold' | 'silver-light' | 'system';
    icon: React.ReactNode;
    label: string;
  }> = [
    { key: 'midnight-gold', icon: <Moon className="w-4 h-4" />, label: 'Midnight Gold' },
    { key: 'silver-light', icon: <Sun className="w-4 h-4" />, label: 'Silver Light' },
    { key: 'system', icon: <Monitor className="w-4 h-4" />, label: t('systemDefault') },
  ];

  const activeOption = options.find((o) => o.key === theme) ?? options[0];

  return (
    <div className={twMerge('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-radius-md border border-border-subtle bg-surface-1 hover:bg-surface-2 text-secondary hover:text-primary inline-flex items-center justify-center transition-colors"
        aria-label={t('theme')}
      >
        {activeOption.icon}
      </button>
      {open && (
        <div className="absolute z-z-popover end-0 mt-2 w-56 rounded-radius-lg border border-border-subtle bg-surface-1 p-1 shadow-shadow-4 animate-fade-in">
          <div className="px-3 py-2 text-xs uppercase text-muted font-semibold tracking-wide">
            {t('theme')}
          </div>
          <div className="flex flex-col gap-0.5">
            {options.map((opt) => {
              const selected = opt.key === theme;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setTheme(opt.key);
                    setOpen(false);
                  }}
                  className={clsx(
                    'w-full inline-flex items-center gap-3 px-3 py-2 rounded-radius-md text-sm transition-colors text-left',
                    selected
                      ? 'bg-accent-gold-2/10 text-accent-gold-2'
                      : 'text-secondary hover:bg-surface-2 hover:text-primary'
                  )}
                >
                  {opt.icon}
                  <span className="flex-1">{opt.label}</span>
                  {selected && <div className="w-2 h-2 rounded-radius-full bg-accent-gold-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


