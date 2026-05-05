'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const [shareUrl, setShareUrl] = useState(`/r/${id}`);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/r/${id}`);
  }, [id]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Room</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Share this link with the other person:
          </p>
          <code className="rounded bg-muted px-3 py-2 text-sm break-all">
            {shareUrl}
          </code>
          <p className="text-sm text-muted-foreground">
            Waiting for peer to connect…
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
