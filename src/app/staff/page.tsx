'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Attendance = {
  id: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  totalHours: number;
};

type Activity = {
  id: string;
  activity: string;
  notes: string | null;
  duration: number | null;
  status: string;
  createdAt: string;
};

type LeaveStats = {
  pending: number;
  approved: number;
  rejected: number;
};

export default function StaffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leaveStats, setLeaveStats] = useState<LeaveStats>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'activities'>('attendance');
  const [newActivity, setNewActivity] = useState({ activity: '', notes: '', duration: 30 });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
    } else {
      const role = (session.user as any)?.role;
      if (role !== 'SELLER' && role !== 'MARKETING') {
        router.push('/');
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      const [attRes, actRes, leaveRes] = await Promise.all([
        fetch('/api/staff/attendance'),
        fetch('/api/staff/activities'),
        fetch('/api/staff/leaves')
      ]);
      
      const attData = await attRes.json();
      const actData = await actRes.json();
      const leaveData = await leaveRes.json();
      
      if (attData.success) setAttendance(attData.data.today);
      if (actData.success) setActivities(actData.data.activities);
      if (leaveData.success) setLeaveStats(leaveData.data.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = async (action: string) => {
    try {
      const res = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/staff/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivity)
      });
      const data = await res.json();
      if (data.success) {
        setNewActivity({ activity: '', notes: '', duration: 30 });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  const isCheckedIn = attendance?.checkInTime && !attendance?.checkOutTime;
  const isOnBreak = attendance?.status === 'ON_BREAK';
  const roleColor = (session?.user as any)?.role === 'SELLER' ? '#2563eb' : '#8b5cf6';

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ background: roleColor, color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Staff Dashboard</h1>
        <p>Welcome, {(session?.user as any)?.name || 'Staff'}</p>
        <button onClick={() => router.push((session?.user as any)?.role === 'SELLER' ? '/seller' : '/marketing')} style={{ marginTop: '10px', padding: '8px 16px', background: 'white', color: roleColor, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>← Back to Dashboard</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('attendance')} style={{ padding: '12px 24px', background: activeTab === 'attendance' ? roleColor : 'white', color: activeTab === 'attendance' ? 'white' : '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>Attendance</button>
        <button onClick={() => setActiveTab('activities')} style={{ padding: '12px 24px', background: activeTab === 'activities' ? roleColor : 'white', color: activeTab === 'activities' ? 'white' : '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>Activities ({activities.length})</button>
      </div>

      {activeTab === 'attendance' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h2>Today's Attendance</h2>
          
          {!attendance?.checkInTime ? (
            <button onClick={() => handleAttendance('checkIn')} style={{ width: '100%', padding: '20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>☀️ Check In (Office In)</button>
          ) : !attendance?.checkOutTime ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <button onClick={() => handleAttendance(isOnBreak ? 'breakEnd' : 'breakStart')} style={{ padding: '15px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  {isOnBreak ? '▶ End Break' : '⏸ Start Break'}
                </button>
                <button onClick={() => handleAttendance('checkOut')} style={{ padding: '15px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  🌙 Check Out
                </button>
              </div>
              <div style={{ padding: '15px', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#22c55e', fontWeight: 'bold' }}>Checked In at {new Date(attendance.checkInTime).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}</div>
                {attendance.totalHours > 0 && <div style={{ color: '#666' }}>Total Hours: {attendance.totalHours}h</div>}
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '18px' }}>✓ Session Complete</div>
              <div style={{ color: '#666' }}>Total Hours: {attendance.totalHours}h</div>
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ padding: '15px', background: '#fef3c7', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{leaveStats.pending}</div>
              <div style={{ fontSize: '12px' }}>Pending Leave</div>
            </div>
            <div style={{ padding: '15px', background: '#dcfce7', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>{leaveStats.approved}</div>
              <div style={{ fontSize: '12px' }}>Approved</div>
            </div>
            <div style={{ padding: '15px', background: '#fee', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{leaveStats.rejected}</div>
              <div style={{ fontSize: '12px' }}>Rejected</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activities' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <h2>Daily Activities</h2>
          
          <form onSubmit={handleAddActivity} style={{ marginBottom: '20px', padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
            <input
              type="text"
              placeholder="What did you work on?"
              value={newActivity.activity}
              onChange={(e) => setNewActivity({ ...newActivity, activity: e.target.value })}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
              required
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Notes (optional)"
                value={newActivity.notes}
                onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
              />
              <input
                type="number"
                placeholder="Min"
                value={newActivity.duration}
                onChange={(e) => setNewActivity({ ...newActivity, duration: parseInt(e.target.value) || 0 })}
                style={{ width: '80px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
              />
            </div>
            <button type="submit" style={{ width: '100%', marginTop: '10px', padding: '12px', background: roleColor, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>+ Add Activity</button>
          </form>

          {activities.length === 0 ? (
            <p>No activities recorded today</p>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {activities.slice(0, 10).map(a => (
                <div key={a.id} style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{a.activity}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{a.notes} {a.duration ? `• ${a.duration} min` : ''}</div>
                  </div>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: a.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7', color: a.status === 'COMPLETED' ? '#22c55e' : '#f59e0b' }}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}