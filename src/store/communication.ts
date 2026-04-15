import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type CommunicationRole = 'admin' | 'seller';

export type NotificationAudience = 'all' | 'admin' | 'seller';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  audience: NotificationAudience;
  createdAt: string;
  readByAdmin: boolean;
  readBySeller: boolean;
}

export interface ChatMessage {
  id: string;
  senderRole: CommunicationRole;
  senderName: string;
  senderId: string;
  recipientId: string;
  message: string;
  attachment?: {
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  };
  createdAt: string;
  readByAdmin: boolean;
  readBySeller: boolean;
}

export interface StockNoteItem {
  id: string;
  productCode: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  sellerId: string;
  sellerName: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  clearedAt: string | null;
  clearedBy: CommunicationRole | null;
}

interface CreateNotificationInput {
  title: string;
  message: string;
  audience?: NotificationAudience;
}

interface SendChatMessageInput {
  senderRole: CommunicationRole;
  senderName: string;
  senderId: string;
  recipientId: string;
  message: string;
  attachment?: {
    name: string;
    type: string;
    size: number;
    dataUrl: string;
  };
}

interface UpsertStockNoteInput {
  productCode: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  sellerId: string;
  sellerName: string;
  note: string;
}

interface ClearStockNoteInput {
  productCode: string;
  clearedBy: CommunicationRole;
}

interface CommunicationState {
  notifications: NotificationItem[];
  chatMessages: ChatMessage[];
  stockNotes: StockNoteItem[];
  sendNotification: (input: CreateNotificationInput) => void;
  markNotificationsRead: (role: CommunicationRole) => void;
  sendChatMessage: (input: SendChatMessageInput) => void;
  markChatRead: (role: CommunicationRole) => void;
  markAdminThreadRead: (sellerIds: string[]) => void;
  upsertStockNote: (input: UpsertStockNoteInput) => void;
  clearStockNote: (input: ClearStockNoteInput) => void;
}

export const communicationStorageKey = 'luxo-communication-state';

function createId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export const useCommunicationStore = create<CommunicationState>()(
  persist(
    (set) => ({
      notifications: [],
      chatMessages: [],
      stockNotes: [],
      sendNotification: ({ title, message, audience = 'seller' }) => {
        const notification: NotificationItem = {
          id: createId(),
          title,
          message,
          audience,
          createdAt: new Date().toISOString(),
          readByAdmin: audience === 'seller',
          readBySeller: audience === 'admin',
        };

        set((state) => ({ notifications: [notification, ...state.notifications] }));
      },
      markNotificationsRead: (role) => {
        set((state) => ({
          notifications: state.notifications.map((notification) => {
            if (role === 'admin') {
              return { ...notification, readByAdmin: true };
            }

            return { ...notification, readBySeller: true };
          }),
        }));
      },
      upsertStockNote: ({ productCode, productName, categoryId, categoryName, sellerId, sellerName, note }) => {
        const trimmedNote = note.trim();
        if (!trimmedNote) return;

        const timestamp = new Date().toISOString();

        set((state) => {
          const existingIndex = state.stockNotes.findIndex((item) => item.productCode === productCode);
          const nextNote: StockNoteItem = existingIndex >= 0
            ? {
                ...state.stockNotes[existingIndex],
                productName,
                categoryId,
                categoryName,
                sellerId,
                sellerName,
                note: trimmedNote,
                updatedAt: timestamp,
                clearedAt: null,
                clearedBy: null,
              }
            : {
                id: createId(),
                productCode,
                productName,
                categoryId,
                categoryName,
                sellerId,
                sellerName,
                note: trimmedNote,
                createdAt: timestamp,
                updatedAt: timestamp,
                clearedAt: null,
                clearedBy: null,
              };

          const nextStockNotes = [...state.stockNotes];
          if (existingIndex >= 0) {
            nextStockNotes[existingIndex] = nextNote;
          } else {
            nextStockNotes.unshift(nextNote);
          }

          return { stockNotes: nextStockNotes };
        });
      },
      clearStockNote: ({ productCode, clearedBy }) => {
        set((state) => ({
          stockNotes: state.stockNotes.map((item) => {
            if (item.productCode !== productCode || item.clearedAt) {
              return item;
            }

            return {
              ...item,
              clearedAt: new Date().toISOString(),
              clearedBy,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },
      sendChatMessage: ({ senderRole, senderName, senderId, recipientId, message, attachment }) => {
        const chatMessage: ChatMessage = {
          id: createId(),
          senderRole,
          senderName,
          senderId: senderId,
          recipientId,
          message,
          attachment,
          createdAt: new Date().toISOString(),
          readByAdmin: senderRole === 'admin',
          readBySeller: senderRole === 'seller',
        };

        set((state) => ({ chatMessages: [...state.chatMessages, chatMessage] }));
      },
      markChatRead: (role) => {
        set((state) => ({
          chatMessages: state.chatMessages.map((message) => {
            if (role === 'admin') {
              return { ...message, readByAdmin: true };
            }

            return { ...message, readBySeller: true };
          }),
        }));
      },
      markAdminThreadRead: (sellerIds) => {
        if (sellerIds.length === 0) return;

        set((state) => ({
          chatMessages: state.chatMessages.map((message) => {
            if (message.senderRole === 'seller' && sellerIds.includes(message.senderId)) {
              return { ...message, readByAdmin: true };
            }

            return message;
          }),
        }));
      },
    }),
    {
      name: communicationStorageKey,
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
    }
  )
);