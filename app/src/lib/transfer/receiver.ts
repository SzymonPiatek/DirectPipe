import { decodeTextMessage, type TransferMeta } from './protocol';
import type { FileWriter } from './writer';

export interface ReceiverCallbacks {
  onMeta: (meta: TransferMeta) => void;
  onProgress: (receivedBytes: number) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

/**
 * Stateful DataChannel receiver with sequential message processing.
 */
export class Receiver {
  private meta: TransferMeta | null = null;
  private writer: FileWriter | null = null;
  private buffer: ArrayBuffer[] = [];
  private received = 0;
  private transferComplete = false;
  
  // Queue to ensure messages are processed in order even if handlers are async
  private processingQueue: Promise<void> = Promise.resolve();

  constructor(private callbacks: ReceiverCallbacks) {}

  /**
   * Main entry point for DataChannel messages. 
   * Wraps processing in a queue to prevent race conditions.
   */
  handleMessage = (event: MessageEvent): void => {
    this.processingQueue = this.processingQueue.then(() => this.processMessage(event))
      .catch(err => {
        console.error('Transfer processing error:', err);
        this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      });
  };

  private async processMessage(event: MessageEvent): Promise<void> {
    // Handle Text Messages (JSON)
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

    // Handle Binary Data
    let data: ArrayBuffer;
    if (event.data instanceof ArrayBuffer) {
      data = event.data;
    } else if (event.data instanceof Blob) {
      data = await event.data.arrayBuffer();
    } else {
      return; // Unknown format
    }

    if (this.meta) {
      this.received += data.byteLength;
      this.callbacks.onProgress(this.received);

      if (this.writer) {
        await this.writer.write(data);
      } else {
        this.buffer.push(data);
      }
    }
  }

  /**
   * Provides a writer and drains the in-memory buffer.
   */
  async acceptSave(writer: FileWriter): Promise<void> {
    // We also queue the acceptSave call to avoid conflicts with ongoing message processing
    this.processingQueue = this.processingQueue.then(async () => {
      this.writer = writer;

      for (const chunk of this.buffer) {
        await this.writer.write(chunk);
      }
      this.buffer = [];

      if (this.transferComplete) {
        await this.writer.close();
        this.callbacks.onDone();
      }
    });
    
    return this.processingQueue;
  }

  private reset(): void {
    this.meta = null;
    this.writer = null;
    this.buffer = [];
    this.received = 0;
    this.transferComplete = false;
    this.processingQueue = Promise.resolve();
  }
}
