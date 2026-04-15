'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Send, AlertCircle } from 'lucide-react';
import { useToastContext } from '@/components/ui/ToastProvider';
import { CommunicationRole, NotificationAudience, useCommunicationStore } from '@/store/communication';
import { useThemeStore } from '@/store/theme';

interface HeaderNotificationsProps {
  role: CommunicationRole;
}

function formatTimeLabel(isoString: string) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function HeaderNotifications({ role }: HeaderNotificationsProps) {
  const { showToast } = useToastContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const notifications = useCommunicationStore((state) => state.notifications);
  const sendNotification = useCommunicationStore((state) => state.sendNotification);
  const markNotificationsRead = useCommunicationStore((state) => state.markNotificationsRead);

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (role === 'admin') {
          return notification.audience === 'admin' || notification.audience === 'all';
        }

        return notification.audience === 'seller' || notification.audience === 'all';
      }),
    [notifications, role]
  );

  const unreadNotifications = useMemo(
    () =>
      visibleNotifications.filter((notification) =>
        role === 'admin' ? !notification.readByAdmin : !notification.readBySeller
      ),
    [role, visibleNotifications]
  );

  useEffect(() => {
    if (open) {
      markNotificationsRead(role);
    }
  }, [markNotificationsRead, open, role]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const unreadCount = unreadNotifications.length;

  const handleSendNotification = () => {
    const title = notificationTitle.trim();
    const message = notificationMessage.trim();

    if (!title || !message) {
      showToast('Notification title and message are required.', { title: 'Missing fields', variant: 'warning' });
      return;
    }

    sendNotification({
      title,
      message,
      audience: 'seller' as NotificationAudience,
    });

    setNotificationTitle('');
    setNotificationMessage('');
    showToast('Notification sent to sellers.', { title: 'Notification sent', variant: 'success' });
    setOpen(true);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative grid h-10 w-10 place-items-center rounded-full transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
        aria-label="Notifications"
      >
        <Bell className={`h-5 w-5 ${isDark ? 'text-slate-200' : 'text-slate-600'}`} />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 min-w-4 rounded-full bg-orange-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className={`fixed left-2 right-2 top-[72px] z-50 overflow-hidden rounded-2xl border backdrop-blur-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[min(92vw,24rem)] sm:max-w-[calc(100vw-1rem)] ${isDark ? 'border-white/10 bg-slate-900/96 shadow-[0_24px_60px_rgba(2,6,23,0.45)]' : 'border-slate-200 bg-white/98 shadow-[0_24px_60px_rgba(2,6,23,0.16)]'}`}>
          <div className={`border-b px-4 py-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Notifications</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{role === 'admin' ? 'Admin inbox and seller notifications' : 'Latest updates from admin'}</p>
              </div>
              {unreadCount > 0 ? <span className="rounded-full bg-orange-500/15 px-2 py-1 text-xs font-semibold text-orange-600 dark:text-orange-200">{unreadCount} new</span> : null}
            </div>
          </div>

          <div className={`max-h-72 overflow-y-auto px-4 py-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            {visibleNotifications.length > 0 ? (
              <div className="space-y-2">
                {visibleNotifications.slice(0, 5).map((notification) => {
                  const unread = role === 'admin' ? !notification.readByAdmin : !notification.readBySeller;
                  return (
                    <div
                      key={notification.id}
                      className={`rounded-xl border p-3 ${unread ? (isDark ? 'border-orange-400/20 bg-orange-400/10' : 'border-orange-200 bg-orange-50/80') : (isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50')}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-200">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{notification.title}</p>
                            <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{formatTimeLabel(notification.createdAt)}</span>
                          </div>
                          <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{notification.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`rounded-xl border border-dashed p-4 text-center text-sm ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                No notifications yet.
              </div>
            )}
          </div>

          {role === 'admin' ? (
            <div className={`border-t px-4 py-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50/70'}`}>
              <p className={`mb-3 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Send notification to sellers</p>
              <div className="space-y-2">
                <input
                  value={notificationTitle}
                  onChange={(event) => setNotificationTitle(event.target.value)}
                  placeholder="Notification title"
                  className={`w-full rounded-xl border px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-orange-400 ${isDark ? 'border-white/10 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
                />
                <textarea
                  value={notificationMessage}
                  onChange={(event) => setNotificationMessage(event.target.value)}
                  placeholder="Write message for sellers"
                  rows={3}
                  className={`w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-orange-400 ${isDark ? 'border-white/10 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
                />
                <button
                  type="button"
                  onClick={handleSendNotification}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  <Send className="h-4 w-4" />
                  Send to sellers
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}