import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import { ThemeProvider } from '@/components/theme-provider';
import { ReactQueryProvider } from '@/components/react-query-provider';
import { Header } from '@/components/header';
import { BottomNav } from '@/components/bottom-nav';
import { Toaster } from 'sonner';
import '../globals.css';

export const viewport = { themeColor: '#D4AF37' };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: 'auth' });
  const title =
    locale === 'ar' ? 'LOOKIVA — خدمات جمال وعناية بالقرب منك' :
    locale === 'fr' ? 'LOOKIVA — Beauté & bien-être près de chez vous' :
    'LOOKIVA — Premium Beauty & Wellness Nearby';
  const description =
    locale === 'ar' ? 'اكتشف أفضل صالونات، سبا، ومحترفي الجمال في لبنان. احجز موعداً فورياً وتصف أعمال حقيقية.' :
    locale === 'fr' ? 'Découvrez les meilleurs salons, spas et professionnels au Liban. Réservez en temps réel et voyez de vrais travaux.' :
    'Discover top-rated salons, spas, and beauty professionals in Lebanon. Book instantly and see verified real work.';
  return {
    title,
    description,
    keywords: [
      'LOOKIVA', 'beauty', 'wellness', 'hair', 'spa', 'barber',
      'Beirut', 'Lebanon', 'booking', 'salon near me',
    ],
    openGraph: {
      title,
      description,
      siteName: 'LOOKIVA',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

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
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen bg-surface-0 text-primary antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider defaultTheme="midnight-gold">
            <ReactQueryProvider>
              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  classNames: {
                    toast:
                      'group toast group-[.toaster]:bg-surface-1 group-[.toaster]:text-primary group-[.toaster]:border-border-subtle group-[.toaster]:shadow-shadow-4',
                  },
                }}
              />
              <div className="flex min-h-screen flex-col pb-[calc(env(safe-area-inset-bottom)+4rem)] md:pb-0">
                <Header />
                <main className="flex-1 w-full">
                  {children}
                </main>
                <BottomNav />
              </div>
            </ReactQueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}


