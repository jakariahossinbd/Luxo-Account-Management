'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/login');
      return;
    }

    if (role === 'ADMIN') {
      router.replace('/admin');
      return;
    }

    if (role === 'SELLER') {
      router.replace('/seller');
      return;
    }

    if (role === 'MARKETING') {
      router.replace('/marketing');
    }
  }, [router, role, session, status]);

  if (status === 'loading') {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  if (!session) {
    return <div style={{ padding: '20px' }}>Redirecting to login...</div>;
  }
  
  if (role === 'ADMIN') {
    return <div style={{ padding: '20px' }}>Redirecting to admin...</div>;
  }
  if (role === 'SELLER') {
    return <div style={{ padding: '20px' }}>Redirecting to seller...</div>;
  }
  if (role === 'MARKETING') {
    return <div style={{ padding: '20px' }}>Redirecting to marketing...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {(session.user as any)?.name || 'User'}</p>
    </div>
  );
}