import Link from 'next/link';
import { ArrowRight, Clock3, MapPin } from 'lucide-react';

export default function SellerAttendanceHubPage() {
  return (
    <main className="min-h-screen bg-[#f4f5f7] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8 sm:py-7">
          <p className="text-[11px] font-black uppercase tracking-[0.38em] text-slate-500">Attendance</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Attendance Verification</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Choose the verification flow you need. Each page uses the same admin-driven rule set.
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <Link href="/seller/attendance/clock-in" className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="inline-flex rounded-2xl bg-slate-900 p-3 text-white">
                  <Clock3 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Clock In</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Open the Clock-In page with live camera and office map verification.
                  </p>
                </div>
              </div>
              <ArrowRight className="mt-1 h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-900" />
            </div>
          </Link>

          <Link href="/seller/attendance/clock-out" className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="inline-flex rounded-2xl bg-slate-900 p-3 text-white">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Clock Out</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Open the Clock-Out page with the same live verification layout.
                  </p>
                </div>
              </div>
              <ArrowRight className="mt-1 h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-900" />
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
