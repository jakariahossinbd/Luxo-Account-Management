'use client';

import { useEffect } from 'react';
import { communicationStorageKey, useCommunicationStore } from '@/store/communication';

export function CommunicationSync() {
  useEffect(() => {
    const rehydrate = () => {
      void useCommunicationStore.persist.rehydrate();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === communicationStorageKey) {
        rehydrate();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', rehydrate);
    rehydrate();

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', rehydrate);
    };
  }, []);

  return null;
}