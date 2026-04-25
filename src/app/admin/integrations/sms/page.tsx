'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DatePanelPicker, buildCalendarDays } from '@/components/layout/DatePanelPicker';

type LeadSmsStatus = 'customer-leds' | 'pending' | 'processing' | 'delivery' | 'canceled';

type SmsGatewayConfig = {
  enabled: boolean;
  provider: string;
  apiUrl: string;
  apiKey: string;
  senderId: string;
  triggerOnCustomerLeds: boolean;
  triggerOnPending: boolean;
  triggerOnProcessing: boolean;
  triggerOnDelivery: boolean;
  triggerOnCanceled: boolean;
  strictMode: boolean;
  endpointPath: string;
  responseSuccessPath: string;
  responseSuccessValues: string;
  maxRetryAttempts: number;
  baseRetryDelayMs: number;
};

type SmsTemplates = {
  customerLeds: string;
  pending: string;
  processing: string;
  delivery: string;
  canceled: string;
};

type BulkSendResult = {
  recipient: string;
  state: 'pending' | 'done' | 'deny';
  reason?: string;
};

type RecipientPreviewRow = {
  orderId: string;
  customerName: string;
  phone: string;
  status: LeadSmsStatus;
  date: string;
};

type SnapshotStatusRow = {
  status: LeadSmsStatus;
  total: number;
  createdAt: string | null;
  exists: boolean;
};

type MonthlyPanelMode = 'status-export' | 'snapshot-archive';
type BulkSmsSource = LeadSmsStatus | 'custom-number';

const STATUS_OPTIONS: Array<{ value: LeadSmsStatus; label: string }> = [
  { value: 'customer-leds', label: 'CUSTOMER LEDS' },
  { value: 'pending', label: 'PENDING ORDER' },
  { value: 'processing', label: 'PROCESSING ORDER' },
  { value: 'delivery', label: 'COMPLETE DELIVERY' },
  { value: 'canceled', label: 'CANCELED ORDER' },
];

const BULK_SOURCE_OPTIONS: Array<{ value: BulkSmsSource; label: string; toneClass: string }> = [
  { value: 'pending', label: 'PENDING ORDER', toneClass: 'text-amber-600' },
  { value: 'processing', label: 'PROCESSING ORDER', toneClass: 'text-blue-700' },
  { value: 'delivery', label: 'COMPLETE DELIVERY', toneClass: 'text-emerald-600' },
  { value: 'canceled', label: 'CANCELED ORDER', toneClass: 'text-orange-600' },
  { value: 'customer-leds', label: 'CUSTOMER LEDS', toneClass: 'text-cyan-600' },
  { value: 'custom-number', label: 'CUSTOM NUMBER', toneClass: 'text-fuchsia-600' },
];

const DEFAULT_CONFIG: SmsGatewayConfig = {
  enabled: false,
  provider: 'zaman-it',
  apiUrl: '',
  apiKey: '',
  senderId: '',
  triggerOnCustomerLeds: false,
  triggerOnPending: false,
  triggerOnProcessing: true,
  triggerOnDelivery: true,
  triggerOnCanceled: false,
  strictMode: false,
  endpointPath: '/',
  responseSuccessPath: 'status',
  responseSuccessValues: 'success,ok,1,true',
  maxRetryAttempts: 3,
  baseRetryDelayMs: 1200,
};

const DEFAULT_TEMPLATES: SmsTemplates = {
  customerLeds: 'Order {orderId} has been received as a customer lead. We will contact you soon.',
  pending: 'Order {orderId} for {customerName} is currently pending confirmation.',
  processing: 'Order {orderId} for {customerName} is now processing. Date: {orderDate}. Delivery partner: {courier}.',
  delivery: 'Order {orderId} for {customerName} is out for delivery.',
  canceled: 'Order {orderId} for {customerName} has been canceled. Contact us for support if needed.',
};

