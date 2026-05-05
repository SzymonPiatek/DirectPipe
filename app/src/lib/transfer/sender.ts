import { CHUNK_SIZE, encodeMeta, encodeDone } from './protocol';

const MAX_BUFFERED = 16 * 1024 * 1024; // pause when DataChannel buffer exceeds 16 MB

/**
 * Sends a file over an open RTCDataChannel.
 *
 * Flow: meta frame → binary chunks (via Web Worker) → done frame.
 * Backpressure: pauses the worker when the send buffer is full.
 */
export async function sendFile(
  channel: RTCDataChannel,
  file: File,
  onProgress: (sentBytes: number) => void,
): Promise<void> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  channel.send(
    encodeMeta({
      name: file.name,
      size: file.size,
      mime: file.type || 'application/octet-stream',
      totalChunks,
    }),
  );

  const worker = new Worker(new URL('./chunker.worker.ts', import.meta.url));
  let sent = 0;

  await new Promise<void>((resolve, reject) => {
    worker.onmessage = async ({ data }: MessageEvent<ArrayBuffer | { done: true }>) => {
      if (!(data instanceof ArrayBuffer)) {
        channel.send(encodeDone());
        worker.terminate();
        resolve();
        return;
      }

      if (channel.bufferedAmount > MAX_BUFFERED) {
        await new Promise<void>((res) =>
          channel.addEventListener('bufferedamountlow', () => res(), { once: true }),
        );
      }

      channel.send(data);
      sent += data.byteLength;
      onProgress(sent);
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message));
    };

    worker.postMessage({ file, chunkSize: CHUNK_SIZE });
  });
}
