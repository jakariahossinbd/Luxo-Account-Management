'use client';

import Link from 'next/link';

export default function SellerProfilePage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-24">
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Seller Profile</h1>
        <p className="mt-2 text-sm text-slate-600">Profile page is ready for seller account details.</p>
        <Link href="/seller" className="mt-6 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Back to Dashboard
        </Link>
      </section>
    </main>
  );
}
