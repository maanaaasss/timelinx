'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return <p>Redirecting to <a href={to}>{to}</a>...</p>;
}
