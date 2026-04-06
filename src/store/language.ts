import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type Language = 'en' | 'bn';

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (lang: Language) => set({ language: lang }),
      toggleLanguage: () =>
        set((state) => ({
          language: state.language === 'en' ? 'bn' : 'en',
        })),
    }),
    {
      name: 'language-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
