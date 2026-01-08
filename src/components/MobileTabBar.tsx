import { Home, Search, Heart, User, PlusCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const MobileTabBar = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const tabs = [
    { icon: Home, labelKey: "nav.home", href: "/" },
    { icon: Search, labelKey: "nav.vehicles", href: "/vehicules" },
    { icon: PlusCircle, labelKey: "nav.publish", href: "/dashboard", featured: true },
    { icon: Heart, labelKey: "nav.favorites", href: "/vehicules" },
    { icon: User, labelKey: "nav.profile", href: "/auth" }];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-nav border-t border-glass-border safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          
          return (
            <Link
              key={tab.labelKey}
              to={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                tab.featured ? "relative" : ""
              }`}
            >
              {tab.featured ? (
                <div className="absolute -top-5 btn-primary-glow w-14 h-14 rounded-full flex items-center justify-center shadow-lg">
                  <tab.icon className="w-6 h-6 text-primary-foreground" />
                </div>
              ) : (
                <>
                  <tab.icon
                    className={`w-5 h-5 mb-1 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      isActive ? "text-primary font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {t(tab.labelKey)}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileTabBar;
