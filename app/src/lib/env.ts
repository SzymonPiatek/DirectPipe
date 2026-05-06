export function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Nginx is configured to proxy /ws to the API server
    return `${protocol}//${window.location.host}/ws`;
  }
  return 'ws://localhost:4000';
}

export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    // Nginx is configured to proxy /api/ to the API server
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:4000';
}
