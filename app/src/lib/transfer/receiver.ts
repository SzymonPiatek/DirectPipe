import { decodeTextMessage, type TransferMeta } from './protocol';

export interface ReceiverCallbacks {
  onMeta: (meta: TransferMeta) => void;
  onProgress: (receivedBytes: number) => void;
  onDone: (blob: Blob, fileName: string) => void;
}

/**
 * Creates a DataChannel message handler that reassembles binary chunks
 * into a Blob and triggers a browser download when complete.
 *
 * Phase 5: accumulates all chunks in memory — suitable for files up to ~2 GB.
 */
export function createReceiver(callbacks: ReceiverCallbacks) {
  let meta: TransferMeta | null = null;
  const chunks: ArrayBuffer[] = [];
  let received = 0;

  function handleMessage({ data }: MessageEvent) {
    if (typeof data === 'string') {
      const msg = decodeTextMessage(data);

      if (msg.type === 'meta') {
        meta = msg;
        chunks.length = 0;
        received = 0;
        callbacks.onMeta(msg);
        return;
      }

      if (msg.type === 'done' && meta) {
        const blob = new Blob(chunks, { type: meta.mime });
        callbacks.onDone(blob, meta.name);
        meta = null;
      }
      return;
    }

    if (data instanceof ArrayBuffer && meta) {
      chunks.push(data);
      received += data.byteLength;
      callbacks.onProgress(received);
    }
  }

  return { handleMessage };
}

/** Triggers a browser file download from a Blob. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
