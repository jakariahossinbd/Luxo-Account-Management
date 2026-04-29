'use client';

import { useEffect } from 'react';
import { useLanguageStore } from '@/store/language';

export function LanguageSync() {
  const language = useLanguageStore((state) => state.language);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.language = language;
    root.lang = language === 'bn' ? 'bn' : 'en';
    document.body.dataset.language = language;
  }, [language]);

  return null;
}