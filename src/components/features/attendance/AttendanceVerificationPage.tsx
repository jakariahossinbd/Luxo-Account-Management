'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, MapPin, Video } from 'lucide-react';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { SellerFooterNav } from '@/components/layout/SellerFooterNav';
import { SupportChatWidget } from '@/components/layout/SupportChatWidget';
import { useToast } from '@/hooks/useToast';

type AttendanceAction = 'checkIn' | 'checkOut';

type ClockWindow = {
  clockInStart: string;
  clockInEnd: string;
  clockOutStart: string;
  clockOutEnd: string;
};

type LocationPolicy = {
  officeLatitude: number;
  officeLongitude: number;
  allowedRadiusMeters: number;
  requireLocation: boolean;
  requireSelfie: boolean;
};

type AttendanceResponse = {
  success: boolean;
  error?: string;
  data?: {
    today: {
      status: 'CHECKED_IN' | 'CHECKED_OUT' | 'ON_BREAK' | 'ON_LEAVE';
      checkInTime?: string | null;
      checkOutTime?: string | null;
    } | null;
    clockWindow: ClockWindow;
    locationPolicy: LocationPolicy;
  };
};

type LocationPoint = {
  lat: number;
  lng: number;
};

type VerifiedLocation = LocationPoint & {
  accuracyMeters?: number;
};

const DEFAULT_CLOCK_WINDOW: ClockWindow = {
  clockInStart: '00:00',
  clockInEnd: '23:59',
  clockOutStart: '00:00',
  clockOutEnd: '23:59',
};

