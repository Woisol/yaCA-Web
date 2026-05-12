export function formatSessionRoute(sessionId: string | undefined): string {
  return sessionId ? `/${encodeURIComponent(sessionId)}` : '/';
}

export function readSessionIdFromPathname(pathname: string): string | undefined {
  const normalized = pathname.trim();
  if (normalized === '' || normalized === '/') return undefined;
  const match = /^\/([^/]+)\/?$/.exec(normalized);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1] ?? '');
  } catch {
    return undefined;
  }
}

export function readCurrentSessionRoute(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return readSessionIdFromPathname(window.location.pathname);
}

export function writeSessionRoute(sessionId: string | undefined, mode: 'push' | 'replace' = 'push'): void {
  if (typeof window === 'undefined') return;
  const nextPath = formatSessionRoute(sessionId);
  const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) return;
  window.history[mode === 'replace' ? 'replaceState' : 'pushState']({ sessionId }, '', nextUrl);
}
