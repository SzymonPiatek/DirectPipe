/// <reference lib="webworker" />

interface WorkerInput {
  file: File;
  chunkSize: number;
}

self.onmessage = async ({ data }: MessageEvent<WorkerInput>) => {
  const { file, chunkSize } = data;

  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const buf = await file.slice(offset, offset + chunkSize).arrayBuffer();
    // Transferable: zero-copy hand-off to main thread
    self.postMessage(buf, [buf]);
  }

  self.postMessage({ done: true });
};
