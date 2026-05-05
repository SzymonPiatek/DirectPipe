'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sendFile } from '@/lib/transfer/sender';
import { createReceiver, downloadBlob } from '@/lib/transfer/receiver';
import type { TransferMeta } from '@/lib/transfer/protocol';

export type TransferStatus = 'idle' | 'sending' | 'receiving' | 'done' | 'error';

export interface TransferState {
  status: TransferStatus;
  fileName: string;
  totalBytes: number;
  transferredBytes: number;
  /** Smoothed bytes-per-second (EMA, ~1 s window). */
  rate: number;
}

const INITIAL_STATE: TransferState = {
  status: 'idle',
  fileName: '',
  totalBytes: 0,
  transferredBytes: 0,
  rate: 0,
};

/** Manages file send/receive over an RTCDataChannel. */
export function useTransfer(channel: RTCDataChannel | null) {
  const [state, setState] = useState<TransferState>(INITIAL_STATE);

  const rateRef = useRef({ lastBytes: 0, lastTime: 0, ema: 0 });

  function updateRate(bytes: number) {
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

  // Wire up receiver when channel opens
  useEffect(() => {
    if (!channel) return;

    rateRef.current = { lastBytes: 0, lastTime: Date.now(), ema: 0 };

    const { handleMessage } = createReceiver({
      onMeta: (meta: TransferMeta) => {
        setState({
          status: 'receiving',
          fileName: meta.name,
          totalBytes: meta.size,
          transferredBytes: 0,
          rate: 0,
        });
      },
      onProgress: (received) => {
        setState((prev) => ({
          ...prev,
          transferredBytes: received,
          rate: updateRate(received),
        }));
      },
      onDone: (blob, name) => {
        downloadBlob(blob, name);
        setState((prev) => ({ ...prev, status: 'done', transferredBytes: prev.totalBytes }));
      },
    });

    channel.onmessage = handleMessage;
  }, [channel]);

  const send = useCallback(
    async (file: File) => {
      if (!channel) return;

      rateRef.current = { lastBytes: 0, lastTime: Date.now(), ema: 0 };

      setState({
        status: 'sending',
        fileName: file.name,
        totalBytes: file.size,
        transferredBytes: 0,
        rate: 0,
      });

      try {
        await sendFile(channel, file, (sent) => {
          setState((prev) => ({
            ...prev,
            transferredBytes: sent,
            rate: updateRate(sent),
          }));
        });
        setState((prev) => ({ ...prev, status: 'done', transferredBytes: prev.totalBytes }));
      } catch {
        setState((prev) => ({ ...prev, status: 'error' }));
      }
    },
    [channel],
  );

  return { state, send };
}
