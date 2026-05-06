import { WebSocket } from 'ws';
import type { Logger } from 'pino';
import {
  ClientMessageSchema,
  type ClientMessage,
  type ServerMessage,
  MAX_MESSAGE_BYTES,
} from './protocol.js';
import { joinRoom, leaveRoom, relay } from './rooms.js';

interface ConnectionState {
  joined: boolean;
}

/** Serializes and sends a typed server message to `ws`. */
function send(ws: WebSocket, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

/**
 * Handles a single `join` message: assigns a role and notifies the initiator
 * when the second peer arrives.
 */
function handleJoin(ws: WebSocket, roomId: string, state: ConnectionState, log: Logger): void {
  if (state.joined) return;

  const role = joinRoom(roomId, ws);

  if (role === 'room-full') {
    send(ws, { type: 'room-full' });
    return;
  }

  state.joined = true;
  send(ws, { type: 'joined', role });

  if (role === 'receiver') {
    relay(ws, JSON.stringify({ type: 'peer-joined' } satisfies ServerMessage));
  }

  log.info({ roomId, role }, 'peer joined');
}

/** Routes a validated client message to the appropriate handler. */
function handleMessage(
  ws: WebSocket,
  message: ClientMessage,
  state: ConnectionState,
  log: Logger,
): void {
  if (message.type === 'join') {
    handleJoin(ws, message.roomId, state, log);
    return;
  }

  if (!state.joined) {
    send(ws, { type: 'error', message: 'Not joined' });
    return;
  }

  relay(ws, JSON.stringify(message));
}

/**
 * Attaches all event listeners to a newly opened WebSocket connection.
 * Validates, parses, and routes every incoming message.
 */
export function handleConnection(ws: WebSocket, log: Logger): void {
  const state: ConnectionState = { joined: false };

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      ws.close(1009, 'Binary messages not supported');
      return;
    }

    const raw = data as Buffer;

    if (raw.length > MAX_MESSAGE_BYTES) {
      ws.close(1009, 'Message too large');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      ws.close(1003, 'Invalid JSON');
      return;
    }

    const result = ClientMessageSchema.safeParse(parsed);
    if (!result.success) {
      send(ws, { type: 'error', message: 'Invalid message' });
      return;
    }

    handleMessage(ws, result.data, state, log);
  });

  ws.on('close', () => {
    leaveRoom(ws);
    log.info('peer disconnected');
  });

  ws.on('error', (err) => log.error(err, 'ws error'));
}