export default function SmsGatewayPage() {
  const [config, setConfig] = useState<SmsGatewayConfig>(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState<SmsTemplates>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkRecipients, setBulkRecipients] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkSendResult[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<LeadSmsStatus[]>(['delivery']);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterDay, setFilterDay] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [recipientDatePanelOpen, setRecipientDatePanelOpen] = useState(false);
  const [recipientDateField, setRecipientDateField] = useState<'from' | 'to' | null>(null);
  const [recipientDateDraft, setRecipientDateDraft] = useState('');
  const [recipientDatePanelMonth, setRecipientDatePanelMonth] = useState(new Date().getMonth());
  const [recipientDatePanelYear, setRecipientDatePanelYear] = useState(new Date().getFullYear());
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState<RecipientPreviewRow[]>([]);
  const [previewSummary, setPreviewSummary] = useState<Record<LeadSmsStatus, number>>({
    'customer-leds': 0,
    pending: 0,
    processing: 0,
    delivery: 0,
    canceled: 0,
  });
  const [useFilterForSend, setUseFilterForSend] = useState(false);
  const [exportStatus, setExportStatus] = useState<LeadSmsStatus>('delivery');
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()));
  const [exportMonth, setExportMonth] = useState(String(new Date().getMonth() + 1));
  const [exportDay, setExportDay] = useState('');
  const [exportingExcel, setExportingExcel] = useState(false);
  const [snapshotYear, setSnapshotYear] = useState(String(new Date().getFullYear()));
  const [snapshotMonth, setSnapshotMonth] = useState(String(new Date().getMonth() + 1));
  const [snapshotStatus, setSnapshotStatus] = useState<LeadSmsStatus>('delivery');
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [downloadingSnapshot, setDownloadingSnapshot] = useState(false);
  const [snapshotRows, setSnapshotRows] = useState<SnapshotStatusRow[]>([]);
  const [monthlyPanelMode, setMonthlyPanelMode] = useState<MonthlyPanelMode>('status-export');
  const [bulkSource, setBulkSource] = useState<BulkSmsSource>('custom-number');
  const [bulkSourceMenuOpen, setBulkSourceMenuOpen] = useState(false);
  const [bulkCustomNumber, setBulkCustomNumber] = useState('');
  const [bulkDatePanelOpen, setBulkDatePanelOpen] = useState(false);

  const toLocalDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDate = new Date();
  const [bulkSendDateFrom, setBulkSendDateFrom] = useState(toLocalDateInputValue(todayDate));
  const [bulkSendDateTo, setBulkSendDateTo] = useState(toLocalDateInputValue(todayDate));
  const [bulkDateDraftFrom, setBulkDateDraftFrom] = useState(toLocalDateInputValue(todayDate));
  const [bulkDateDraftTo, setBulkDateDraftTo] = useState(toLocalDateInputValue(todayDate));
  const [bulkDatePanelMonth, setBulkDatePanelMonth] = useState(todayDate.getMonth());
  const [bulkDatePanelYear, setBulkDatePanelYear] = useState(todayDate.getFullYear());

  const bulkSourceMenuRef = useRef<HTMLDivElement | null>(null);
  const bulkDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const bulkDatePanelRef = useRef<HTMLDivElement | null>(null);
  const recipientDateButtonRef = useRef<{ from: HTMLButtonElement | null; to: HTMLButtonElement | null }>({ from: null, to: null });
  const recipientDatePanelRef = useRef<HTMLDivElement | null>(null);

  const yearOptions = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index);

  const todayDateValue = toLocalDateInputValue(new Date());
  const isBulkDateToday = bulkSendDateFrom === todayDateValue && bulkSendDateTo === todayDateValue;
  const selectedBulkSourceOption = BULK_SOURCE_OPTIONS.find((option) => option.value === bulkSource);
  const recipientDatePanelDays = buildCalendarDays(recipientDatePanelMonth, recipientDatePanelYear);
  const recipientDraftDate = recipientDateDraft ? new Date(`${recipientDateDraft}T00:00:00`) : new Date(`${todayDateValue}T00:00:00`);
  const recipientDraftLabel = recipientDateDraft === todayDateValue
    ? 'Today'
    : recipientDateDraft
      ? recipientDraftDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      : 'Today';

  const bulkDatePanelDays = buildCalendarDays(bulkDatePanelMonth, bulkDatePanelYear);
  const bulkAppliedFromDate = new Date(`${bulkSendDateFrom}T00:00:00`);
  const bulkAppliedToDate = new Date(`${bulkSendDateTo}T00:00:00`);
  const bulkDraftFromDate = new Date(`${bulkDateDraftFrom}T00:00:00`);
  const bulkDraftToDate = new Date(`${bulkDateDraftTo}T00:00:00`);
  const hasBulkRange = bulkSendDateFrom !== bulkSendDateTo;
  const hasBulkDraftRange = bulkDateDraftFrom !== bulkDateDraftTo;

  const bulkDateLabel = isBulkDateToday
    ? 'Today'
    : hasBulkRange
      ? `${bulkAppliedFromDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${bulkAppliedToDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
      : bulkAppliedFromDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        });

  const bulkDraftDateLabel = bulkDateDraftFrom === todayDateValue && bulkDateDraftTo === todayDateValue
    ? 'Today'
    : hasBulkDraftRange
      ? `${bulkDraftFromDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${bulkDraftToDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
      : bulkDraftFromDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        });

  const openBulkDatePanel = () => {
    const nextDate = new Date(`${bulkSendDateFrom}T00:00:00`);
    setBulkDateDraftFrom(bulkSendDateFrom);
    setBulkDateDraftTo(bulkSendDateTo);
    setBulkDatePanelMonth(nextDate.getMonth());
    setBulkDatePanelYear(nextDate.getFullYear());
    setBulkDatePanelOpen(true);
  };

  const handleBulkDraftDateSelect = (day: number) => {
    const nextDate = new Date(bulkDatePanelYear, bulkDatePanelMonth, day);
    const nextValue = toLocalDateInputValue(nextDate);

    if (!bulkDateDraftFrom || (bulkDateDraftFrom && bulkDateDraftTo)) {
      setBulkDateDraftFrom(nextValue);
      setBulkDateDraftTo('');
      return;
    }

    if (nextValue < bulkDateDraftFrom) {
      setBulkDateDraftTo(bulkDateDraftFrom);
      setBulkDateDraftFrom(nextValue);
      return;
    }

    setBulkDateDraftTo(nextValue);
  };

  const handleBulkDatePanelUpdate = () => {
    const normalizedTo = bulkDateDraftTo || bulkDateDraftFrom;
    setBulkSendDateFrom(bulkDateDraftFrom);
    setBulkSendDateTo(normalizedTo);
    setBulkDateDraftTo(normalizedTo);
    setBulkDatePanelOpen(false);
  };

  const openRecipientDatePanel = (field: 'from' | 'to') => {
    const initialValue = field === 'from' ? filterFrom : filterTo;
    const parsedDate = initialValue ? new Date(`${initialValue}T00:00:00`) : new Date();

    setRecipientDateField(field);
    setRecipientDateDraft(initialValue || todayDateValue);
    setRecipientDatePanelMonth(parsedDate.getMonth());
    setRecipientDatePanelYear(parsedDate.getFullYear());
    setRecipientDatePanelOpen(true);
  };

  const handleRecipientDateSelect = (day: number) => {
    const nextDate = new Date(recipientDatePanelYear, recipientDatePanelMonth, day);
    setRecipientDateDraft(toLocalDateInputValue(nextDate));
  };

  const handleRecipientDatePanelUpdate = () => {
    if (!recipientDateField) return;

    if (recipientDateField === 'from') {
      setFilterFrom(recipientDateDraft);
    } else {
      setFilterTo(recipientDateDraft);
    }

    setRecipientDatePanelOpen(false);
  };

  const isBulkDayInDraftRange = (day: number) => {
    const dayValue = toLocalDateInputValue(new Date(bulkDatePanelYear, bulkDatePanelMonth, day));
    const rangeEnd = bulkDateDraftTo || bulkDateDraftFrom;
    return dayValue >= bulkDateDraftFrom && dayValue <= rangeEnd;
  };

  const toOptionalInt = (value: string): number | undefined => {
    const normalized = value.trim();
    if (!normalized) return undefined;
    const parsed = Number.parseInt(normalized, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const buildFilterPayload = () => {
    const payload: {
      statuses: LeadSmsStatus[];
      year?: number;
      month?: number;
      day?: number;
      from?: string;
      to?: string;
    } = {
      statuses: filterStatuses,
    };

    if (filterFrom.trim() || filterTo.trim()) {
      if (filterFrom.trim()) payload.from = filterFrom.trim();
      if (filterTo.trim()) payload.to = filterTo.trim();
      return payload;
    }

    const year = toOptionalInt(filterYear);
    if (year) payload.year = year;

    const month = toOptionalInt(filterMonth);
    if (month) payload.month = month;

    const day = toOptionalInt(filterDay);
    if (day) payload.day = day;

    return payload;
  };

  const toggleFilterStatus = (value: LeadSmsStatus, checked: boolean) => {
    setFilterStatuses((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, value]));
      }
      return prev.filter((item) => item !== value);
    });
  };

  const fetchRecipientsPreview = async () => {
    if (filterStatuses.length === 0) {
      setStatus({ type: 'error', message: 'Select at least one status for recipient filter' });
      return;
    }

    setPreviewLoading(true);
    setStatus(null);

    try {
      const query = new URLSearchParams();
      query.set('statuses', filterStatuses.join(','));

      const payload = buildFilterPayload();
      if (payload.year) query.set('year', String(payload.year));
      if (payload.month) query.set('month', String(payload.month));
      if (payload.day) query.set('day', String(payload.day));
      if (payload.from) query.set('from', payload.from);
      if (payload.to) query.set('to', payload.to);

      const response = await fetch(`/api/admin/integrations/sms/recipients?${query.toString()}`, { cache: 'no-store' });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setStatus({ type: 'error', message: result?.error || 'Failed to fetch recipients' });
        return;
      }

      setPreviewRows(Array.isArray(result?.data?.recipients) ? result.data.recipients : []);
      setPreviewSummary({
        'customer-leds': Number(result?.data?.summary?.['customer-leds'] || 0),
        pending: Number(result?.data?.summary?.pending || 0),
        processing: Number(result?.data?.summary?.processing || 0),
        delivery: Number(result?.data?.summary?.delivery || 0),
        canceled: Number(result?.data?.summary?.canceled || 0),
      });
      setStatus({ type: 'success', message: `Recipients loaded: ${result?.data?.totalRecipients ?? 0}` });
    } catch {
      setStatus({ type: 'error', message: 'Failed to fetch recipients' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const applyPreviewToManualRecipients = () => {
    const phoneSet = Array.from(new Set(previewRows.map((item) => item.phone)));
    setBulkRecipients(phoneSet.join('\n'));
    setStatus({ type: 'success', message: `Loaded ${phoneSet.length} recipients into manual list` });
  };

  const refreshSnapshotList = async () => {
    const year = toOptionalInt(snapshotYear);
    const month = toOptionalInt(snapshotMonth);
    if (!year || !month) {
      setStatus({ type: 'error', message: 'Snapshot year and month are required' });
      return;
    }

    setLoadingSnapshots(true);

    try {
      const statuses = STATUS_OPTIONS.map((item) => item.value).join(',');
      const response = await fetch(`/api/admin/integrations/sms/snapshots?year=${year}&month=${month}&statuses=${statuses}`, {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setStatus({ type: 'error', message: payload?.error || 'Failed to load snapshot list' });
        return;
      }

      setSnapshotRows(Array.isArray(payload?.data?.snapshots) ? payload.data.snapshots : []);
    } catch {
      setStatus({ type: 'error', message: 'Failed to load snapshot list' });
    } finally {
      setLoadingSnapshots(false);
    }
  };

  const createSnapshot = async () => {
    const year = toOptionalInt(snapshotYear);
    const month = toOptionalInt(snapshotMonth);
    if (!year || !month) {
      setStatus({ type: 'error', message: 'Snapshot year and month are required' });
      return;
    }

    setCreatingSnapshot(true);

    try {
      const response = await fetch('/api/admin/integrations/sms/snapshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          month,
          statuses: STATUS_OPTIONS.map((item) => item.value),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setStatus({ type: 'error', message: payload?.error || 'Failed to create snapshot' });
        return;
      }

      setStatus({ type: 'success', message: 'Monthly snapshot created' });
      await refreshSnapshotList();
    } catch {
      setStatus({ type: 'error', message: 'Failed to create snapshot' });
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const downloadSnapshotExcel = async () => {
    const year = toOptionalInt(snapshotYear);
    const month = toOptionalInt(snapshotMonth);
    if (!year || !month) {
      setStatus({ type: 'error', message: 'Snapshot year and month are required' });
      return;
    }

    setDownloadingSnapshot(true);
    try {
      const params = new URLSearchParams();
      params.set('status', snapshotStatus);
      params.set('year', String(year));
      params.set('month', String(month));

      const response = await fetch(`/api/admin/integrations/sms/snapshots/export?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setStatus({ type: 'error', message: payload?.error || 'Failed to download snapshot Excel' });
        return;
      }

      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = fileUrl;
      anchor.download = `sms-snapshot-${snapshotStatus}-${year}-${String(month).padStart(2, '0')}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(fileUrl);

      setStatus({ type: 'success', message: 'Snapshot Excel downloaded' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to download snapshot Excel' });
    } finally {
      setDownloadingSnapshot(false);
    }
  };

  const downloadStatusExcel = async () => {
    const year = toOptionalInt(exportYear);
    if (!year) {
      setStatus({ type: 'error', message: 'Year is required for Excel export' });
      return;
    }

    setExportingExcel(true);
    setStatus(null);

    try {
      const params = new URLSearchParams();
      params.set('status', exportStatus);
      params.set('year', String(year));

      const month = toOptionalInt(exportMonth);
      if (month) params.set('month', String(month));

      const day = toOptionalInt(exportDay);
      if (day) params.set('day', String(day));

      const response = await fetch(`/api/admin/integrations/sms/export?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setStatus({ type: 'error', message: payload?.error || 'Failed to download Excel file' });
        return;
      }

      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const monthPart = month ? `-${String(month).padStart(2, '0')}` : '';
      const dayPart = day ? `-${String(day).padStart(2, '0')}` : '';
      anchor.href = fileUrl;
      anchor.download = `sms-recipients-${exportStatus}-${year}${monthPart}${dayPart}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(fileUrl);

      setStatus({ type: 'success', message: 'Excel downloaded successfully' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to download Excel file' });
    } finally {
      setExportingExcel(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const [configResponse, templateResponse] = await Promise.all([
          fetch('/api/admin/integrations/sms', { cache: 'no-store' }),
          fetch('/api/admin/integrations/sms/templates', { cache: 'no-store' }),
        ]);
        const payload = await configResponse.json().catch(() => null);
        const templatePayload = await templateResponse.json().catch(() => null);

        if (cancelled) return;

        if (configResponse.ok && payload?.success && payload?.data) {
          setConfig({ ...DEFAULT_CONFIG, ...payload.data });
        }

        if (templateResponse.ok && templatePayload?.success && templatePayload?.data) {
          setTemplates({ ...DEFAULT_TEMPLATES, ...templatePayload.data });
        }
      } catch {
        if (!cancelled) {
          setStatus({ type: 'error', message: 'Failed to load SMS configuration' });
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

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!bulkSourceMenuRef.current?.contains(event.target as Node)) {
        setBulkSourceMenuOpen(false);
      }

      if (
        bulkDatePanelOpen &&
        !bulkDatePanelRef.current?.contains(event.target as Node) &&
        !bulkDateButtonRef.current?.contains(event.target as Node)
      ) {
        setBulkDatePanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [bulkDatePanelOpen]);

  useEffect(() => {
    const handleRecipientPointerDown = (event: MouseEvent) => {
      if (
        recipientDatePanelOpen &&
        !recipientDatePanelRef.current?.contains(event.target as Node) &&
        !recipientDateButtonRef.current.from?.contains(event.target as Node) &&
        !recipientDateButtonRef.current.to?.contains(event.target as Node)
      ) {
        setRecipientDatePanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleRecipientPointerDown);
    return () => {
      document.removeEventListener('mousedown', handleRecipientPointerDown);
    };
  }, [recipientDatePanelOpen]);

  const saveConfig = async () => {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch('/api/admin/integrations/sms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setStatus({ type: 'error', message: payload?.error || 'Failed to save SMS configuration' });
        return;
      }

      setStatus({ type: 'success', message: 'SMS gateway configuration saved' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to save SMS configuration' });
    } finally {
      setSaving(false);
    }
  };

  const saveTemplates = async () => {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch('/api/admin/integrations/sms/templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templates),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setStatus({ type: 'error', message: payload?.error || 'Failed to save SMS templates' });
        return;
      }

      setStatus({ type: 'success', message: 'SMS templates saved' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to save SMS templates' });
    } finally {
      setSaving(false);
    }
  };

  const sendBulkSms = async () => {
    const trimmedCustomNumber = bulkCustomNumber.trim();
    const recipients =
      bulkSource === 'custom-number'
        ? trimmedCustomNumber
          ? [trimmedCustomNumber]
          : []
        : useFilterForSend
          ? []
          : bulkRecipients
              .split(/\r?\n|,|;/)
              .map((entry) => entry.trim())
              .filter(Boolean);

    if (!bulkMessage.trim()) {
      setStatus({ type: 'error', message: 'Provide a message before sending' });
      return;
    }

    if (bulkSource !== 'custom-number' && (!bulkSendDateFrom.trim() || !bulkSendDateTo.trim())) {
      setStatus({ type: 'error', message: 'Select a custom date or date range for status-based sending' });
      return;
    }

    if (bulkSource === 'custom-number' && recipients.length === 0) {
      setStatus({ type: 'error', message: 'Enter one custom phone number' });
      return;
    }

    if (useFilterForSend && filterStatuses.length === 0) {
      setStatus({ type: 'error', message: 'Select at least one status for filter-based sending' });
      return;
    }

    if (!useFilterForSend && recipients.length === 0) {
      setStatus({ type: 'error', message: 'Provide at least one manual recipient' });
      return;
    }

    setSendingBulk(true);
    setStatus(null);
    setBulkResults([]);

    try {
      const response = await fetch('/api/admin/integrations/sms/bulk-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          bulkSource === 'custom-number'
            ? {
                message: bulkMessage,
                recipients,
              }
            : {
                message: bulkMessage,
                filter: {
                  statuses: [bulkSource],
                  from: bulkSendDateFrom,
                  to: bulkSendDateTo,
                },
              }
        ),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setStatus({ type: 'error', message: payload?.error || 'Failed to send bulk SMS' });
        return;
      }

      setBulkResults(Array.isArray(payload?.data?.results) ? payload.data.results : []);
      setStatus({
        type: 'success',
        message: `Bulk SMS (${payload?.data?.source || 'manual'}) finished. Sent: ${payload?.data?.summary?.done ?? 0}, Pending: ${payload?.data?.summary?.pending ?? 0}, Denied: ${payload?.data?.summary?.deny ?? 0}`,
      });
    } catch {
      setStatus({ type: 'error', message: 'Failed to send bulk SMS' });
    } finally {
      setSendingBulk(false);
    }
  };

  return (
    <AdminLayout>
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">SMS Gateway</h1>
        <p className="mt-1 text-sm text-slate-500">Configure SMS provider credentials, triggers, and retry behavior.</p>
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
              Enable SMS Gateway
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Provider</span>
              <input
                type="text"
                value={config.provider}
                onChange={(event) => setConfig((prev) => ({ ...prev, provider: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder="zaman-it"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">API URL</span>
              <input
                type="text"
                value={config.apiUrl}
                onChange={(event) => setConfig((prev) => ({ ...prev, apiUrl: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder="https://provider.example.com/send"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">API Key</span>
              <input
                type="text"
                value={config.apiKey}
                onChange={(event) => setConfig((prev) => ({ ...prev, apiKey: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder="Gateway API key"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Sender ID</span>
              <input
                type="text"
                value={config.senderId}
                onChange={(event) => setConfig((prev) => ({ ...prev, senderId: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder="SENDERID"
              />
            </label>

            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={config.triggerOnCustomerLeds}
                  onChange={(event) => setConfig((prev) => ({ ...prev, triggerOnCustomerLeds: event.target.checked }))}
                  className="h-5 w-5 accent-orange-500"
                />
                CUSTOMER LEDS
              </label>

              <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={config.triggerOnPending}
                  onChange={(event) => setConfig((prev) => ({ ...prev, triggerOnPending: event.target.checked }))}
                  className="h-5 w-5 accent-orange-500"
                />
                PENDING ORDER
              </label>

              <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={config.triggerOnProcessing}
                  onChange={(event) => setConfig((prev) => ({ ...prev, triggerOnProcessing: event.target.checked }))}
                  className="h-5 w-5 accent-orange-500"
                />
                PROCESSING ORDER
              </label>

              <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={config.triggerOnDelivery}
                  onChange={(event) => setConfig((prev) => ({ ...prev, triggerOnDelivery: event.target.checked }))}
                  className="h-5 w-5 accent-orange-500"
                />
                COMPLETE DELIVERY
              </label>

              <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={config.triggerOnCanceled}
                  onChange={(event) => setConfig((prev) => ({ ...prev, triggerOnCanceled: event.target.checked }))}
                  className="h-5 w-5 accent-orange-500"
                />
                CANCELED ORDER
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Max Retry Attempts</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={config.maxRetryAttempts}
                  onChange={(event) => setConfig((prev) => ({ ...prev, maxRetryAttempts: Number(event.target.value || 3) }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Base Retry Delay (ms)</span>
                <input
                  type="number"
                  min={500}
                  max={10000}
                  value={config.baseRetryDelayMs}
                  onChange={(event) => setConfig((prev) => ({ ...prev, baseRetryDelayMs: Number(event.target.value || 1200) }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                />
              </label>
            </div>

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
                    placeholder="/"
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
                disabled={saving || sendingBulk}
                className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save SMS Settings'}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-800">Status Templates</h2>
              <p className="mt-1 text-xs text-slate-500">
                Available placeholders: {'{orderId}'}, {'{customerName}'}, {'{orderDate}'}, {'{courier}'}, {'{status}'}.
              </p>

              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">CUSTOMER LEDS Template</span>
                  <textarea
                    rows={3}
                    value={templates.customerLeds}
                    onChange={(event) => setTemplates((prev) => ({ ...prev, customerLeds: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">PENDING ORDER Template</span>
                  <textarea
                    rows={3}
                    value={templates.pending}
                    onChange={(event) => setTemplates((prev) => ({ ...prev, pending: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">PROCESSING Template</span>
                  <textarea
                    rows={3}
                    value={templates.processing}
                    onChange={(event) => setTemplates((prev) => ({ ...prev, processing: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">DELIVERY Template</span>
                  <textarea
                    rows={3}
                    value={templates.delivery}
                    onChange={(event) => setTemplates((prev) => ({ ...prev, delivery: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">CANCELED Template</span>
                  <textarea
                    rows={3}
                    value={templates.canceled}
                    onChange={(event) => setTemplates((prev) => ({ ...prev, canceled: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                </label>

                <button
                  type="button"
                  onClick={saveTemplates}
                  disabled={saving || sendingBulk}
                  className="rounded-full bg-slate-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-70"
                >
                  {saving ? 'Saving...' : 'Save Templates'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-800">Recipient Pool by Status & Date</h2>
              <p className="mt-1 text-xs text-slate-500">Fetch customer numbers by status and date for filter-based sending.</p>

              <div className="mt-3 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {STATUS_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={filterStatuses.includes(option.value)}
                        onChange={(event) => toggleFilterStatus(option.value, event.target.checked)}
                        className="h-4 w-4 accent-orange-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Year</span>
                    <select
                      value={filterYear}
                      onChange={(event) => setFilterYear(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    >
                      <option value="">All</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Month</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={filterMonth}
                      onChange={(event) => setFilterMonth(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                      placeholder="1-12"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Day (optional)</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={filterDay}
                      onChange={(event) => setFilterDay(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                      placeholder="1-31"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">From Date (optional)</span>
                    <button
                      ref={(element) => {
                        recipientDateButtonRef.current.from = element;
                      }}
                      type="button"
                      onClick={() => openRecipientDatePanel('from')}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 outline-none transition hover:border-orange-400"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className={filterFrom ? 'text-slate-700' : 'text-slate-400'}>{filterFrom || 'dd-mm-yyyy'}</span>
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </button>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">To Date (optional)</span>
                    <button
                      ref={(element) => {
                        recipientDateButtonRef.current.to = element;
                      }}
                      type="button"
                      onClick={() => openRecipientDatePanel('to')}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 outline-none transition hover:border-orange-400"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className={filterTo ? 'text-slate-700' : 'text-slate-400'}>{filterTo || 'dd-mm-yyyy'}</span>
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </button>
                  </label>
                </div>

                {recipientDatePanelOpen ? (
                  <div
                    ref={recipientDatePanelRef}
                    className="fixed inset-x-4 top-36 z-40 w-auto max-h-[60vh] overflow-y-auto rounded-[16px] border border-slate-200 bg-white p-3 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[420px] sm:max-h-none sm:overflow-visible"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                      <span>Custom date</span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-700">{recipientDraftLabel}</span>
                        <button
                          type="button"
                          onClick={() => setRecipientDatePanelOpen(false)}
                          className="grid h-6 w-6 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Close date panel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-2 flex items-center justify-between gap-2 px-1 pt-1 text-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          setRecipientDatePanelMonth((prev) => (prev === 0 ? 11 : prev - 1));
                          if (recipientDatePanelMonth === 0) {
                            setRecipientDatePanelYear((prev) => prev - 1);
                          }
                        }}
                        className="text-xl leading-none sm:text-2xl"
                      >
                        ‹
                      </button>
                      <DatePanelPicker
                        monthIndex={recipientDatePanelMonth}
                        year={recipientDatePanelYear}
                        onMonthChange={(nextMonthIndex) => {
                          setRecipientDatePanelMonth(nextMonthIndex);
                        }}
                        onYearChange={(nextYear) => {
                          setRecipientDatePanelYear(nextYear);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setRecipientDatePanelMonth((prev) => (prev === 11 ? 0 : prev + 1));
                          if (recipientDatePanelMonth === 11) {
                            setRecipientDatePanelYear((prev) => prev + 1);
                          }
                        }}
                        className="text-xl leading-none sm:text-2xl"
                      >
                        ›
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-y-1.5 text-center text-[12px] text-slate-700 sm:text-[15px]">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="py-1 font-medium">
                          {day}
                        </div>
                      ))}
                      {recipientDatePanelDays.map((day, index) => {
                        const dayValue = day ? toLocalDateInputValue(new Date(recipientDatePanelYear, recipientDatePanelMonth, day)) : '';
                        const isSelected = day ? recipientDateDraft === dayValue : false;
                        const isToday = day
                          ? dayValue === todayDateValue
                          : false;

                        return (
                          <button
                            key={`${recipientDatePanelYear}-${recipientDatePanelMonth}-${index}`}
                            type="button"
                            disabled={!day}
                            onClick={() => {
                              if (day) {
                                handleRecipientDateSelect(day);
                              }
                            }}
                            className={`rounded-md py-1.5 text-[12px] sm:py-2 sm:text-base ${!day
                              ? 'cursor-default text-slate-300'
                              : isSelected
                                ? 'bg-orange-500 font-semibold text-white'
                                : isToday
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            {day || ''}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-4 px-1 pb-1 text-xs sm:text-sm">
                      <button type="button" className="text-slate-700" onClick={() => setRecipientDatePanelOpen(false)}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-orange-500 px-3 py-1.5 text-white sm:px-4 sm:py-2"
                        onClick={handleRecipientDatePanelUpdate}
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchRecipientsPreview}
                    disabled={previewLoading || saving || sendingBulk}
                    className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-70"
                  >
                    {previewLoading ? 'Fetching...' : 'Fetch Numbers'}
                  </button>

                  <button
                    type="button"
                    onClick={applyPreviewToManualRecipients}
                    disabled={previewRows.length === 0 || saving || sendingBulk}
                    className="rounded-full bg-slate-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
                  >
                    Use In Manual Recipients
                  </button>

                  <label className="ml-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={useFilterForSend}
                      onChange={(event) => setUseFilterForSend(event.target.checked)}
                      className="h-4 w-4 accent-orange-500"
                    />
                    Send using current filter
                  </label>
                </div>

                  <div className="grid gap-2 text-xs sm:grid-cols-5">
                  {STATUS_OPTIONS.map((item) => (
                    <div key={`summary-${item.value}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700">
                      <p className="font-semibold">{item.label}</p>
                      <p>{previewSummary[item.value]}</p>
                    </div>
                  ))}
                </div>

                {previewRows.length > 0 ? (
                  <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Phone</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Order ID</th>
                          <th className="px-3 py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row) => (
                          <tr key={`${row.status}-${row.phone}-${row.orderId}`} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-700">{row.phone}</td>
                            <td className="px-3 py-2 text-slate-700">{row.customerName}</td>
                            <td className="px-3 py-2 text-slate-700">{row.status}</td>
                            <td className="px-3 py-2 text-slate-700">{row.orderId}</td>
                            <td className="px-3 py-2 text-slate-700">{row.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <input
                    type="radio"
                    name="monthly-panel-mode"
                    checked={monthlyPanelMode === 'status-export'}
                    onChange={() => setMonthlyPanelMode('status-export')}
                    className="h-5 w-5 accent-green-600"
                  />
                  Monthly Status Excel Export
                </label>

                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <input
                    type="radio"
                    name="monthly-panel-mode"
                    checked={monthlyPanelMode === 'snapshot-archive'}
                    onChange={() => setMonthlyPanelMode('snapshot-archive')}
                    className="h-5 w-5 accent-green-600"
                  />
                  Monthly Snapshot Archive
                </label>
              </div>

              {monthlyPanelMode === 'status-export' ? (
                <div>
                  <p className="mt-2 text-xs text-slate-500">Download a separate .xlsx file by status and date.</p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
                      <select
                        value={exportStatus}
                        onChange={(event) => setExportStatus(event.target.value as LeadSmsStatus)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={`export-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Year</span>
                      <select
                        value={exportYear}
                        onChange={(event) => setExportYear(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                      >
                        {yearOptions.map((year) => (
                          <option key={`export-year-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Month</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={exportMonth}
                        onChange={(event) => setExportMonth(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                        placeholder="1-12"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Day (optional)</span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={exportDay}
                        onChange={(event) => setExportDay(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                        placeholder="1-31"
                      />
                    </label>
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={downloadStatusExcel}
                      disabled={exportingExcel || saving || sendingBulk}
                      className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
                    >
                      {exportingExcel ? 'Preparing...' : 'Download Excel'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mt-2 text-xs text-slate-500">
                    Freeze month-wise status recipient lists and download snapshot files later.
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Snapshot Year</span>
                      <select
                        value={snapshotYear}
                        onChange={(event) => setSnapshotYear(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                      >
                        {yearOptions.map((year) => (
                          <option key={`snapshot-year-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Snapshot Month</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={snapshotMonth}
                        onChange={(event) => setSnapshotMonth(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                        placeholder="1-12"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Snapshot Status</span>
                      <select
                        value={snapshotStatus}
                        onChange={(event) => setSnapshotStatus(event.target.value as LeadSmsStatus)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={`snapshot-status-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={createSnapshot}
                      disabled={creatingSnapshot || saving || sendingBulk}
                      className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-70"
                    >
                      {creatingSnapshot ? 'Creating...' : 'Create Monthly Snapshot'}
                    </button>

                    <button
                      type="button"
                      onClick={refreshSnapshotList}
                      disabled={loadingSnapshots || saving || sendingBulk}
                      className="rounded-full bg-slate-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
                    >
                      {loadingSnapshots ? 'Refreshing...' : 'Refresh Snapshot List'}
                    </button>

                    <button
                      type="button"
                      onClick={downloadSnapshotExcel}
                      disabled={downloadingSnapshot || saving || sendingBulk}
                      className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                    >
                      {downloadingSnapshot ? 'Preparing...' : 'Download Snapshot Excel'}
                    </button>
                  </div>

                  {snapshotRows.length > 0 ? (
                    <div className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Exists</th>
                            <th className="px-3 py-2">Total</th>
                            <th className="px-3 py-2">Created At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshotRows.map((row) => (
                            <tr key={`snapshot-row-${row.status}`} className="border-t border-slate-100">
                              <td className="px-3 py-2 text-slate-700">{row.status}</td>
                              <td className="px-3 py-2 text-slate-700">{row.exists ? 'Yes' : 'No'}</td>
                              <td className="px-3 py-2 text-slate-700">{row.total}</td>
                              <td className="px-3 py-2 text-slate-700">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-800">Bulk Custom SMS</h2>
              <p className="mt-1 text-xs text-slate-500">
                {bulkSource === 'custom-number'
                  ? 'Custom number mode: enter a specific number and send directly.'
                  : 'Status mode: choose a status source and date to send automatically.'}
              </p>

              <div className="mt-3 space-y-3">
                <div className="relative space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Recipients</span>
                    <div>
                      <button
                        ref={bulkDateButtonRef}
                        type="button"
                        onClick={openBulkDatePanel}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                      >
                        {bulkDateLabel}
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {bulkDatePanelOpen ? (
                    <div
                      ref={bulkDatePanelRef}
                      className="fixed inset-x-4 top-36 z-40 w-auto max-h-[60vh] overflow-y-auto rounded-[16px] border border-slate-200 bg-white p-3 shadow-2xl sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:z-30 sm:mt-2 sm:w-[420px] sm:max-h-none sm:overflow-visible"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                        <span>Custom date</span>
                        <div className="flex items-center gap-2">
                          <span className="mr-1 rounded-full bg-orange-50 px-2 py-1 text-orange-700">{bulkDraftDateLabel}</span>
                          <button
                            type="button"
                            onClick={() => setBulkDatePanelOpen(false)}
                            className="grid h-6 w-6 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Close date panel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mb-2 flex items-center justify-between gap-2 px-1 pt-1 text-slate-700">
                        <button
                          type="button"
                          onClick={() => {
                            setBulkDatePanelMonth((prev) => (prev === 0 ? 11 : prev - 1));
                            if (bulkDatePanelMonth === 0) {
                              setBulkDatePanelYear((prev) => prev - 1);
                            }
                          }}
                          className="text-xl leading-none sm:text-2xl"
                        >
                          ‹
                        </button>
                        <DatePanelPicker
                          monthIndex={bulkDatePanelMonth}
                          year={bulkDatePanelYear}
                          onMonthChange={(nextMonthIndex) => {
                            setBulkDatePanelMonth(nextMonthIndex);
                          }}
                          onYearChange={(nextYear) => {
                            setBulkDatePanelYear(nextYear);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setBulkDatePanelMonth((prev) => (prev === 11 ? 0 : prev + 1));
                            if (bulkDatePanelMonth === 11) {
                              setBulkDatePanelYear((prev) => prev + 1);
                            }
                          }}
                          className="text-xl leading-none sm:text-2xl"
                        >
                          ›
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-y-1.5 text-center text-[12px] text-slate-700 sm:text-[15px]">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <div key={day} className="py-1 font-medium">
                            {day}
                          </div>
                        ))}
                        {bulkDatePanelDays.map((day, index) => (
                          <button
                            key={`${bulkDatePanelYear}-${bulkDatePanelMonth}-${index}`}
                            type="button"
                            disabled={!day}
                            onClick={() => {
                              if (day) {
                                handleBulkDraftDateSelect(day);
                              }
                            }}
                            className={`rounded-md py-1.5 text-[12px] sm:py-2 sm:text-base ${!day
                              ? 'cursor-default text-slate-300'
                              : isBulkDayInDraftRange(day)
                                ? 'bg-orange-500 font-semibold text-white'
                              : day === todayDate.getDate() && bulkDatePanelMonth === todayDate.getMonth() && bulkDatePanelYear === todayDate.getFullYear()
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            {day || ''}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-4 px-1 pb-1 text-xs sm:text-sm">
                        <button type="button" className="text-slate-700" onClick={() => setBulkDatePanelOpen(false)}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="rounded-md bg-orange-500 px-3 py-1.5 text-white sm:px-4 sm:py-2"
                          onClick={handleBulkDatePanelUpdate}
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div ref={bulkSourceMenuRef} className="relative">
                    {bulkSource === 'custom-number' ? (
                      <input
                        type="text"
                        value={bulkCustomNumber}
                        onChange={(event) => setBulkCustomNumber(event.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-12 text-sm outline-none focus:border-orange-400"
                        placeholder="01XXXXXXXXX"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBulkSourceMenuOpen((prev) => !prev)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-12 text-left text-sm font-medium text-slate-600 outline-none transition hover:border-slate-400"
                      >
                        {selectedBulkSourceOption?.label || 'Select Custom Bulk SMS Source'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setBulkSourceMenuOpen((prev) => !prev)}
                      className="absolute right-0 top-0 grid h-full w-11 place-items-center text-slate-500 transition hover:text-slate-700"
                      aria-label="Toggle source options"
                    >
                      <ChevronDown className={`h-6 w-6 transition ${bulkSourceMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {bulkSourceMenuOpen ? (
                      <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                        {BULK_SOURCE_OPTIONS.map((option) => (
                          <button
                            key={`bulk-source-${option.value}`}
                            type="button"
                            onClick={() => {
                              setBulkSource(option.value);
                              if (option.value !== 'custom-number') {
                                setBulkCustomNumber('');
                              }
                              setBulkSourceMenuOpen(false);
                            }}
                            className={`block w-full border-b border-slate-100 px-4 py-2 text-left text-[15px] font-bold transition last:border-b-0 hover:bg-slate-50 ${option.toneClass}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Message</span>
                  <textarea
                    rows={4}
                    value={bulkMessage}
                    onChange={(event) => setBulkMessage(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    placeholder="Custom SMS body"
                  />
                </label>

                <button
                  type="button"
                  onClick={sendBulkSms}
                  disabled={sendingBulk || saving}
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                >
                  {sendingBulk ? 'Sending...' : 'Send Bulk SMS'}
                </button>

                {bulkResults.length > 0 ? (
                  <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Recipient</th>
                          <th className="px-3 py-2">State</th>
                          <th className="px-3 py-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResults.map((item) => (
                          <tr key={item.recipient} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-700">{item.recipient}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                                  item.state === 'done'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : item.state === 'deny'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {item.state}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500">{item.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
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
