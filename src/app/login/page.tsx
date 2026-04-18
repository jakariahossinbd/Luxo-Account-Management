'use client';

import { getSession, signIn, signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCommunicationStore } from '@/store/communication';
import { Fingerprint, Eye, EyeOff } from 'lucide-react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

export const dynamic = 'force-dynamic';

const LAST_FINGERPRINT_EMAIL_KEY = 'luxo:last-fingerprint-email';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const sendNotification = useCommunicationStore((state) => state.sendNotification);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [realName, setRealName] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [fingerprintPressed, setFingerprintPressed] = useState(false);
  const [fingerprintOpen, setFingerprintOpen] = useState(false);
  const [fingerprintEmail, setFingerprintEmail] = useState('');
  const [fingerprintPassword, setFingerprintPassword] = useState('');
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [fingerprintLoginLoading, setFingerprintLoginLoading] = useState(false);
  const [fingerprintStatus, setFingerprintStatus] = useState<null | { type: 'success' | 'error'; message: string }>(null);
  const [fingerprintLoginStatus, setFingerprintLoginStatus] = useState<null | { type: 'success' | 'error'; message: string }>(null);
  const [lastFingerprintEmail, setLastFingerprintEmail] = useState('');
  const [switchHandled, setSwitchHandled] = useState(false);
  const [clearingFingerprint, setClearingFingerprint] = useState(false);
  const [clearFingerprintStatus, setClearFingerprintStatus] = useState<null | { type: 'success' | 'error'; message: string }>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showFingerprintPassword, setShowFingerprintPassword] = useState(false);

  const switchMode = searchParams.get('switch') === '1';
  const nextPath = searchParams.get('next');
  const safeNextPath =
    nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
      ? nextPath
      : null;

  const showFingerprintStatus = (type: 'success' | 'error', message: string) => {
    if (typeof document !== 'undefined') {
      const activeElement = document.activeElement as HTMLElement | null;
      activeElement?.blur?.();
    }

    setFingerprintStatus({ type, message });
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedEmail = window.localStorage.getItem(LAST_FINGERPRINT_EMAIL_KEY)?.trim() || '';

    if (!savedEmail) {
      return;
    }

    setLastFingerprintEmail(savedEmail);

    // Don't prefill email field on main form - keep it blank
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    if (switchMode && !switchHandled) {
      setSwitchHandled(true);
      signOut({ redirect: false });
      return;
    }

    router.push(safeNextPath || '/');
  }, [status, router, switchMode, switchHandled, safeNextPath]);

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
      return;
    }

    router.push(safeNextPath || '/');
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

  const openFingerprintModal = (prefillEmail?: string) => {
    setFingerprintPressed(true);
    setTimeout(() => {
      setFingerprintPressed(false);
      setFingerprintEmail(prefillEmail?.trim() || '');
      setFingerprintPassword('');
      setFingerprintStatus(null);
      setFingerprintOpen(true);
    }, 180);
  };

  const handleFingerprintLogin = async () => {
    const savedEmail =
      (typeof window !== 'undefined' && window.localStorage.getItem(LAST_FINGERPRINT_EMAIL_KEY)?.trim()) || '';
    const loginEmail = email.trim() || lastFingerprintEmail.trim() || savedEmail;

    setFingerprintLoginLoading(true);
    setFingerprintLoginStatus(null);

    try {
      const startResponse = await fetch('/api/auth/fingerprint/login/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginEmail ? { email: loginEmail } : {}),
      });

      const startData = await startResponse.json().catch(() => null);

      if (!startResponse.ok) {
        if (startData?.code === 'NOT_ENROLLED') {
          openFingerprintModal(loginEmail || savedEmail);
          return;
        }

        setFingerprintLoginStatus({ type: 'error', message: loginEmail ? 'wrong email & password' : 'No saved passkey found' });
        return;
      }

      const assertionResponse = await startAuthentication({ optionsJSON: startData.options });

      const finishResponse = await fetch('/api/auth/fingerprint/login/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginEmail ? { email: loginEmail, response: assertionResponse } : { response: assertionResponse }),
      });

      const finishData = await finishResponse.json().catch(() => null);

      if (!finishResponse.ok || !finishData?.token) {
        if (finishData?.code === 'NOT_ENROLLED' || finishData?.message?.includes('not setup')) {
          setLastFingerprintEmail('');
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(LAST_FINGERPRINT_EMAIL_KEY);
          }
          openFingerprintModal();
          return;
        }
        setFingerprintLoginStatus({ type: 'error', message: 'Fingerprint login failed. Try again or add new fingerprint' });
        return;
      }

      const result = await signIn('fingerprint', {
        token: finishData.token,
        redirect: false,
        callbackUrl: safeNextPath || '/',
      });

      if (result?.error || !result?.ok) {
        setFingerprintLoginStatus({ type: 'error', message: 'Fingerprint login failed' });
        return;
      }

      const syncedSession = await getSession();

      if (!syncedSession) {
        setFingerprintLoginStatus({ type: 'error', message: 'Session sync failed. Try again' });
        return;
      }

      const normalizedSessionEmail = syncedSession.user?.email?.trim() || loginEmail;

      setLastFingerprintEmail(normalizedSessionEmail);
      setEmail((prev) => (prev.trim() ? prev : normalizedSessionEmail));
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_FINGERPRINT_EMAIL_KEY, normalizedSessionEmail);
      }

      setFingerprintLoginStatus({ type: 'success', message: 'Fingerprint login success' });

      if (result.url && typeof window !== 'undefined') {
        try {
          const redirectUrl = new URL(result.url, window.location.origin);
          const sameHostPath = `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
          window.location.assign(sameHostPath || '/');
          return;
        } catch {
          window.location.assign(safeNextPath || '/');
          return;
        }

      }

      if (typeof window !== 'undefined') {
        window.location.assign(safeNextPath || '/');
        return;
      }

      router.replace(safeNextPath || '/');
      router.refresh();
    } catch {
      setFingerprintLoginStatus({ type: 'error', message: 'Fingerprint login canceled' });
    } finally {
      setFingerprintLoginLoading(false);
    }
  };

  const handleClearFingerprint = async () => {
    const savedEmail =
      (typeof window !== 'undefined' && window.localStorage.getItem(LAST_FINGERPRINT_EMAIL_KEY)?.trim()) || '';
    const clearEmail = email.trim() || lastFingerprintEmail.trim() || savedEmail;

    if (!clearEmail) {
      setClearFingerprintStatus({ type: 'error', message: 'No saved fingerprint' });
      return;
    }

    setClearingFingerprint(true);
    setClearFingerprintStatus(null);

    try {
      const response = await fetch('/api/auth/fingerprint/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: clearEmail }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        setLastFingerprintEmail('');
        setEmail('');
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(LAST_FINGERPRINT_EMAIL_KEY);
        }
        setClearFingerprintStatus({ type: 'success', message: 'Fingerprint cleared. Add new fingerprint to sign in' });
      } else {
        setClearFingerprintStatus({ type: 'error', message: 'Failed to clear fingerprint' });
      }
    } catch {
      setClearFingerprintStatus({ type: 'error', message: 'Error clearing fingerprint' });
    } finally {
      setClearingFingerprint(false);
    }
  };

  const handleFingerprintRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setFingerprintLoading(true);
    setFingerprintStatus(null);

    try {
      const response = await fetch('/api/auth/fingerprint/enroll/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: fingerprintEmail,
          password: fingerprintPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.options) {
        showFingerprintStatus('error', 'wrong email & password');
        return;
      }

      const registrationResponse = await startRegistration({ optionsJSON: data.options });

      const finishResponse = await fetch('/api/auth/fingerprint/enroll/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: fingerprintEmail,
          response: registrationResponse,
        }),
      });

      const finishData = await finishResponse.json().catch(() => null);

      if (finishResponse.ok && finishData?.success) {
        const savedEmail = fingerprintEmail.trim();
        setLastFingerprintEmail(savedEmail);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LAST_FINGERPRINT_EMAIL_KEY, savedEmail);
        }
        showFingerprintStatus('success', 'success');
      } else {
        showFingerprintStatus('error', 'wrong email & password');
      }
    } catch {
      showFingerprintStatus('error', 'Fingerprint setup canceled');
    } finally {
      setFingerprintLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-2 sm:px-6 sm:py-3 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-[410px] flex-col items-center justify-center py-2 sm:max-w-[430px] sm:py-3 lg:min-h-full lg:py-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/luxo-logo.svg" alt="Luxo" className="h-auto w-[155px] object-contain sm:w-[188px]" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-img-1.png"
          alt="Team Workforce"
          className="mt-1.5 h-auto w-full max-w-[230px] object-contain sm:mt-2 sm:max-w-[270px]"
        />

        <div className="mt-1.5 text-center sm:mt-2">
          <div className="inline-flex flex-col items-center">
            <h1 className="text-[24px] font-black leading-none tracking-[0.01em] text-[#666a70] sm:text-[34px]">
              Team Workforce
            </h1>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 sm:mt-1.5 sm:h-1.5">
              <div className="h-full w-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400" />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col items-center sm:mt-4">
          <button
            type="button"
            onClick={handleFingerprintLogin}
            disabled={fingerprintLoginLoading}
            className={`group relative flex h-14 w-14 items-center justify-center rounded-xl border border-transparent bg-transparent text-slate-600 transition duration-200 active:scale-[0.96] sm:h-16 sm:w-16 disabled:cursor-not-allowed disabled:opacity-70 ${fingerprintPressed ? 'animate-[finger-shake_180ms_ease-in-out]' : ''}`}
            aria-label="Open fingerprint sign in"
          >
            <span className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 border-l-[2.5px] border-t-[2.5px] border-slate-500" />
            <span className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 border-r-[2.5px] border-t-[2.5px] border-slate-500" />
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 border-b-[2.5px] border-l-[2.5px] border-slate-500" />
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 border-b-[2.5px] border-r-[2.5px] border-slate-500" />
            <Fingerprint className="h-7 w-7 text-slate-700 sm:h-8 sm:w-8" strokeWidth={1.8} />
          </button>
          <p className="mt-1.5 text-[14px] font-medium text-[#4b5563] sm:text-[16px]">{fingerprintLoginLoading ? 'Fingerprint Sign in...' : 'Fingerprint Sign in'}</p>
          {fingerprintLoginStatus ? (
            <p className={`mt-1 text-sm font-medium ${fingerprintLoginStatus.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
              {fingerprintLoginStatus.message}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleClearFingerprint}
            disabled={clearingFingerprint}
            className="mt-2.5 text-center text-[12px] font-medium text-amber-500 transition hover:text-amber-600 disabled:opacity-70 disabled:cursor-not-allowed sm:text-[13px]"
          >
            {clearingFingerprint ? 'Clearing...' : 'Clear fingerprint sign in'}
          </button>
          {clearFingerprintStatus ? (
            <p className={`mt-1 text-xs font-medium ${clearFingerprintStatus.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
              {clearFingerprintStatus.message}
            </p>
          ) : null}
        </div>

        <form onSubmit={handleLogin} autoComplete="off" className="mt-2 w-full max-w-[400px] space-y-1.5 sm:mt-4.5 sm:space-y-3.5">
          <label className="relative block overflow-hidden rounded-full border border-slate-400/80 bg-[#f7f7f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-6px_10px_rgba(203,213,225,0.28)]">
            <span className="pointer-events-none absolute inset-x-0 -top-px z-20 h-[40%] rounded-full bg-gradient-to-b from-white/65 via-white/25 to-transparent" />
            <span className="pointer-events-none absolute left-0 top-[-1px] bottom-[-1px] z-20 flex w-[30%] items-center justify-center rounded-l-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-[13px] font-medium text-[#222] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-5px_9px_rgba(234,88,12,0.28)] sm:text-[15px]">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              name="luxo-login-email"
              autoComplete="off"
              className="relative z-30 h-10 w-full bg-transparent pl-[34%] pr-5 text-[12px] tracking-[0.03em] text-slate-700 outline-none placeholder:text-slate-400 focus:text-slate-800 sm:h-14 sm:text-[14px]"
              placeholder="Enter your Email"
            />
          </label>

          <label className="relative block overflow-hidden rounded-full border border-slate-400/80 bg-[#f7f7f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-6px_10px_rgba(203,213,225,0.28)]">
            <span className="pointer-events-none absolute inset-x-0 -top-px z-20 h-[40%] rounded-full bg-gradient-to-b from-white/65 via-white/25 to-transparent" />
            <span className="pointer-events-none absolute left-0 top-[-1px] bottom-[-1px] z-20 flex w-[30%] items-center justify-center rounded-l-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-[13px] font-medium text-[#222] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-5px_9px_rgba(234,88,12,0.28)] sm:text-[15px]">
              Password
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              name="luxo-login-password"
              autoComplete="new-password"
              className="relative z-30 h-10 w-full bg-transparent pl-[34%] pr-12 text-[12px] tracking-[0.03em] text-slate-700 outline-none placeholder:text-slate-400 focus:text-slate-800 sm:h-14 sm:pr-5 sm:text-[14px]"
              placeholder="Enter your Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 z-30 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 sm:right-5"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </label>

          <button
            type="button"
            onClick={() => {
              setForgotOpen(true);
              setForgotSubmitted(false);
            }}
            className="block w-full pt-0.5 text-center text-[10px] font-medium tracking-[0.02em] text-slate-400 transition hover:text-slate-600 sm:text-[12px]"
          >
            Forget Password
          </button>

          <button
            type="submit"
            disabled={loading}
            className="relative mx-auto mt-0.5 flex h-9 w-[56%] min-w-[180px] items-center justify-center overflow-hidden rounded-full border border-orange-300/80 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-[14px] font-medium text-[#202020] shadow-[inset_0_1px_0_rgba(255,255,255,0.62),inset_0_-10px_14px_rgba(217,119,6,0.35),0_9px_16px_rgba(234,88,12,0.35)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80 sm:h-12 sm:min-w-[220px] sm:text-[19px]"
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

        {fingerprintOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
            <div className="relative w-full max-w-[700px] rounded-[34px] border border-slate-300 bg-white px-5 py-7 shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:px-8">
              {!fingerprintStatus ? (
              <form onSubmit={handleFingerprintRequest} autoComplete="off" className="space-y-5">
                <h2 className="text-center text-[29px] font-medium leading-none text-slate-500 sm:text-[34px]">Add fingerprint Sign in</h2>

                <label className="relative block overflow-hidden rounded-full border border-slate-300 bg-[#f7f7f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-6px_10px_rgba(203,213,225,0.28)]">
                  <span className="pointer-events-none absolute inset-x-0 -top-px z-20 h-[40%] rounded-full bg-gradient-to-b from-white/65 via-white/25 to-transparent" />
                  <span className="pointer-events-none absolute left-0 top-[-1px] bottom-[-1px] z-20 flex w-[30%] items-center justify-center rounded-l-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-[15px] font-medium text-[#222] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-5px_9px_rgba(234,88,12,0.28)] sm:text-[17px]">
                    Email
                  </span>
                  <input
                    type="email"
                    value={fingerprintEmail}
                    onChange={(event) => setFingerprintEmail(event.target.value)}
                    autoComplete="off"
                    className="relative z-30 h-12 w-full bg-transparent pl-[34%] pr-5 text-[13px] tracking-[0.03em] text-slate-700 outline-none placeholder:text-slate-400 focus:text-slate-800 sm:h-14 sm:text-[14px]"
                    placeholder="Enter your Email"
                  />
                </label>

                <label className="relative block overflow-hidden rounded-full border border-slate-300 bg-[#f7f7f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-6px_10px_rgba(203,213,225,0.28)]">
                  <span className="pointer-events-none absolute inset-x-0 -top-px z-20 h-[40%] rounded-full bg-gradient-to-b from-white/65 via-white/25 to-transparent" />
                  <span className="pointer-events-none absolute left-0 top-[-1px] bottom-[-1px] z-20 flex w-[30%] items-center justify-center rounded-l-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-[15px] font-medium text-[#222] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-5px_9px_rgba(234,88,12,0.28)] sm:text-[17px]">
                    Password
                  </span>
                  <input
                    type={showFingerprintPassword ? 'text' : 'password'}
                    value={fingerprintPassword}
                    onChange={(event) => setFingerprintPassword(event.target.value)}
                    autoComplete="new-password"
                    className="relative z-30 h-12 w-full bg-transparent pl-[34%] pr-12 text-[13px] tracking-[0.03em] text-slate-700 outline-none placeholder:text-slate-400 focus:text-slate-800 sm:h-14 sm:pr-5 sm:text-[14px]"
                    placeholder="Enter your Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFingerprintPassword(!showFingerprintPassword)}
                    className="absolute right-3 top-1/2 z-30 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 sm:right-5"
                    aria-label="Toggle password visibility"
                  >
                    {showFingerprintPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </label>

                <button
                  type="submit"
                  disabled={fingerprintLoading}
                  className="relative mx-auto mt-1 flex h-12 w-[56%] min-w-[210px] items-center justify-center overflow-hidden rounded-full border border-orange-300/80 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-[18px] font-medium text-[#202020] shadow-[inset_0_1px_0_rgba(255,255,255,0.62),inset_0_-10px_14px_rgba(217,119,6,0.35),0_9px_16px_rgba(234,88,12,0.35)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80 sm:h-14 sm:min-w-[230px] sm:text-[20px]"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[38%] rounded-full bg-gradient-to-b from-white/70 via-white/25 to-transparent" />
                  <span className="relative z-20">{fingerprintLoading ? 'Sending...' : 'Sent Requst'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFingerprintOpen(false);
                    setFingerprintStatus(null);
                  }}
                  className="mx-auto block text-sm font-medium text-slate-400 underline-offset-4 transition hover:text-slate-600 hover:underline"
                >
                  Back to login
                </button>
              </form>
              ) : null}

              {fingerprintStatus ? (
                <div className="absolute inset-0 z-30 grid place-items-center rounded-[34px] bg-slate-900/55 p-6 backdrop-blur-[1px]">
                  <div className="w-full max-w-[450px] rounded-2xl bg-white px-6 py-7 text-center shadow-xl">
                    <p className={`text-[26px] font-semibold sm:text-[30px] ${fingerprintStatus.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {fingerprintStatus.message}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const wasSuccess = fingerprintStatus.type === 'success';
                        setFingerprintStatus(null);

                        if (wasSuccess) {
                          setFingerprintOpen(false);
                          setFingerprintPassword('');
                          setFingerprintLoginStatus({ type: 'success', message: 'Fingerprint added. Tap icon to login' });
                        }
                      }}
                      className="mt-5 rounded-full bg-slate-100 px-8 py-3 text-[20px] font-medium text-slate-700 transition hover:bg-slate-200"
                    >
                      OK
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <style jsx global>{`
        @keyframes finger-shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          50% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </main>
  );
}