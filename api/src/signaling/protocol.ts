import { z } from 'zod';

export const MAX_MESSAGE_BYTES = 4096;

/** Messages the client may send to the server. */
export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join'), roomId: z.string().min(1).max(64) }),
  z.object({ type: z.literal('offer'), sdp: z.record(z.unknown()) }),
  z.object({ type: z.literal('answer'), sdp: z.record(z.unknown()) }),
  z.object({ type: z.literal('ice'), candidate: z.record(z.unknown()) }),
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

/** Messages the server may push to a client. */
export type ServerMessage =
  | { type: 'joined'; role: 'initiator' | 'receiver' }
  | { type: 'peer-joined' }
  | { type: 'peer-left' }
  | { type: 'room-full' }
  | { type: 'error'; message: string }
  | { type: 'offer'; sdp: Record<string, unknown> }
  | { type: 'answer'; sdp: Record<string, unknown> }
  | { type: 'ice'; candidate: Record<string, unknown> };
