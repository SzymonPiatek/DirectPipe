'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { sendFile } from '@/lib/transfer/sender';
import { Receiver } from '@/lib/transfer/receiver';
import { isFsaaSupported, openFsaaWriter, createBlobWriter, LARGE_FILE_THRESHOLD } from '@/lib/transfer/writer';
import type { TransferMeta } from '@/lib/transfer/protocol';

export type TransferStatus = 'idle' | 'sending' | 'incoming' | 'receiving' | 'done' | 'error';

export interface TransferState {
  status: TransferStatus;
  fileName: string;
  totalBytes: number;
  transferredBytes: number;
  /** Smoothed bytes/s (EMA, ~1 s window). */
  rate: number;
  /** True when FSAA is available and the user must click "Save as…". */
  needsSavePicker: boolean;
}

const INITIAL_STATE: TransferState = {
  status: 'idle',
  fileName: '',
  totalBytes: 0,
  transferredBytes: 0,
  rate: 0,
  needsSavePicker: false,
};

export function useTransfer(channel: RTCDataChannel | null) {
  const [state, setState] = useState<TransferState>(INITIAL_STATE);

  const receiverRef = useRef<Receiver | null>(null);
  const incomingMetaRef = useRef<TransferMeta | null>(null);
  const rateRef = useRef({ lastBytes: 0, lastTime: 0, ema: 0 });

  function updateRate(bytes: number): number {
    const now = Date.now();
    const r = rateRef.current;
    const dt = (now - r.lastTime) / 1000;
    if (dt >= 0.1) {
      const instant = (bytes - r.lastBytes) / dt;
      r.ema = 0.3 * instant + 0.7 * r.ema;
      r.lastBytes = bytes;
      r.lastTime = now;
    }
    return r.ema;
  }

  useEffect(() => {
    if (!channel) return;

    rateRef.current = { lastBytes: 0, lastTime: Date.now(), ema: 0 };

    const receiver = new Receiver({
      onMeta: (meta) => {
        incomingMetaRef.current = meta;
        const needsFsaa = isFsaaSupported();

        setState({
          status: 'incoming',
          fileName: meta.name,
          totalBytes: meta.size,
          transferredBytes: 0,
          rate: 0,
          needsSavePicker: needsFsaa,
        });

        if (!needsFsaa) {
          if (meta.size > LARGE_FILE_THRESHOLD) {
            toast.warning('File exceeds 2 GB — use Chrome for large file support.');
          }
          // Auto-proceed with Blob accumulation
          const writer = createBlobWriter(meta);
          receiver.acceptSave(writer).then(() => {
            setState((prev) => ({ ...prev, status: 'receiving' }));
          });
        }
      },
      onProgress: (received) => {
        setState((prev) => ({
          ...prev,
          status: prev.status === 'incoming' ? 'incoming' : 'receiving',
          transferredBytes: received,
          rate: updateRate(received),
        }));
      },
      onDone: () => {
        setState((prev) => ({ ...prev, status: 'done', transferredBytes: prev.totalBytes }));
      },
    });

    receiverRef.current = receiver;
    channel.onmessage = receiver.handleMessage;

    return () => {
      receiverRef.current = null;
      incomingMetaRef.current = null;
    };
  }, [channel]);

  /** Called when user clicks "Save as…" (FSAA path). */
  const accept = useCallback(async () => {
    const meta = incomingMetaRef.current;
    const receiver = receiverRef.current;
    if (!meta || !receiver) return;

    try {
      const writer = await openFsaaWriter(meta.name);
      await receiver.acceptSave(writer);
      setState((prev) => ({ ...prev, status: 'receiving', needsSavePicker: false }));
    } catch {
      // User cancelled the picker — stay in 'incoming' so they can try again
    }
  }, []);

  const send = useCallback(
    async (file: File) => {
      if (!channel) return;

      rateRef.current = { lastBytes: 0, lastTime: Date.now(), ema: 0 };
      setState({ status: 'sending', fileName: file.name, totalBytes: file.size, transferredBytes: 0, rate: 0, needsSavePicker: false });

      try {
        await sendFile(channel, file, (sent) => {
          setState((prev) => ({ ...prev, transferredBytes: sent, rate: updateRate(sent) }));
        });
        setState((prev) => ({ ...prev, status: 'done', transferredBytes: prev.totalBytes }));
      } catch {
        setState((prev) => ({ ...prev, status: 'error' }));
      }
    },
    [channel],
  );

  return { state, send, accept };
}
