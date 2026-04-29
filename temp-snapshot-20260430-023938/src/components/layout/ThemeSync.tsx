'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme';

export function ThemeSync() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }, [theme]);

  return null;
}