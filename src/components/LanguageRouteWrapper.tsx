import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { languages } from "@/i18n/config";

interface LanguageRouteWrapperProps {
  children: ReactNode;
}

const LanguageRouteWrapper = ({ children }: LanguageRouteWrapperProps) => {
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    // Extract language from path
    const pathParts = location.pathname.split('/').filter(Boolean);
    const firstPart = pathParts[0];
    
    // Check if first part is a valid language code
    const validLang = languages.find(l => l.code === firstPart);
    
    if (validLang) {
      // Valid language in URL - set it
      if (i18n.language !== validLang.code) {
        i18n.changeLanguage(validLang.code);
      }
    } else {
      // No language prefix - use French (default)
      if (i18n.language !== 'fr') {
        i18n.changeLanguage('fr');
      }
    }
  }, [location.pathname, i18n]);

  return <>{children}</>;
};

export default LanguageRouteWrapper;
