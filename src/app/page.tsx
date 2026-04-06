'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  if (!session) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return <div style={{ padding: '20px' }}>Redirecting to login...</div>;
  }

  const role = (session.user as any)?.role;
  
  if (role === 'ADMIN') {
    if (typeof window !== 'undefined') router.push('/admin');
    return <div style={{ padding: '20px' }}>Redirecting to admin...</div>;
  }
  if (role === 'SELLER') {
    if (typeof window !== 'undefined') router.push('/seller');
    return <div style={{ padding: '20px' }}>Redirecting to seller...</div>;
  }
  if (role === 'MARKETING') {
    if (typeof window !== 'undefined') router.push('/marketing');
    return <div style={{ padding: '20px' }}>Redirecting to marketing...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {(session.user as any)?.name || 'User'}</p>
    </div>
  );
}