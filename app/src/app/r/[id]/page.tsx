'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useRoom, type ConnectionStatus } from '@/hooks/useRoom';
import { useTransfer } from '@/hooks/useTransfer';

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  waiting: 'Waiting for peer…',
  p2p: 'Connected (P2P)',
  relay: 'Connected (relay)',
  failed: 'Connection failed',
};

const STATUS_VARIANT: Record<
  ConnectionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  connecting: 'secondary',
  waiting: 'secondary',
  p2p: 'default',
  relay: 'outline',
  failed: 'destructive',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatEta(remaining: number, rate: number): string {
  if (rate <= 0) return '–';
  const secs = Math.ceil(remaining / rate);
  if (secs < 60) return `${secs}s`;
  return `${Math.ceil(secs / 60)}m`;
}

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const [shareUrl, setShareUrl] = useState(`/r/${id}`);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { status, role, channel } = useRoom(id);
  const { state: transfer, send, accept } = useTransfer(channel);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/r/${id}`);
  }, [id]);

  function handleFiles(files: FileList | null) {
    if (files?.[0]) send(files[0]);
  }

  const connected = status === 'p2p' || status === 'relay';
  const transferring = transfer.status === 'sending' || transfer.status === 'receiving';
  const percent =
    transfer.totalBytes > 0
      ? Math.round((transfer.transferredBytes / transfer.totalBytes) * 100)
      : 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Room</CardTitle>
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {!connected && (
            <>
              <p className="text-sm text-muted-foreground">
                Share this link with the other person:
              </p>
              <code className="rounded bg-muted px-3 py-2 text-sm break-all">
                {shareUrl}
              </code>
            </>
          )}

          {role && (
            <p className="text-xs text-muted-foreground">
              You are the <strong>{role}</strong>.
            </p>
          )}

          {/* Sender — drop zone */}
          {connected && role === 'initiator' && transfer.status === 'idle' && (
            <div
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            >
              <p className="text-sm text-muted-foreground">Drop a file here or</p>
              <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                Choose file
              </Button>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          )}

          {/* Receiver — waiting */}
          {connected && role === 'receiver' && transfer.status === 'idle' && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Waiting for the other person to send a file…
            </p>
          )}

          {/* Receiver — incoming file, needs save picker */}
          {transfer.status === 'incoming' && transfer.needsSavePicker && (
            <div className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center">
              <p className="text-sm font-medium">{transfer.fileName}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(transfer.totalBytes)}</p>
              <Button onClick={accept}>Save as…</Button>
            </div>
          )}

          {/* Receiver — incoming, auto-proceeding (Blob path) */}
          {transfer.status === 'incoming' && !transfer.needsSavePicker && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Preparing to receive <strong>{transfer.fileName}</strong>…
            </p>
          )}

          {/* Progress bar */}
          {transferring && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="truncate max-w-[200px]">{transfer.fileName}</span>
                <span>{percent}%</span>
              </div>
              <Progress value={percent} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatBytes(transfer.rate)}/s</span>
                <span>
                  {formatBytes(transfer.transferredBytes)} / {formatBytes(transfer.totalBytes)}
                  {transfer.rate > 0 &&
                    ` · ETA ${formatEta(transfer.totalBytes - transfer.transferredBytes, transfer.rate)}`}
                </span>
              </div>
            </div>
          )}

          {transfer.status === 'done' && (
            <p className="text-sm text-center text-green-600 dark:text-green-400 font-medium">
              {role === 'initiator' ? 'File sent.' : 'File received — check your downloads.'}
            </p>
          )}

          {transfer.status === 'error' && (
            <p className="text-sm text-center text-destructive">Transfer failed.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
