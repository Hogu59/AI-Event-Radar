'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertOctagon } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="container flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center gap-5 py-12 text-center">
      <AlertOctagon className="h-12 w-12 text-destructive" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">문제가 발생했어요</h1>
        <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      </div>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
