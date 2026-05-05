'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const router = useRouter();

  function handleCreateRoom() {
    router.push(`/r/${crypto.randomUUID()}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">DirectPipe</h1>
      <p className="text-muted-foreground">Secure peer-to-peer file transfer</p>
      <Button size="lg" onClick={handleCreateRoom}>
        Create room
      </Button>
    </main>
  );
}
