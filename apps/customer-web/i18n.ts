import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './i18n/routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;

  if (
    !requestedLocale ||
    !routing.locales.includes(
      requestedLocale as (typeof routing.locales)[number]
    )
  ) {
    notFound();
  }

  const locale =
    requestedLocale as (typeof routing.locales)[number];

  return {
    locale,
    messages: (
      await import(
        `../../packages/localization/src/locales/${locale}.json`
      )
    ).default,
  };
});