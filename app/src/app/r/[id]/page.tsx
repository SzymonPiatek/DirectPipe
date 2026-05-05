'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRoom, type ConnectionStatus } from '@/hooks/useRoom';

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  waiting: 'Waiting for peer…',
  p2p: 'Connected (P2P)',
  relay: 'Connected (relay)',
  failed: 'Connection failed',
};

const STATUS_VARIANT: Record<ConnectionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  connecting: 'secondary',
  waiting: 'secondary',
  p2p: 'default',
  relay: 'outline',
  failed: 'destructive',
};

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const [shareUrl, setShareUrl] = useState(`/r/${id}`);
  const { status, role } = useRoom(id);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/r/${id}`);
  }, [id]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Room</CardTitle>
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Share this link with the other person:
          </p>
          <code className="rounded bg-muted px-3 py-2 text-sm break-all">
            {shareUrl}
          </code>
          {role && (
            <p className="text-xs text-muted-foreground">
              You are the <strong>{role}</strong>.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
