import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './i18n/routing';

export default getRequestConfig(async ({ locale }) => {
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  return {
    messages: (
      await import(
        `../../packages/localization/src/locales/${locale}.json`
      )
    ).default,
  };
});
