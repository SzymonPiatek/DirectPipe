import crypto from 'node:crypto';

export interface TurnCredentials {
  username: string;
  credential: string;
  ttl: number;
  urls: string[];
}

/**
 * Generates short-lived TURN credentials using the HMAC-SHA1 REST API method.
 * Compatible with Coturn's `use-auth-secret` mode.
 */
export function makeTurnCreds(secret: string, host: string, ttlSeconds = 300): TurnCredentials {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiry}:${crypto.randomUUID()}`;
  const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');

  return {
    username,
    credential,
    ttl: ttlSeconds,
    urls: [
      `stun:${host}:3478`,
      `turn:${host}:3478?transport=udp`,
      `turn:${host}:3478?transport=tcp`,
    ],
  };
}
