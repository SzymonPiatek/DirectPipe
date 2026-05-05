export const CHUNK_SIZE = 16 * 1024; // 16 KB — safe SCTP limit

export interface TransferMeta {
  type: 'meta';
  name: string;
  size: number;
  mime: string;
  totalChunks: number;
}

export interface TransferDone {
  type: 'done';
}

export type TransferTextMessage = TransferMeta | TransferDone;

/** Serializes the file metadata frame sent before the first binary chunk. */
export function encodeMeta(meta: Omit<TransferMeta, 'type'>): string {
  return JSON.stringify({ type: 'meta', ...meta } satisfies TransferMeta);
}

/** Serializes the completion frame sent after the last binary chunk. */
export function encodeDone(): string {
  return JSON.stringify({ type: 'done' } satisfies TransferDone);
}

/** Parses a text frame from the data channel. */
export function decodeTextMessage(raw: string): TransferTextMessage {
  return JSON.parse(raw) as TransferTextMessage;
}
