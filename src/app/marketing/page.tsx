'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function MarketingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  if (!session) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return <div style={{ padding: '20px' }}>Redirecting...</div>;
  }

  const role = (session.user as any)?.role;
  if (role !== 'MARKETING') {
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return <div style={{ padding: '20px' }}>Redirecting...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Marketing Dashboard</h1>
      <p>Welcome, {(session.user as any)?.name || 'Marketing'}</p>
      <button onClick={() => router.push('/staff')}>Staff</button>
    </div>
  );
}