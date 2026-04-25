'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';

type CourierConfig = {
  enabled: boolean;
  provider: string;
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  autoCreateOnProcessing: boolean;
  strictMode: boolean;
  endpointPath: string;
  responseSuccessPath: string;
  responseSuccessValues: string;
};

const DEFAULT_CONFIG: CourierConfig = {
  enabled: false,
  provider: 'steadfast',
  apiKey: '',
  secretKey: '',
  baseUrl: '',
  autoCreateOnProcessing: true,
  strictMode: false,
  endpointPath: '/create_order',
  responseSuccessPath: 'status',
  responseSuccessValues: 'success,ok,1,true',
};

export default function CourierIntegrationPage() {
  const [config, setConfig] = useState<CourierConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch('/api/admin/integrations/courier', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (cancelled) return;

        if (response.ok && payload?.success && payload?.data) {
          setConfig({ ...DEFAULT_CONFIG, ...payload.data });
        }
      } catch {
        if (!cancelled) {
          setStatus({ type: 'error', message: 'Failed to load courier configuration' });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch('/api/admin/integrations/courier', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setStatus({ type: 'error', message: payload?.error || 'Failed to save courier configuration' });
        return;
      }

      setStatus({ type: 'success', message: 'Courier configuration saved' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to save courier configuration' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">Courier Integration</h1>
        <p className="mt-1 text-sm text-slate-500">Configure courier credentials and processing-order auto-dispatch behavior.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}

        {!loading ? (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(event) => setConfig((prev) => ({ ...prev, enabled: event.target.checked }))}
                className="h-4 w-4 accent-orange-500"
              />
              Enable Courier Integration
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Provider</span>
              <input
                type="text"
                value={config.provider}
                onChange={(event) => setConfig((prev) => ({ ...prev, provider: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder="steadfast"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">API Key</span>
              <input
                type="text"
                value={config.apiKey}
                onChange={(event) => setConfig((prev) => ({ ...prev, apiKey: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder="Courier API key"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Secret Key</span>
              <input
                type="password"
                value={config.secretKey}
                onChange={(event) => setConfig((prev) => ({ ...prev, secretKey: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder="Courier secret key"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Base URL (optional)</span>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(event) => setConfig((prev) => ({ ...prev, baseUrl: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder="https://api.example.com"
              />
            </label>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={config.autoCreateOnProcessing}
                onChange={(event) => setConfig((prev) => ({ ...prev, autoCreateOnProcessing: event.target.checked }))}
                className="h-4 w-4 accent-orange-500"
              />
              Auto-create courier entry when status becomes PROCESSING
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-800">Strict Provider Contract</h2>
              <p className="mt-1 text-xs text-slate-500">
                Enable strict mode to enforce exact endpoint and response signature matching.
              </p>

              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.strictMode}
                    onChange={(event) => setConfig((prev) => ({ ...prev, strictMode: event.target.checked }))}
                    className="h-4 w-4 accent-orange-500"
                  />
                  Enable strict mode
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Endpoint Path</span>
                  <input
                    type="text"
                    value={config.endpointPath}
                    onChange={(event) => setConfig((prev) => ({ ...prev, endpointPath: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    placeholder="/create_order"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Response Success Path</span>
                  <input
                    type="text"
                    value={config.responseSuccessPath}
                    onChange={(event) => setConfig((prev) => ({ ...prev, responseSuccessPath: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    placeholder="status"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Accepted Success Values (comma separated)</span>
                  <input
                    type="text"
                    value={config.responseSuccessValues}
                    onChange={(event) => setConfig((prev) => ({ ...prev, responseSuccessValues: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    placeholder="success,ok,1,true"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={saveConfig}
                disabled={saving}
                className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save Courier Settings'}
              </button>
            </div>

            {status ? (
              <p className={`text-sm font-medium ${status.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {status.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
    </AdminLayout>
  );
}
