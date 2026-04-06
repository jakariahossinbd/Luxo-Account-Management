'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status === 'loading') return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Sales</h1>
      <p>Sales page - Coming soon</p>
      <button onClick={() => router.push('/login')} style={{ padding: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px' }}>Logout</button>
    </div>
  );
}