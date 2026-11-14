function isPrivateIPv4(hostname: string): boolean {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return false;
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
}

/** Accept an explicit origin only; never infer a destination for private AI input. */
export function resolveAIEndpoint(origin: string | undefined, allowInsecureHTTP = false): string | null {
  if (!origin || origin.trim() !== origin || !/^https?:\/\/[^/?#@\\\s]+\/?$/.test(origin)) return null;
  try {
    const url = new URL(origin);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    const loopback = url.hostname === 'localhost' || url.hostname === '[::1]' ||
      /^127\.(?:\d{1,3}\.){2}\d{1,3}$/.test(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' &&
        (loopback || (allowInsecureHTTP && isPrivateIPv4(url.hostname))))) return null;
    return `${url.origin}/api/parse-transaction`;
  } catch { return null; }
}

export function getAIEndpoint(): string | null {
  // Expo requires static references to inline these public build-time settings.
  const origin = process.env.EXPO_PUBLIC_AI_API_URL || 'http://localhost:3001';
  return resolveAIEndpoint(origin,
    process.env.EXPO_PUBLIC_ALLOW_INSECURE_AI_HTTP === 'true');
}
