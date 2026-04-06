import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';

type AdminComingSoonProps = {
  title: string;
  description: string;
  backHref?: string;
};

export function AdminComingSoon({ title, description, backHref = '/admin' }: AdminComingSoonProps) {
  return (
    <AdminLayout>
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-slate-600">{description}</p>
        <div className="mt-6">
          <Link
            href={backHref}
            className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
