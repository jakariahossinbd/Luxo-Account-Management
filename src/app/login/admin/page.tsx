'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('role', 'ADMIN');

    const next = searchParams.get('next');
    if (next) {
      params.set('next', next);
    }

    if (searchParams.get('switch') === '1') {
      params.set('switch', '1');
    }

    router.replace(`/login?${params.toString()}`);
  }, [router, searchParams]);

  return <div style={{ padding: '20px' }}>Redirecting to admin login...</div>;
}
