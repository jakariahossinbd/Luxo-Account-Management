'use client';

import { useEffect, useState } from 'react';
import { useLanguageStore } from '@/store/language';
import { t } from '@/lib/i18n';

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const translate = (key: string): string => {
    return t(key, language);
  };

  return {
    t: translate,
    language,
    isMounted,
  };
}
