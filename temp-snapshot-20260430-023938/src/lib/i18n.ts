import en from './translations/en.json';
import bn from './translations/bn.json';

type Language = 'en' | 'bn';

const translations: Record<Language, Record<string, any>> = {
  en,
  bn,
};

function getNestedValue(
  obj: Record<string, any>,
  path: string
): string | undefined {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

export function t(key: string, language: Language = 'en'): string {
  const translation = getNestedValue(translations[language], key);

  if (!translation) {
    // Fallback to English if translation not found
    const fallback = getNestedValue(translations.en, key);
    return fallback || key;
  }

  return translation;
}

export const languages = {
  en: { code: 'en', name: 'English', label: 'EN' },
  bn: { code: 'bn', name: 'বাংলা', label: 'বাংলা' },
} as const;
