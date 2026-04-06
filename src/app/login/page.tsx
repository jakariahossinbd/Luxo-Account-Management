'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('admin@luxo.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    
    if (result?.error) {
      alert('Login failed. Check credentials.');
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#1e293b',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '40px', 
        borderRadius: '12px',
        width: '350px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Luxo Accounts</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>Login to continue</p>
        
        <form onSubmit={handleLogin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '6px', boxSizing: 'border-box' }}
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '6px', boxSizing: 'border-box' }}
            placeholder="Password"
          />
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#666' }}>
          Demo: admin@luxo.com / password123
        </p>
      </div>
    </div>
  );
}