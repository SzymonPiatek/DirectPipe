import { getApiUrl } from './env';

interface TurnCredentials {
  username: string;
  credential: string;
  urls: string[];
}

interface IceCache {
  servers: RTCIceServer[];
  expiresAt: number;
}

const CACHE_KEY = 'directpipe:ice';
const STUN_FALLBACK: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

async function fetchTurnServers(): Promise<RTCIceServer[]> {
  const res = await fetch(`${getApiUrl()}/turn-credentials`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as TurnCredentials;
  return [{ urls: data.urls, username: data.username, credential: data.credential }];
}

/**
 * Returns ICE servers, preferring cached TURN credentials.
 * Falls back to a public STUN server if the API is unavailable.
 */
export async function getIceServers(): Promise<RTCIceServer[]> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as IceCache;
      if (Date.now() < cached.expiresAt) return cached.servers;
    }

    const servers = await fetchTurnServers();
    const cache: IceCache = { servers, expiresAt: Date.now() + 240_000 };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return servers;
  } catch {
    return STUN_FALLBACK;
  }
}