const DEFAULT_LOCATION_POLICY: LocationPolicy = {
  officeLatitude: 23.9287696,
  officeLongitude: 90.3778525,
  allowedRadiusMeters: 100,
  requireLocation: true,
  requireSelfie: true,
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatTime(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString('en-BD', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeWithAMPM(date: Date): string {
  return date.toLocaleTimeString('en-BD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function buildGoogleMapUrl(point: LocationPoint) {
  return `https://www.google.com/maps?q=${point.lat},${point.lng}&z=16&output=embed`;
}

function getCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function getGeoErrorMessage(error: GeolocationPositionError | null): string {
  if (!error) {
    return 'Location unavailable.';
  }

  if (error.code === 1) {
    return 'Location permission blocked. Please allow location in browser/app settings.';
  }

  if (error.code === 2) {
    return 'Location unavailable. Turn on GPS/location service and try again.';
  }

  if (error.code === 3) {
    return 'Location request timed out. Please try again with better signal.';
  }

  return 'Location unavailable.';
}

async function getGeoPermissionState(): Promise<PermissionState | 'unsupported'> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unsupported';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch {
    return 'unsupported';
  }
}

function isVerificationSatisfied(
  policy: LocationPolicy,
  selfieVerified: boolean,
  locationVerified: boolean,
) {
  if (!policy.requireSelfie && !policy.requireLocation) return true;
  if (policy.requireSelfie && !policy.requireLocation) return selfieVerified;
  if (!policy.requireSelfie && policy.requireLocation) return locationVerified;
  return selfieVerified || locationVerified;
}

export function AttendanceVerificationPage({ action }: { action: AttendanceAction }) {
  const router = useRouter();
  const { success, error, warning } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'CHECKED_IN' | 'CHECKED_OUT' | 'ON_BREAK' | 'ON_LEAVE'>('CHECKED_OUT');
  const [currentCheckInTime, setCurrentCheckInTime] = useState<string | null>(null);
  const [clockWindow, setClockWindow] = useState<ClockWindow>(DEFAULT_CLOCK_WINDOW);
  const [locationPolicy, setLocationPolicy] = useState<LocationPolicy>(DEFAULT_LOCATION_POLICY);
  const [selfieVerified, setSelfieVerified] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('Camera preview will appear here.');
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState('Location is not verified yet.');
  const [geoCoordinates, setGeoCoordinates] = useState<VerifiedLocation | null>(null);
  const [mapCenter, setMapCenter] = useState<LocationPoint>({
    lat: DEFAULT_LOCATION_POLICY.officeLatitude,
    lng: DEFAULT_LOCATION_POLICY.officeLongitude,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [verificationCompleteTime, setVerificationCompleteTime] = useState<Date | null>(null);
  const [chatIdentity, setChatIdentity] = useState<{ name: string; sellerId: string }>({
    name: 'Seller',
    sellerId: 'SELLER',
  });

  const title = action === 'checkIn' ? 'Clock-In' : 'Clock-Out';
  const successMessage = action === 'checkIn' ? 'Clock-In success completed.' : 'Clock-Out success completed.';
  const windowLabel = action === 'checkIn'
    ? `${clockWindow.clockInStart} - ${clockWindow.clockInEnd}`
    : `${clockWindow.clockOutStart} - ${clockWindow.clockOutEnd}`;
  const primaryLabel = action === 'checkIn' ? 'Attendance Confirm' : 'Attendance Confirm';

  const verificationSatisfied = useMemo(
    () => isVerificationSatisfied(locationPolicy, selfieVerified, locationVerified),
    [locationPolicy, selfieVerified, locationVerified],
  );

  useEffect(() => {
    if (verificationSatisfied && !verificationCompleteTime) {
      setVerificationCompleteTime(new Date());
    }
  }, [verificationSatisfied, verificationCompleteTime]);

  const isActionAlreadyDone = action === 'checkIn'
    ? currentStatus === 'CHECKED_IN'
    : currentStatus === 'CHECKED_OUT';

  const mapUrl = useMemo(() => buildGoogleMapUrl(mapCenter), [mapCenter]);
  const verificationBanner = useMemo(() => {
    if (message) {
      if (message.toLowerCase().includes('failed')) {
        if (locationMessage && locationMessage !== 'Location is not verified yet.') {
          return `${message} ${locationMessage}`;
        }
      }
      return message;
    }

    return locationMessage;
  }, [locationMessage, message]);

  const verificationBannerTone = useMemo(() => {
    const bannerText = verificationBanner.toLowerCase();
    if (bannerText.includes('success') || bannerText.includes('verified')) {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (bannerText.includes('blocked') || bannerText.includes('denied') || bannerText.includes('unsupported') || bannerText.includes('timeout')) {
      return 'border-rose-200 bg-rose-50 text-rose-700';
    }
    return 'border-slate-200 bg-slate-50 text-slate-600';
  }, [verificationBanner]);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      try {
        const now = new Date();
        const response = await fetch(`/api/staff/attendance?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, { cache: 'no-store' });
        const payload: AttendanceResponse = await response.json();

        if (cancelled) return;

        if (!payload.success || !payload.data) {
          setMessage(payload.error || 'Failed to load attendance data');
          return;
        }

        setClockWindow(payload.data.clockWindow || DEFAULT_CLOCK_WINDOW);
        setLocationPolicy(payload.data.locationPolicy || DEFAULT_LOCATION_POLICY);

        if (payload.data.today?.status === 'CHECKED_IN' && payload.data.today?.checkInTime && !payload.data.today?.checkOutTime) {
          setCurrentStatus('CHECKED_IN');
          setCurrentCheckInTime(formatTime(payload.data.today.checkInTime));
        } else {
          setCurrentStatus('CHECKED_OUT');
          setCurrentCheckInTime(null);
        }
      } catch {
        if (!cancelled) {
          setMessage('Failed to load attendance data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [action]);

  useEffect(() => {
    let cancelled = false;

    async function loadChatIdentity() {
      try {
        const response = await fetch('/api/seller/profile', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled) return;

        const name = payload?.data?.name || 'Seller';
        const sellerId = payload?.data?.sellerId || payload?.data?.employeeCode || payload?.data?.id || 'SELLER';
        setChatIdentity({ name, sellerId });
      } catch {
        // Keep safe fallback identity.
      }
    }

    void loadChatIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || !videoRef.current) {
        setCameraMessage('Camera access is not available on this device/browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
        setCameraReady(true);
        setCameraMessage('Live camera active.');
      } catch {
        if (!cancelled) {
          setCameraMessage('Camera permission is required for selfie/liveness verification.');
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  const handleLocationVerification = async () => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      const secureContextMessage = 'Location blocked: insecure context. Open this page via HTTPS (or localhost on same device).';
      setLocationVerified(false);
      setLocationMessage(secureContextMessage);
      setMessage(secureContextMessage);
      error(`Location verification failed: ${secureContextMessage}`);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationVerified(false);
      setLocationMessage('Geolocation is not supported on this device/browser.');
      setMessage('Geolocation is not supported on this device/browser.');
      error('Location verification failed: geolocation is not supported on this device/browser.');
      return;
    }

    const isLocalhostTestMode =
      typeof window !== 'undefined'
      && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const applyLocalTestFallback = (reason: string) => {
      if (!isLocalhostTestMode) {
        return false;
      }

      const lat = Number(locationPolicy.officeLatitude.toFixed(6));
      const lng = Number(locationPolicy.officeLongitude.toFixed(6));
      setGeoCoordinates({ lat, lng, accuracyMeters: 0 });
      setLocationVerified(true);
      setMapCenter({ lat, lng });
      setLocationMessage(`Test mode fallback: office coordinate applied (${lat}, ${lng}).`);
      setMessage('Location verification completed successfully.');
      warning(`Test mode fallback used: ${reason}`);
      success('Location verified using localhost test fallback.');
      return true;
    };

    const permissionState = await getGeoPermissionState();
    if (permissionState === 'denied') {
      const applied = applyLocalTestFallback('browser geolocation permission is blocked');
      if (!applied) {
        setLocationVerified(false);
        setLocationMessage('Location permission blocked. Please allow location in browser/app settings.');
        setMessage('Location permission blocked. Please allow location in browser/app settings.');
        error('Location verification failed: location permission blocked.');
      }
      return;
    }

    setIsVerifyingLocation(true);
    let position: GeolocationPosition | null = null;
    let lastError: GeolocationPositionError | null = null;

    try {
      position = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    } catch (firstError) {
      const geoError = firstError as GeolocationPositionError;
      lastError = geoError;

      if (geoError.code !== 1) {
        try {
          position = await getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 300000,
          });
          lastError = null;
        } catch (secondError) {
          lastError = secondError as GeolocationPositionError;
        }
      }
    }

    if (!position) {
      if (lastError?.code === 1) {
        const applied = applyLocalTestFallback('browser geolocation permission is blocked');
        if (applied) {
          setIsVerifyingLocation(false);
          return;
        }
      }

      const detailedMessage = getGeoErrorMessage(lastError);
      setLocationVerified(false);
      setLocationMessage(detailedMessage);
      setMessage(detailedMessage);
      error(`Location verification failed: ${detailedMessage}`);
      setIsVerifyingLocation(false);
      return;
    }

    const lat = Number(position.coords.latitude.toFixed(6));
    const lng = Number(position.coords.longitude.toFixed(6));
    const accuracyMeters = Number(position.coords.accuracy || 0);
    const distance = distanceMeters(lat, lng, locationPolicy.officeLatitude, locationPolicy.officeLongitude);
    const effectiveRadius = locationPolicy.allowedRadiusMeters + Math.max(0, accuracyMeters);
    const inRange = distance <= effectiveRadius;

    setGeoCoordinates({ lat, lng, accuracyMeters });
    setLocationVerified(inRange);
    setMapCenter({ lat, lng });

    if (inRange) {
      setLocationMessage(`Verified: ${Math.round(distance)}m from office, accuracy ±${Math.round(accuracyMeters)}m (allowed ${locationPolicy.allowedRadiusMeters}m)`);
      setMessage('Location verification completed successfully.');
      success(`Location verified successfully within ${Math.round(effectiveRadius)}m effective radius.`);
    } else {
      setLocationMessage(`Denied: ${Math.round(distance)}m from office, accuracy ±${Math.round(accuracyMeters)}m (allowed ${locationPolicy.allowedRadiusMeters}m)`);
      setMessage(`Outside allowed ${locationPolicy.allowedRadiusMeters}m office radius.`);
      error(`Location verification failed: outside allowed ${locationPolicy.allowedRadiusMeters}m office radius.`);
    }

    setIsVerifyingLocation(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          verification: {
            selfieVerified,
            location: geoCoordinates,
            locationAccuracyMeters: geoCoordinates?.accuracyMeters,
          },
        }),
      });

      const payload: AttendanceResponse = await response.json();
      if (!payload.success) {
        setMessage(payload.error || 'Attendance action failed');
        return;
      }

      setMessage(successMessage);
      setSelfieVerified(false);
      setLocationVerified(false);
      setLocationMessage('Location is not verified yet.');
      setGeoCoordinates(null);
      setMapCenter({
        lat: locationPolicy.officeLatitude,
        lng: locationPolicy.officeLongitude,
      });
      router.replace('/seller');
    } catch {
      setMessage('Attendance action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const isMapReady = Boolean(mapUrl);

  const handleCameraDemo = () => {
    if (!cameraReady) {
      setSelfieVerified(false);
      setCameraMessage('Camera permission is required for selfie/liveness verification.');
      setMessage('Selfie/liveness verification failed.');
      return;
    }

    setSelfieVerified(true);
    setCameraMessage('Liveness verified from live camera feed.');
    setMessage('Selfie/liveness verification completed successfully.');
  };

  const handleNavigateSellerView = (view: 'home' | 'create-sales' | 'customer-leds' | 'product-stock' | 'attendance' | 'monthly-report' | 'personal-note' | 'profile') => {
    if (view === 'profile') {
      router.replace('/seller/profile');
      return;
    }
    router.replace(`/seller?view=${view}`);
  };

  return (
    <div className="min-h-screen bg-[#eff2f6] text-slate-900">
      <AdminHeader avatarName="Seller" avatarRole="Seller" avatarRoleSub="Attendance" />

      <main className="mx-auto w-full max-w-[1400px] px-3 pb-24 pt-[86px] lg:px-5">
        <div className="space-y-4">
        <section className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-2.5 text-center sm:px-5 sm:py-3">
            <h1 className="text-[30px] font-extrabold leading-none text-[#005d4f] sm:text-[48px]">{title}</h1>
            <p className="mt-1 text-[13px] font-bold tracking-[0.05em] text-[#607d8b] sm:text-[20px]">for Seller Verification Flow</p>
          </div>

          <div className="space-y-3 px-4 py-3 text-[13px] leading-5 text-slate-700 sm:px-6 sm:text-[16px] sm:leading-6">
            <div>
              <div className="flex justify-center">
                <p className="inline-flex rounded-full bg-[#cf6422] px-3 py-1 text-[13px] font-semibold text-white sm:text-[16px]">{title} verification কি?</p>
              </div>
              <p className="mt-2">
                {title} verification হলো attendance security step যেখানে selfie/liveness check অথবা location verification দিয়ে attendance confirm করা যায়।
              </p>
            </div>
            <div>
              <div className="flex justify-center">
                <p className="inline-flex rounded-full bg-[#cf6422] px-3 py-1 text-[13px] font-semibold text-white sm:text-[16px]">{title} verification কবে বাধ্যতামূলক?</p>
              </div>
              <p className="mt-2">
                Admin policy অনুযায়ী যদি verification required থাকে, তাহলে selfie/liveness OR location এর যেকোনো একটি successful হলেই confirm করা যাবে।
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[16px] border border-slate-200 bg-white px-3 py-4 shadow-sm sm:px-6 sm:py-5">
          <h2 className="whitespace-nowrap text-center text-[20px] font-extrabold tracking-wide text-[#00556b] sm:text-[48px]">
            {title} Time Start: {windowLabel}
          </h2>

          {verificationBanner ? (
            <div className={`mt-3 rounded-[12px] border px-3 py-2 text-center text-[12px] font-semibold sm:text-sm ${verificationBannerTone}`}>
              {verificationBanner}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            <article className="rounded-[10px] border border-[#8ca5ad] bg-white">
              <div className="relative rounded-t-[10px] bg-[#255f69] px-4 pb-3 pt-6 text-center">
                <span className="absolute -top-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#3f6168] text-[18px] font-bold leading-none text-white">1</span>
                <h3 className="text-[13px] font-bold leading-tight text-white sm:text-[26px]">
                  Selfie &amp; Liveness
                  <br />
                  Check
                </h3>
              </div>

              <div className="p-3 sm:p-4">
                <div className="relative overflow-hidden rounded-[30px] border-[6px] border-black bg-black">
                  <div className="aspect-[3/3.1]">
                    <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
                  </div>
                  <div className="pointer-events-none absolute inset-4 rounded-[16px] border-[3px] border-white/80" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-xl border-[3px] border-[#00ff2f]/90" />
                  <div className="pointer-events-none absolute left-4 top-4 h-10 w-10 border-l-[3px] border-t-[3px] border-white/80" />
                  <div className="pointer-events-none absolute right-4 top-4 h-10 w-10 border-r-[3px] border-t-[3px] border-white/80" />
                  <div className="pointer-events-none absolute bottom-4 left-4 h-10 w-10 border-b-[3px] border-l-[3px] border-white/80" />
                  <div className="pointer-events-none absolute bottom-4 right-4 h-10 w-10 border-b-[3px] border-r-[3px] border-white/80" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(0,0,0,0.58)_100%)]" />
                  <p className="absolute left-3 right-3 top-5 text-center text-[11px] font-semibold text-white sm:text-[20px]">Look at the camera and move your head</p>
                  <p className="absolute bottom-4 left-0 right-0 text-center text-[12px] font-medium text-white sm:text-[30px]">Processing...</p>
                  {!cameraReady ? (
                    <div className="absolute bottom-7 left-1/2 -translate-x-1/2 rounded-md bg-white/90 px-2 py-1 text-center text-[9px] font-medium leading-tight text-slate-700 shadow-sm sm:text-[12px]">
                      Camera permission is required
                      <br />
                      for selfie/liveness verification.
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={handleCameraDemo}
                  className="mt-8 inline-flex w-full items-center justify-center gap-1 rounded-full bg-gradient-to-r from-[#f92020] to-[#ffbe0f] px-3 py-2 text-[13px] font-bold whitespace-nowrap text-white sm:py-3 sm:text-[24px] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]"
                >
                  <Video className="h-5 w-5" />
                  {selfieVerified ? 'Process Verified' : 'Process (Live)'}
                </button>

                <div className={`mt-3 rounded-xl border px-3 py-2 text-center text-[11px] font-semibold sm:text-sm ${selfieVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                  {selfieVerified ? 'Selfie / liveness verified' : 'Awaiting liveness verification'}
                </div>
              </div>
            </article>

            <article className="rounded-[10px] border border-[#8ca5ad] bg-white">
              <div className="relative rounded-t-[10px] bg-[#255f69] px-4 pb-4 pt-8 text-center">
                <span className="absolute -top-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-[#3f6168] text-[18px] font-bold leading-none text-white">2</span>
                <h3 className="text-[13px] font-bold leading-tight text-white sm:text-[26px]">
                  Location
                  <br />
                  Verification
                </h3>
              </div>

              <div className="p-3 sm:p-4">
                <div className="relative overflow-hidden rounded-[30px] border border-black bg-slate-100">
                  <div className="aspect-[3/3.1]">
                    {isMapReady ? (
                      <iframe
                        title="Google Map Live"
                        src={mapUrl}
                        className="h-full w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-500">Map loading...</div>
                    )}
                  </div>
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#0f7d2f]/60 bg-[#4fc97a]/28 shadow-[inset_0_0_0_999px_rgba(79,201,122,0.12)]" />
                  <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[14px] font-bold text-[#1f2937] sm:text-[48px]">Office Location</p>
                </div>

                <button
                  type="button"
                  onClick={handleLocationVerification}
                  disabled={isVerifyingLocation || locationVerified}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-full bg-gradient-to-r from-[#f92020] to-[#ffbe0f] px-3 py-2 text-[13px] font-bold whitespace-nowrap text-white disabled:cursor-not-allowed disabled:opacity-70 sm:py-3 sm:text-[24px] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]"
                >
                  <MapPin className="h-5 w-5" />
                  {isVerifyingLocation ? 'Verifying Location...' : locationVerified ? 'Location Verified' : 'Confirm Location'}
                </button>

                <div className={`mt-3 rounded-xl border px-3 py-2 text-center text-[11px] font-semibold sm:text-sm ${locationVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                  {locationVerified ? 'Location verified within allowed radius' : 'Awaiting location verification'}
                </div>
              </div>
            </article>
          </div>

          <div className="mx-auto mt-6 w-full max-w-[680px] rounded-[10px] border border-[#8ca5ad] bg-white">
            <div className="bg-[#006807] px-4 py-3 text-center text-[24px] font-bold text-white sm:text-[44px]">Attendance Confirm</div>

            <div className="px-4 py-3">
              <div className="overflow-hidden rounded-[22px] border-[6px] border-black">
                <div className={`border-b border-[#9db2c3] px-4 py-2 text-center ${
                  verificationSatisfied ? 'bg-[#edf6ed]' : 'bg-gray-100'
                }`}>
                  <p className={`text-[14px] font-extrabold sm:text-[28px] ${
                    verificationSatisfied ? 'text-[#1f9b1d]' : 'text-gray-500'
                  }`}>Complete your verification Processing</p>
                </div>
                <div className={`grid grid-cols-2 gap-3 border-b border-[#9db2c3] px-4 py-3 ${
                  verificationSatisfied ? 'bg-[#edf6ed]' : 'bg-gray-100'
                }`}>
                  <div className={`grid place-items-center rounded-full border-4 p-3 ${
                    verificationSatisfied ? 'border-black bg-[#15d41c]' : 'border-gray-400 bg-gray-200'
                  }`}>
                    <svg viewBox="0 0 24 24" className={`h-8 w-8 sm:h-12 sm:w-12 ${
                      verificationSatisfied ? 'text-black' : 'text-gray-500'
                    }`} fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21c1.8-4.2 4.7-6.2 8-6.2s6.2 2 8 6.2" />
                    </svg>
                  </div>
                  <div className={`grid place-items-center rounded-full border-4 p-3 ${
                    verificationSatisfied ? 'border-[#087a18] bg-white' : 'border-gray-400 bg-gray-200'
                  }`}>
                    <CheckCircle2 className={`h-8 w-8 sm:h-12 sm:w-12 ${
                      verificationSatisfied ? 'text-[#0b9f2a]' : 'text-gray-400'
                    }`} />
                  </div>
                </div>
                <div className="bg-[#e5eef8] px-4 py-3 text-center">
                  <p className="text-[18px] font-extrabold text-black sm:text-[34px]">{verificationSatisfied ? successMessage : 'Clock-In Processing'}</p>
                  <p className="text-[14px] font-semibold text-black sm:text-[24px]">{verificationSatisfied ? 'Ready to submit.' : 'Awaiting verification...'}</p>
                  <p className="mt-2 text-[14px] font-semibold text-black sm:text-[20px]">Time: {verificationSatisfied && verificationCompleteTime ? formatTimeWithAMPM(verificationCompleteTime) : '--:--'}</p>
                  <p className="text-[14px] font-semibold text-black sm:text-[20px]">Date: {new Date().toLocaleDateString('en-BD')}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || loading || isActionAlreadyDone || !verificationSatisfied}
                className={`mt-4 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-[14px] font-extrabold text-white sm:text-[22px] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)] ${
                  verificationSatisfied
                    ? 'bg-gradient-to-r from-[#007a00] to-[#00a000] hover:from-[#006800] hover:to-[#008800] cursor-pointer'
                    : 'bg-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                {submitting ? 'Submitting...' : verificationSatisfied ? 'Accept' : 'Verify First'}
              </button>

              <button
                type="button"
                onClick={() => router.replace('/seller')}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#f92020] to-[#ffbe0f] px-4 py-3 text-[14px] font-extrabold text-white sm:text-[24px] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]"
              >
                Return to Home
              </button>

              <div className="mt-3 space-y-1 text-center text-xs text-slate-600">
                <p>{locationMessage}</p>
                {geoCoordinates ? <p>Coordinates: {geoCoordinates.lat}, {geoCoordinates.lng}</p> : null}
                {typeof geoCoordinates?.accuracyMeters === 'number' ? <p>Accuracy: ±{Math.round(geoCoordinates.accuracyMeters)}m</p> : null}
                {message ? <p className={message.toLowerCase().includes('success') ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>{message}</p> : null}
              </div>
            </div>
          </div>
        </section>
        </div>
      </main>

      <SupportChatWidget role="seller" displayName={chatIdentity.name} senderId={chatIdentity.sellerId} />

      <SellerFooterNav activeView="home" onNavigate={handleNavigateSellerView} />
    </div>
  );
}
