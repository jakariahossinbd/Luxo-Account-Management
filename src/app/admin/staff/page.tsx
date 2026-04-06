'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/store/language';
import { t } from '@/lib/i18n';

type StaffMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  employee: { designation: string } | null;
  attendances: Array<{ status: string; checkInTime: string; checkOutTime: string }>;
};

type LeaveRequest = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  user: { name: string; role: string };
};

export default function AdminStaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { language } = useLanguageStore();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'staff' | 'leaves'>('staff');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
    } else if ((session.user as any)?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      const [staffRes, leavesRes] = await Promise.all([
        fetch('/api/admin/staff'),
        fetch('/api/admin/leaves')
      ]);
      const staffData = await staffRes.json();
      const leavesData = await leavesRes.json();
      
      if (staffData.success) setStaff(staffData.data.staff);
      if (leavesData.success) setLeaves(leavesData.data.leaves);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/admin/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: action })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '20px' }}>{t('messages.loadingData', language)}</div>;
  }

  const getStatusColor = (s: string) => {
    if (s === 'CHECKED_IN') return '#22c55e';
    if (s === 'ON_BREAK') return '#f59e0b';
    if (s === 'CHECKED_OUT') return '#6b7280';
    return '#ef4444';
  };

  const getStatusLabel = (s: string) => {
    if (s === 'CHECKED_IN') return t('admin.staff.status.checkedIn', language);
    if (s === 'ON_BREAK') return t('admin.staff.status.onBreak', language);
    if (s === 'CHECKED_OUT') return t('admin.staff.status.checkedOut', language);
    if (s === 'ABSENT') return t('admin.staff.status.absent', language);
    if (s === 'PENDING') return t('admin.staff.status.pending', language);
    if (s === 'APPROVED') return t('admin.staff.status.approved', language);
    if (s === 'REJECTED') return t('admin.staff.status.rejected', language);
    return s;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ background: '#dc2626', color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>{t('admin.staff.managementTitle', language)}</h1>
        <button onClick={() => router.push('/admin')} style={{ marginTop: '10px', padding: '8px 16px', background: 'white', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>← {t('admin.staff.backToAdmin', language)}</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('staff')} style={{ padding: '12px 24px', background: activeTab === 'staff' ? '#2563eb' : 'white', color: activeTab === 'staff' ? 'white' : '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>{t('admin.staff.staffList', language)} ({staff.length})</button>
        <button onClick={() => setActiveTab('leaves')} style={{ padding: '12px 24px', background: activeTab === 'leaves' ? '#2563eb' : 'white', color: activeTab === 'leaves' ? 'white' : '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>{t('admin.staff.leaveRequests', language)} ({leaves.filter(l => l.status === 'PENDING').length})</button>
      </div>

      {activeTab === 'staff' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h2>{t('admin.staff.attendanceToday', language)}</h2>
          {staff.length === 0 ? (
            <p>{t('admin.staff.noStaffFound', language)}</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {staff.map(s => (
                <div key={s.id} style={{ padding: '15px', background: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{s.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{s.role} | {s.employee?.designation || t('admin.staff.staffLabel', language)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ padding: '6px 12px', borderRadius: '20px', background: getStatusColor(s.attendances[0]?.status || 'ABSENT') + '20', color: getStatusColor(s.attendances[0]?.status || 'ABSENT'), fontSize: '12px', fontWeight: 'bold' }}>
                      {getStatusLabel(s.attendances[0]?.status || 'ABSENT')}
                    </span>
                    {s.attendances[0]?.checkInTime && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        {t('admin.staff.checkInLabel', language)}: {new Date(s.attendances[0].checkInTime).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaves' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h2>{t('admin.staff.leaveRequests', language)}</h2>
          {leaves.filter(l => l.status === 'PENDING').length === 0 ? (
            <p>{t('admin.staff.noPendingLeaveRequests', language)}</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {leaves.filter(l => l.status === 'PENDING').map(l => (
                <div key={l.id} style={{ padding: '15px', background: '#fef3c7', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>{l.user.name}</strong>
                    <span style={{ background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{l.leaveType}</span>
                  </div>
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>{l.reason}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                    {new Date(l.startDate).toLocaleDateString('en-BD')} - {new Date(l.endDate).toLocaleDateString('en-BD')} ({l.days} {l.days > 1 ? t('admin.staff.daysPlural', language) : t('admin.staff.daySingular', language)})
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleLeave(l.id, 'APPROVED')} style={{ padding: '8px 16px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{t('admin.staff.approve', language)}</button>
                    <button onClick={() => handleLeave(l.id, 'REJECTED')} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{t('admin.staff.reject', language)}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <h3 style={{ marginTop: '20px' }}>{t('admin.staff.pastLeaveRequests', language)}</h3>
          {leaves.filter(l => l.status !== 'PENDING').map(l => (
            <div key={l.id} style={{ padding: '10px', background: '#f9fafb', borderRadius: '4px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{l.user.name} - {l.leaveType}</span>
              <span style={{ color: l.status === 'APPROVED' ? '#22c55e' : '#ef4444' }}>{getStatusLabel(l.status)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}