'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/book-appointment');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
        <p className="mt-4 text-muted-foreground">Redirecting to book an appointment...</p>
      </div>
    </div>
  );
}
