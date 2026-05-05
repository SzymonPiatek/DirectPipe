/**
 * Dynamically determines the WebSocket URL for signaling.
 * In the browser, it uses the current host and protocol.
 */
export function getWsUrl(): string {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Nginx is configured to proxy /ws to the API server
    return `${protocol}//${window.location.host}/ws`;
  }
  return process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';
}

/**
 * Dynamically determines the HTTP base URL for the API.
 */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // Nginx is configured to proxy /api/ to the API server
    return `${window.location.origin}/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}
