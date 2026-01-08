import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n/config';

export const useLanguageFromPath = () => {
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const langInPath = languages.find(l => l.code === pathParts[0]);
    
    if (langInPath && i18n.language !== langInPath.code) {
      i18n.changeLanguage(langInPath.code);
    } else if (!langInPath && i18n.language !== 'fr') {
      // Default to French if no language in path
      // Don't force change if user selected another language
    }
  }, [location.pathname, i18n]);

  // Return current language and path without language prefix
  const pathParts = location.pathname.split('/').filter(Boolean);
  const langInPath = languages.find(l => l.code === pathParts[0]);
  
  const pathWithoutLang = langInPath 
    ? '/' + pathParts.slice(1).join('/') || '/'
    : location.pathname;

  return {
    currentLanguage: i18n.language,
    pathWithoutLang,
    hasLangPrefix: !!langInPath,
  };
};

export const getLocalizedPath = (path: string, lang: string): string => {
  if (lang === 'fr') return path;
  return `/${lang}${path}`;
};
