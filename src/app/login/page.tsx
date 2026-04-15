'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCommunicationStore } from '@/store/communication';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const sendNotification = useCommunicationStore((state) => state.sendNotification);
  const [email, setEmail] = useState('admin@luxo.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [realName, setRealName] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

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

  const handleForgotRequest = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = realName.trim();

    if (!trimmedName) {
      alert('Please enter your real name.');
      return;
    }

    sendNotification({
      title: 'Forgot Password Request',
      message: `${trimmedName} requested access to recover password. Email: ${email.trim() || 'Not provided'}`,
      audience: 'admin',
    });

    setForgotSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[440px] flex-col items-center justify-center">
        <img src="/luxo-logo.svg" alt="Luxo" className="h-auto w-[170px] object-contain sm:w-[220px]" />

        <img
          src="/login-img-1.png"
          alt="Team Workforce"
          className="mt-2 h-auto w-full max-w-[270px] object-contain sm:mt-3 sm:max-w-[320px]"
        />

        <div className="mt-2 text-center sm:mt-3">
          <div className="inline-flex flex-col items-center">
            <h1 className="text-[24px] font-black leading-none tracking-[0.01em] text-[#666a70] sm:text-[42px]">
              Team Workforce
            </h1>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200 sm:mt-2 sm:h-1.5">
              <div className="h-full w-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400" />
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="mt-5 w-full max-w-[400px] space-y-3.5 sm:mt-8 sm:space-y-5">
          <label className="relative block overflow-hidden rounded-full border border-slate-400/80 bg-[#f7f7f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-6px_10px_rgba(203,213,225,0.28)]">
            <span className="pointer-events-none absolute inset-x-0 -top-px z-20 h-[40%] rounded-full bg-gradient-to-b from-white/65 via-white/25 to-transparent" />
            <span className="pointer-events-none absolute left-0 top-[-1px] bottom-[-1px] z-20 flex w-[30%] items-center justify-center rounded-l-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-[15px] font-medium text-[#222] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-5px_9px_rgba(234,88,12,0.28)] sm:text-[17px]">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative z-30 h-12 w-full bg-transparent pl-[34%] pr-5 text-[13px] tracking-[0.03em] text-slate-700 outline-none placeholder:text-slate-400 focus:text-slate-800 sm:h-14 sm:text-[14px]"
              placeholder="Enter your Email"
            />
          </label>

          <label className="relative block overflow-hidden rounded-full border border-slate-400/80 bg-[#f7f7f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-6px_10px_rgba(203,213,225,0.28)]">
            <span className="pointer-events-none absolute inset-x-0 -top-px z-20 h-[40%] rounded-full bg-gradient-to-b from-white/65 via-white/25 to-transparent" />
            <span className="pointer-events-none absolute left-0 top-[-1px] bottom-[-1px] z-20 flex w-[30%] items-center justify-center rounded-l-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-[15px] font-medium text-[#222] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-5px_9px_rgba(234,88,12,0.28)] sm:text-[17px]">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="relative z-30 h-12 w-full bg-transparent pl-[34%] pr-5 text-[13px] tracking-[0.03em] text-slate-700 outline-none placeholder:text-slate-400 focus:text-slate-800 sm:h-14 sm:text-[14px]"
              placeholder="Enter your Password"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setForgotOpen(true);
              setForgotSubmitted(false);
            }}
            className="block w-full pt-0.5 text-center text-[12px] font-medium tracking-[0.02em] text-slate-400 transition hover:text-slate-600 sm:text-[13px]"
          >
            Forget Password
          </button>

          <button
            type="submit"
            disabled={loading}
            className="relative mx-auto mt-1 flex h-12 w-[56%] min-w-[210px] items-center justify-center overflow-hidden rounded-full border border-orange-300/80 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-[18px] font-medium text-[#202020] shadow-[inset_0_1px_0_rgba(255,255,255,0.62),inset_0_-10px_14px_rgba(217,119,6,0.35),0_9px_16px_rgba(234,88,12,0.35)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80 sm:h-14 sm:min-w-[230px] sm:text-[20px]"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[38%] rounded-full bg-gradient-to-b from-white/70 via-white/25 to-transparent" />
            <span className="relative z-20">{loading ? 'Signing in...' : 'Sign in'}</span>
          </button>
        </form>

        {forgotOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
            <div className="w-full max-w-[420px] rounded-[28px] border border-slate-300 bg-white px-4 py-6 shadow-[0_20px_50px_rgba(15,23,42,0.18)] sm:px-6">
              <form onSubmit={handleForgotRequest} className="space-y-5">
                <p className="text-center text-[16px] font-medium text-slate-400 sm:text-[18px]">
                  Enter your real name &amp; send requst to admin
                </p>

                <label className="relative block overflow-hidden rounded-full border border-slate-400/80 bg-[#f7f7f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-6px_10px_rgba(203,213,225,0.28)]">
                  <span className="pointer-events-none absolute inset-x-0 -top-px z-20 h-[40%] rounded-full bg-gradient-to-b from-white/65 via-white/25 to-transparent" />
                  <span className="pointer-events-none absolute left-0 top-[-1px] bottom-[-1px] z-20 flex w-[34%] items-center justify-center rounded-l-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-[14px] font-medium text-[#222] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-5px_9px_rgba(234,88,12,0.28)] sm:text-[16px]">
                    Real Name
                  </span>
                  <input
                    type="text"
                    value={realName}
                    onChange={(event) => setRealName(event.target.value)}
                    className="relative z-30 h-12 w-full bg-transparent pl-[38%] pr-5 text-[13px] tracking-[0.03em] text-slate-700 outline-none placeholder:text-slate-400 focus:text-slate-800 sm:h-14 sm:text-[14px]"
                    placeholder="Enter your real name"
                  />
                </label>

                <button
                  type="submit"
                  disabled={forgotSubmitted}
                  className="relative mx-auto flex h-12 w-[56%] min-w-[210px] items-center justify-center overflow-hidden rounded-full border border-orange-300/80 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-[18px] font-medium text-[#202020] shadow-[inset_0_1px_0_rgba(255,255,255,0.62),inset_0_-10px_14px_rgba(217,119,6,0.35),0_9px_16px_rgba(234,88,12,0.35)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80 sm:h-14 sm:min-w-[230px] sm:text-[20px]"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[38%] rounded-full bg-gradient-to-b from-white/70 via-white/25 to-transparent" />
                  <span className="relative z-20">{forgotSubmitted ? 'Sent Requst' : 'Sent Requst'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(false);
                    setRealName('');
                    setForgotSubmitted(false);
                  }}
                  className="mx-auto block text-sm font-medium text-slate-400 underline-offset-4 transition hover:text-slate-600 hover:underline"
                >
                  Back to login
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}