import { decodeTextMessage, type TransferMeta } from './protocol';
import type { FileWriter } from './writer';

export interface ReceiverCallbacks {
  onMeta: (meta: TransferMeta) => void;
  onProgress: (receivedBytes: number) => void;
  onDone: () => void;
}

/**
 * Stateful DataChannel receiver.
 *
 * Chunks that arrive before `acceptSave` is called are buffered in memory.
 * Once a FileWriter is provided, buffered and subsequent chunks stream
 * directly to disk — RAM usage stays flat regardless of file size.
 */
export class Receiver {
  private meta: TransferMeta | null = null;
  private writer: FileWriter | null = null;
  private buffer: ArrayBuffer[] = [];
  private received = 0;
  private transferComplete = false;

  constructor(private callbacks: ReceiverCallbacks) {}

  handleMessage = async (event: MessageEvent): Promise<void> => {
    if (typeof event.data === 'string') {
      const msg = decodeTextMessage(event.data);

      if (msg.type === 'meta') {
        this.reset();
        this.meta = msg;
        this.callbacks.onMeta(msg);
        return;
      }

      if (msg.type === 'done') {
        this.transferComplete = true;
        if (this.writer) {
          await this.writer.close();
          this.callbacks.onDone();
        }
        return;
      }
    }

    if (event.data instanceof ArrayBuffer && this.meta) {
      this.received += event.data.byteLength;
      this.callbacks.onProgress(this.received);

      if (this.writer) {
        await this.writer.write(event.data);
      } else {
        this.buffer.push(event.data);
      }
    }
  };

  /**
   * Provides a writer, drains the in-memory buffer, then streams remaining
   * chunks directly. Must be called before the transfer completes for large files.
   */
  async acceptSave(writer: FileWriter): Promise<void> {
    this.writer = writer;

    for (const chunk of this.buffer) {
      await this.writer.write(chunk);
    }
    this.buffer = [];

    if (this.transferComplete) {
      await this.writer.close();
      this.callbacks.onDone();
    }
  }

  private reset(): void {
    this.meta = null;
    this.writer = null;
    this.buffer = [];
    this.received = 0;
    this.transferComplete = false;
  }
}
