'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Paperclip, Send, X } from 'lucide-react';
import { useToastContext } from '@/components/ui/ToastProvider';
import { CommunicationRole, useCommunicationStore } from '@/store/communication';
import { useThemeStore } from '@/store/theme';

interface SupportChatWidgetProps {
  role: CommunicationRole;
  displayName: string;
  senderId: string;
}

interface SellerThreadItem {
  id: string;
  name: string;
  email?: string;
  unreadCount: number;
  aliases: string[];
}

function formatMessageTime(isoString: string) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoString));
}

export function SupportChatWidget({ role, displayName, senderId }: SupportChatWidgetProps) {
  const { showToast } = useToastContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useThemeStore((state) => state.theme);
  const [open, setOpen] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [sellerThreads, setSellerThreads] = useState<SellerThreadItem[]>([]);
  const [sellerSearch, setSellerSearch] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [attachment, setAttachment] = useState<{
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  } | null>(null);

  const chatMessages = useCommunicationStore((state) => state.chatMessages);
  const sendChatMessage = useCommunicationStore((state) => state.sendChatMessage);
  const markChatRead = useCommunicationStore((state) => state.markChatRead);
  const markAdminThreadRead = useCommunicationStore((state) => state.markAdminThreadRead);

  useEffect(() => {
    if (role !== 'admin') return;

    let cancelled = false;

    async function loadSellers() {
      try {
        const response = await fetch('/api/admin/seller-manage?limit=1000', { cache: 'no-store' });
        if (!response.ok) return;

        const payload = await response.json();
        const sellers = Array.isArray(payload?.data) ? payload.data : [];

        const items: SellerThreadItem[] = sellers.map((seller: any) => {
          const aliases = [seller.employeeCode, seller.userId, seller.id].filter(Boolean) as string[];
          const sellerCode = aliases[0];
          const unreadCount = chatMessages.filter(
            (message) =>
              message.senderRole === 'seller' &&
              aliases.includes(message.senderId) &&
              !message.readByAdmin
          ).length;

          return {
            id: sellerCode,
            name: seller.name || seller.user?.name || sellerCode,
            email: seller.email || seller.user?.email || '',
            unreadCount,
            aliases,
          };
        });

        // Include seller threads that exist in chat history but are not present in the seller list alias map.
        const historyThreadsMap = new Map<string, SellerThreadItem>();
        items.forEach((item) => {
          item.aliases.forEach((alias) => {
            historyThreadsMap.set(alias, item);
          });
        });

        chatMessages
          .filter((message) => message.senderRole === 'seller')
          .forEach((message) => {
            if (historyThreadsMap.has(message.senderId)) return;

            const fallbackThread: SellerThreadItem = {
              id: message.senderId,
              name: message.senderName || `Seller ${message.senderId.slice(0, 6)}`,
              email: '',
              unreadCount: chatMessages.filter(
                (threadMessage) =>
                  threadMessage.senderRole === 'seller' &&
                  threadMessage.senderId === message.senderId &&
                  !threadMessage.readByAdmin
              ).length,
              aliases: [message.senderId],
            };

            items.push(fallbackThread);
            historyThreadsMap.set(message.senderId, fallbackThread);
          });

        if (!cancelled) {
          setSellerThreads(items);
          setSelectedSellerId((current) => {
            if (current && items.some((item) => item.id === current)) {
              return current;
            }

            const unreadThread = items.find((item) => item.unreadCount > 0);
            return unreadThread?.id || items[0]?.id || '';
          });
        }
      } catch {
        // Keep message-derived threads if seller fetch fails.
      }
    }

    void loadSellers();

    return () => {
      cancelled = true;
    };
  }, [chatMessages, role]);

  const unreadCount = useMemo(
    () =>
      chatMessages.filter((message) => {
        if (role === 'admin') {
          return message.senderRole === 'seller' && !message.readByAdmin;
        }

        return message.senderRole === 'admin' && message.recipientId === senderId && !message.readBySeller;
      }).length,
    [chatMessages, role]
  );

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const activeSellerId = role === 'admin' ? selectedSellerId : senderId;

  const activeThread = useMemo(
    () => (role === 'admin' ? sellerThreads.find((seller) => seller.id === activeSellerId) : undefined),
    [activeSellerId, role, sellerThreads]
  );

  const activeAliases = useMemo(
    () => (role === 'admin' ? activeThread?.aliases || (activeSellerId ? [activeSellerId] : []) : [senderId]),
    [activeSellerId, activeThread?.aliases, role, senderId]
  );

  useEffect(() => {
    if (!open) return;

    if (role === 'admin') {
      if (activeAliases.length > 0) {
        markAdminThreadRead(activeAliases);
      }
      return;
    }

    markChatRead(role);
  }, [activeAliases, markAdminThreadRead, markChatRead, open, role]);

  const threadMessages = useMemo(() => {
    return chatMessages.filter((message) => {
      if (role === 'admin') {
        return (
          (message.senderRole === 'seller' && activeAliases.includes(message.senderId)) ||
          (message.senderRole === 'admin' && activeAliases.includes(message.recipientId))
        );
      }

      return (
        (message.senderRole === 'seller' && message.senderId === senderId) ||
        (message.senderRole === 'admin' && message.recipientId === senderId)
      );
    });
  }, [activeAliases, chatMessages, role, senderId]);

  const filteredSellerThreads = useMemo(() => {
    if (role !== 'admin') return sellerThreads;

    const query = sellerSearch.trim().toLowerCase();
    const filtered = !query
      ? sellerThreads
      : sellerThreads.filter((seller) => {
          return (
            seller.name.toLowerCase().includes(query) ||
            seller.id.toLowerCase().includes(query) ||
            (seller.email || '').toLowerCase().includes(query)
          );
        });

    return [...filtered].sort((left, right) => {
      const leftUnread = left.unreadCount > 0;
      const rightUnread = right.unreadCount > 0;

      if (leftUnread !== rightUnread) {
        return leftUnread ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [role, sellerSearch, sellerThreads]);
  const isDark = theme === 'dark';

  const panelClass = isDark
    ? 'border-slate-800 bg-slate-900 text-slate-100 shadow-[0_24px_60px_rgba(2,6,23,0.45)]'
    : 'border-slate-200 bg-white text-slate-900 shadow-[0_24px_60px_rgba(2,6,23,0.16)]';

  const surfaceClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200';
  const inputShellClass = isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-200';
  const mutedTextClass = isDark ? 'text-slate-300' : 'text-slate-500';

  const isImageAttachment = attachment?.type.startsWith('image/');

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const handlePickAttachment = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Attachment size must be 2MB or smaller.', { title: 'File too large', variant: 'warning' });
      event.target.value = '';
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
      });
    } catch {
      showToast('Could not attach the selected file.', { title: 'Attachment error', variant: 'error' });
    } finally {
      event.target.value = '';
    }
  };

  const handleSendMessage = () => {
    const message = draftMessage.trim();
    if (!message && !attachment) {
      showToast('Type a message or add an attachment before sending.', { title: 'Empty chat', variant: 'warning' });
      return;
    }

    if (role === 'admin' && !activeSellerId) {
      showToast('Select a seller before sending a chat message.', { title: 'Seller not selected', variant: 'warning' });
      return;
    }

    sendChatMessage({
      senderRole: role,
      senderName: displayName,
      senderId,
      recipientId: role === 'admin' ? activeAliases[0] || activeSellerId : 'ADMIN',
      message,
      attachment: attachment || undefined,
    });

    setDraftMessage('');
    setAttachment(null);
    setOpen(true);
  };

  return (
    <div ref={rootRef} className="fixed bottom-28 right-4 z-40 flex flex-col items-end lg:right-8">
      {open ? (
        <div className={`mb-3 w-[min(92vw,22rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-3xl border ${panelClass}`}>
          <div className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Admin Chat</p>
              <p className={`text-xs ${mutedTextClass}`}>Connected as {displayName}</p>
              <p className={`text-[11px] font-medium ${mutedTextClass}`}>ID: {senderId}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`grid h-8 w-8 place-items-center rounded-full transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
              aria-label="Close chat"
            >
              <X className={`h-4 w-4 ${mutedTextClass}`} />
            </button>
          </div>

          <div className={`max-h-80 space-y-3 overflow-y-auto px-4 py-4 ${surfaceClass}`}>
            {role === 'admin' ? (
              <div className={`mb-3 rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>Seller Threads</p>
                  <span className={`text-[11px] ${mutedTextClass}`}>{sellerThreads.length} sellers</span>
                </div>

                <input
                  value={sellerSearch}
                  onChange={(event) => setSellerSearch(event.target.value)}
                  placeholder="Search seller name or ID"
                  className={`mb-2 w-full rounded-xl border px-3 py-2 text-sm outline-none placeholder:text-slate-400 ${isDark ? 'border-white/10 bg-slate-900 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-900'}`}
                />

                <div className="max-h-28 overflow-y-auto space-y-2 pr-1">
                  {filteredSellerThreads.length > 0 ? (
                    filteredSellerThreads.map((seller) => {
                      const active = seller.id === activeSellerId;
                      const hasUnread = seller.unreadCount > 0;
                      return (
                        <button
                          key={seller.id}
                          type="button"
                          onClick={() => setSelectedSellerId(seller.id)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${active ? 'border-orange-400 bg-orange-500/10' : isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'} ${hasUnread && !active ? (isDark ? 'ring-1 ring-orange-400/35 animate-pulse' : 'ring-1 ring-orange-300/60 animate-pulse') : ''}`}
                        >
                          <div className="min-w-0">
                            <p className={`truncate text-sm font-semibold ${active ? 'text-orange-600 dark:text-orange-200' : isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                              {seller.name}
                            </p>
                            <p className={`truncate text-[11px] ${mutedTextClass}`}>ID: {seller.id}{seller.email ? ` • ${seller.email}` : ''}</p>
                          </div>
                          {hasUnread ? (
                            <div className="ml-2 flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.16)] animate-ping" />
                              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold leading-none text-white">
                                {seller.unreadCount}
                              </span>
                            </div>
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <div className={`rounded-xl border border-dashed p-3 text-center text-xs ${isDark ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                      No seller threads found.
                    </div>
                  )}
                </div>

                {!activeSellerId ? (
                  <div className={`mt-3 rounded-xl border border-dashed p-3 text-center text-xs ${isDark ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    Select a seller to start chatting.
                  </div>
                ) : (
                  <p className={`mt-3 text-[11px] ${mutedTextClass}`}>Active seller ID: {activeSellerId}</p>
                )}
              </div>
            ) : null}

            {threadMessages.length > 0 ? (
              threadMessages.map((message) => {
                const isOwnMessage = message.senderRole === role;
                return (
                  <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isOwnMessage ? 'bg-orange-500 text-white' : (isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800')}`}>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] opacity-75">
                        {message.senderName}
                      </p>
                      <p className="mb-2 text-[10px] font-medium opacity-70">
                        {role === 'admin' ? `Seller ID: ${message.senderId}` : `ID: ${message.senderId}`}
                      </p>
                      <p>{message.message}</p>
                      {message.attachment ? (
                        <div className="mt-2">
                          {message.attachment.type.startsWith('image/') ? (
                            <a href={message.attachment.dataUrl} target="_blank" rel="noreferrer" className="block">
                              <img
                                src={message.attachment.dataUrl}
                                alt={message.attachment.name}
                                className="max-h-36 w-full rounded-xl object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              href={message.attachment.dataUrl}
                              download={message.attachment.name}
                              className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${isOwnMessage ? 'bg-white/20 text-white' : (isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700')}`}
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              {message.attachment.name}
                            </a>
                          )}
                        </div>
                      ) : null}
                      <p className="mt-1 text-[11px] opacity-70">{formatMessageTime(message.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={`rounded-2xl border border-dashed p-4 text-center text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}>
                {role === 'admin' ? 'Select a seller thread to start a conversation.' : 'Start a conversation with admin.'}
              </div>
            )}
          </div>

          <div className={`border-t px-4 py-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {attachment ? (
              <div className={`mb-2 rounded-xl border p-2 text-xs ${isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{attachment.name}</p>
                    <p className="text-[11px] opacity-70">{Math.ceil(attachment.size / 1024)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className={`rounded-md p-1 transition ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                    aria-label="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {isImageAttachment ? (
                  <img src={attachment.dataUrl} alt={attachment.name} className="mt-2 max-h-24 rounded-lg object-cover" />
                ) : null}
              </div>
            ) : null}
            <div className={`flex items-end gap-2 rounded-2xl border p-2 ${inputShellClass}`}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handlePickAttachment}
                className="hidden"
                aria-label="Attach file"
              />
              <textarea
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder="Type your message"
                rows={2}
                className={`min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${isDark ? 'text-slate-300 hover:bg-slate-700 hover:text-slate-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-white transition hover:bg-orange-600"
                aria-label="Send chat message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative grid h-16 w-16 place-items-center rounded-full bg-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition hover:scale-[1.02] dark:bg-slate-100 dark:shadow-[0_10px_24px_rgba(2,6,23,0.28)]"
        aria-label="Open chat"
      >
        <MessageSquare className="h-8 w-8 stroke-[2.1] text-slate-950" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 min-w-4 rounded-full bg-orange-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}