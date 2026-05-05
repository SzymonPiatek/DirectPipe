import { WebSocket } from 'ws';

export type PeerRole = 'initiator' | 'receiver' | 'room-full';

const rooms = new Map<string, Set<WebSocket>>();

/**
 * Adds `ws` to the given room and returns the assigned role.
 * Returns `'room-full'` when the room already has two peers.
 */
export function joinRoom(roomId: string, ws: WebSocket): PeerRole {
  const room = rooms.get(roomId) ?? new Set<WebSocket>();
  rooms.set(roomId, room);

  if (room.size >= 2) return 'room-full';

  room.add(ws);
  return room.size === 1 ? 'initiator' : 'receiver';
}

/**
 * Removes `ws` from its room and notifies the remaining peer.
 * Deletes the room when it becomes empty.
 */
export function leaveRoom(ws: WebSocket): void {
  for (const [roomId, peers] of rooms) {
    if (!peers.has(ws)) continue;

    peers.delete(ws);

    if (peers.size === 0) {
      rooms.delete(roomId);
    } else {
      for (const peer of peers) {
        peer.send(JSON.stringify({ type: 'peer-left' }));
      }
    }

    break;
  }
}

/**
 * Forwards `message` to the other peer in the same room as `sender`.
 * Returns `true` if a recipient was found and reachable.
 */
export function relay(sender: WebSocket, message: string): boolean {
  for (const peers of rooms.values()) {
    if (!peers.has(sender)) continue;

    for (const peer of peers) {
      if (peer !== sender && peer.readyState === WebSocket.OPEN) {
        peer.send(message);
        return true;
      }
    }
  }

  return false;
}
