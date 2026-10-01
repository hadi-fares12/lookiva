import createNextIntlPlugin from 'next-intl/plugin';

const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
let mediaPattern = null;
if (mediaUrl) {
  try {
    const parsed = new URL(mediaUrl);
    mediaPattern = { protocol: parsed.protocol.replace(':', ''), hostname: parsed.hostname, port: parsed.port || '', pathname: '/**' };
  } catch {
    if (process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_MEDIA_BASE_URL must be a valid URL');
  }
}

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    remotePatterns: [
      ...(mediaPattern ? [mediaPattern] : []),
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  reactStrictMode: true,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
      ],
    }];
  },
};

export default withNextIntl(nextConfig);
