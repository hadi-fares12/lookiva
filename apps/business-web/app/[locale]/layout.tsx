import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import { ThemeProvider } from '../../components/theme-provider';
import { SessionGuard } from '../../components/session-guard';
import type { Locale } from '../../i18n/routing';
import { Link } from '../../i18n/routing';
import { PortalControls } from '../../components/portal-controls';
import '../globals.css';

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: 'portal.business' });
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen bg-surface-0 text-primary antialiased">
        <ThemeProvider defaultTheme="midnight-gold">
          <NextIntlClientProvider messages={messages}>
            <div className="flex min-h-screen">
              <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-surface-1 border-r border-border-subtle">
                <div className="p-6 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-radius-lg bg-gradient-to-br from-accent-gold-1 to-accent-gold-3 flex items-center justify-center">
                      <span className="text-surface-0 font-bold text-lg">L</span>
                    </div>
                    <div>
                      <h1 className="font-bold text-lg text-primary">LOOKIVA</h1>
                      <p className="text-xs text-muted">{t('role')}</p>
                    </div>
                  </div>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                  <div className="text-xs uppercase text-muted font-medium px-3 py-2">{t('navigation')}</div>
                  {[
                    ['dashboard','dashboard'], ['calendar','calendar'], ['floor','floor'], ['queue','queue'], ['customers','customers'], ['professionals','professionals'], ['services','services'], ['resources','resources'], ['inventory','inventory'], ['payments','payments'], ['finance','finance'], ['banking','banking'], ['withdrawals','withdrawals'], ['commissions','commissions'], ['analytics','analytics'], ['reports','reports'], ['promotions','promotions'], ['packageRedemptions','package-redemptions'], ['forms','forms'], ['reviews','reviews'], ['staff','staff'], ['branches','branches'], ['subscriptions','subscriptions'], ['audit','audit'], ['settings','settings']
                  ].map(([key, href]) => (
                    <Link key={href} href={`/${href}`} className="block px-3 py-2 rounded-radius-md text-sm text-secondary hover:bg-surface-2 hover:text-primary">{t(`nav.${key}`)}</Link>
                  ))}
                </nav>
              </aside>
              <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-surface-1 border-b border-border-subtle flex items-center justify-between px-4 md:px-6 sticky top-0 z-z-sticky-header backdrop-blur">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm md:text-base font-semibold text-primary">{t('header')}</h2>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4">
                    <PortalControls />
                    <div className="w-9 h-9 rounded-radius-full bg-gradient-to-br from-accent-gold-1 to-accent-gold-3 flex items-center justify-center text-surface-0 font-semibold text-sm">
                      B
                    </div>
                  </div>
                </header>
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
                  <SessionGuard locale={locale}>{children}</SessionGuard>
                </main>
              </div>
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
