'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createCanvas } from '@/lib/client/api';

export default function NewCanvasPage() {
  const router = useRouter();

  useEffect(() => {
    async function create() {
      try {
        const { data: canvas } = await createCanvas({ title: 'Untitled' });
        router.replace(`/canvas/${canvas.id}`);
      } catch (error) {
        console.error('Failed to create canvas:', error);
        router.replace('/canvas');
      }
    }

    create();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-muted-foreground">Creating new canvas...</div>
    </div>
  );
}
