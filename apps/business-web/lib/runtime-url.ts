function isPrivateLanHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

export function resolveBrowserApiBase(configuredBase: string): string {
  const fallback = (configuredBase || 'http://localhost:4000/api/v1').replace(/\/$/, '');
  if (typeof window === 'undefined') return fallback;

  try {
    const url = new URL(fallback);
    if (isPrivateLanHost(url.hostname) && isPrivateLanHost(window.location.hostname)) {
      url.hostname = window.location.hostname;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    // Keep the configured value when it is not a valid absolute URL.
  }

  return fallback;
}
