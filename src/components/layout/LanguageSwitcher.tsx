'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguageStore } from '@/store/language';
import { languages } from '@/lib/i18n';
import { Check, ChevronDown } from 'lucide-react';

const languageFlags: Record<'en' | 'bn', { src: string; alt: string }> = {
  en: { src: 'https://flagcdn.com/w40/us.png', alt: 'English flag' },
  bn: { src: 'https://flagcdn.com/w40/bd.png', alt: 'Bangla flag' },
};

export function LanguageSwitcher() {
  const { language, isMounted } = useTranslation();
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  if (!isMounted) return null;

  const currentLanguage = language as 'en' | 'bn';

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-gray-50"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <img
          src={languageFlags[currentLanguage].src}
          alt={languageFlags[currentLanguage].alt}
          className="h-4 w-6 rounded-[2px] border border-slate-200 object-cover"
        />
        <span className="text-xs font-semibold uppercase">{languages[currentLanguage].code}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-1.5 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {Object.entries(languages).map(([code, lang]) => {
            const key = code as 'en' | 'bn';
            const isActive = key === currentLanguage;

            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLanguage(key);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 ${isActive ? 'bg-slate-50' : ''}`}
                role="option"
                aria-selected={isActive}
              >
                <span className="flex items-center gap-2">
                  <img
                    src={languageFlags[key].src}
                    alt={languageFlags[key].alt}
                    className="h-4 w-6 rounded-[2px] border border-slate-200 object-cover"
                  />
                  <span className="font-medium text-slate-700">{lang.label}</span>
                </span>
                {isActive ? <Check className="h-4 w-4 text-blue-600" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
