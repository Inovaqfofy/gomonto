import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Globe } from "lucide-react";
import { languages, type LanguageCode } from "@/i18n/config";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (langCode: LanguageCode) => {
    i18n.changeLanguage(langCode);
    
    // Get current path without language prefix
    const pathParts = location.pathname.split('/').filter(Boolean);
    const currentLangInPath = languages.find(l => l.code === pathParts[0]);
    
    let pathWithoutLang: string;
    if (currentLangInPath) {
      // Remove existing language prefix
      pathWithoutLang = '/' + pathParts.slice(1).join('/') || '/';
    } else {
      pathWithoutLang = location.pathname;
    }
    
    // Build new path with language prefix
    let newPath: string;
    if (langCode === 'fr') {
      // French is default, no prefix
      newPath = pathWithoutLang;
    } else {
      // Add language prefix for EN/PT
      newPath = `/${langCode}${pathWithoutLang === '/' ? '' : pathWithoutLang}`;
    }
    
    navigate(newPath + location.search, { replace: true });
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        aria-label="Changer de langue"
      >
        <Globe className="w-4 h-4" />
        <span className="text-base">{currentLanguage.flag}</span>
        <span className="hidden lg:inline">{currentLanguage.code.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 py-2 glass rounded-xl shadow-soft-xl border border-border animate-fade-in z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors ${
                i18n.language === lang.code ? 'text-primary font-medium bg-primary/5' : 'text-foreground'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
              {i18n.language === lang.code && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
          
          {/* Regional flags info */}
          <div className="mt-2 pt-2 border-t border-border mx-3">
            <p className="text-xs text-muted-foreground px-1">
              🇨🇮 🇬🇼 UEMOA
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
