/** WebSocket URL for the signaling server. */
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

/** HTTP base URL for the API (turn-credentials, health). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
