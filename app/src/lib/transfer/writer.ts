import type { TransferMeta } from './protocol';

export interface FileWriter {
  write(chunk: ArrayBuffer): Promise<void>;
  close(): Promise<void>;
}

export const LARGE_FILE_THRESHOLD = 2 * 1024 ** 3; // 2 GB

// showSaveFilePicker is not yet in the standard TypeScript lib.dom types.
interface FsaaWindow {
  showSaveFilePicker(options?: { suggestedName?: string }): Promise<{
    createWritable(): Promise<{
      write(data: ArrayBuffer): Promise<void>;
      close(): Promise<void>;
    }>;
  }>;
}

export function isFsaaSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

/**
 * Opens the File System Access API save picker and returns a streaming writer.
 * Throws if the user cancels or the browser doesn't support FSAA.
 */
export async function openFsaaWriter(fileName: string): Promise<FileWriter> {
  const fsaa = window as unknown as FsaaWindow;
  const handle = await fsaa.showSaveFilePicker({ suggestedName: fileName });
  const writable = await handle.createWritable();
  return {
    write: (chunk) => writable.write(chunk),
    close: () => writable.close(),
  };
}

/**
 * Accumulates all chunks in memory and triggers a browser download on close.
 * Suitable for files up to ~2 GB on Chrome.
 */
export function createBlobWriter(meta: TransferMeta): FileWriter {
  const chunks: ArrayBuffer[] = [];
  return {
    write: async (chunk) => {
      chunks.push(chunk);
    },
    close: async () => {
      const blob = new Blob(chunks, { type: meta.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = meta.name;
      a.click();
      URL.revokeObjectURL(url);
    },
  };
}
