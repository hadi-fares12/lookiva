import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'ar', 'fr'] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;

  if (!requestedLocale || !locales.includes(requestedLocale as any)) {
    notFound();
  }

  const locale = requestedLocale as (typeof locales)[number];

  return {
    locale,
    messages: (
      await import(`@lookiva/localization/src/locales/${locale}.json`)
    ).default,
  };
});