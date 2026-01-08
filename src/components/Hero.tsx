import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SearchBar from "./SearchBar";
import { Globe, Car, Key } from "lucide-react";

const Hero = () => {
  const { t } = useTranslation();

  const uemoaCountries = [
    { code: "BJ", flag: "🇧🇯", nameKey: "countries.benin" },
    { code: "TG", flag: "🇹🇬", nameKey: "countries.togo" },
    { code: "SN", flag: "🇸🇳", nameKey: "countries.senegal" },
    { code: "CI", flag: "🇨🇮", nameKey: "countries.ivoryCoast" },
    { code: "BF", flag: "🇧🇫", nameKey: "countries.burkinaFaso" },
    { code: "ML", flag: "🇲🇱", nameKey: "countries.mali" },
    { code: "NE", flag: "🇳🇪", nameKey: "countries.niger" },
    { code: "GW", flag: "🇬🇼", nameKey: "countries.guineaBissau" }];

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-32 md:pb-20 overflow-hidden pattern-afro">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-secondary/15 to-transparent rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl" />
        
        {/* Stylized UEMOA Map Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
          <svg viewBox="0 0 400 400" className="w-[800px] h-[800px]">
            {/* Simplified West Africa outline */}
            <path
              d="M50,150 Q80,100 150,90 Q200,85 250,95 Q300,105 340,130 Q360,160 350,200 Q340,240 300,270 Q250,300 180,310 Q120,315 80,290 Q50,260 45,210 Q40,170 50,150"
              fill="currentColor"
              className="text-primary"
            />
            {/* Connection dots for major cities */}
            <circle cx="120" cy="180" r="8" fill="currentColor" className="text-secondary" />
            <circle cx="200" cy="150" r="8" fill="currentColor" className="text-secondary" />
            <circle cx="280" cy="180" r="8" fill="currentColor" className="text-secondary" />
            <circle cx="160" cy="220" r="8" fill="currentColor" className="text-secondary" />
            <circle cx="240" cy="220" r="8" fill="currentColor" className="text-secondary" />
            {/* Connection lines */}
            <line x1="120" y1="180" x2="200" y2="150" stroke="currentColor" strokeWidth="2" className="text-primary/50" />
            <line x1="200" y1="150" x2="280" y2="180" stroke="currentColor" strokeWidth="2" className="text-primary/50" />
            <line x1="120" y1="180" x2="160" y2="220" stroke="currentColor" strokeWidth="2" className="text-primary/50" />
            <line x1="160" y1="220" x2="240" y2="220" stroke="currentColor" strokeWidth="2" className="text-primary/50" />
            <line x1="240" y1="220" x2="280" y2="180" stroke="currentColor" strokeWidth="2" className="text-primary/50" />
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Hero Content */}
        <div className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card shadow-soft-md border border-border mb-8 animate-fade-in">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {t("hero.badge")}
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-6 animate-fade-in text-foreground" style={{ animationDelay: '0.1s' }}>
            <span className="gradient-text">{t("hero.title1")}</span>{" "}
            <span className="text-foreground">{t("hero.title2")}</span>{" "}
            <span className="gradient-text">{t("hero.title3")}</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <span className="font-semibold text-foreground">{t("hero.subtitle.renters")}</span> : {t("hero.subtitle.rentersText")}{" "}
            <span className="font-semibold text-foreground">{t("hero.subtitle.owners")}</span> : {t("hero.subtitle.ownersText")}
          </p>

          {/* Dual-Path CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <Link
              to="/vehicules"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Car className="w-5 h-5" />
              {t("hero.cta.findVehicle")}
            </Link>
            <Link
              to="/devenir-loueur"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-card border-2 border-primary text-primary font-semibold text-lg shadow-soft-md hover:bg-primary hover:text-primary-foreground hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Key className="w-5 h-5" />
              {t("hero.cta.publishFleet")}
            </Link>
          </div>

          {/* Country Flags */}
          <div className="flex flex-wrap justify-center gap-2 mt-6 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            {uemoaCountries.map((country, index) => (
              <div
                key={country.code}
                className="glass px-3 py-1.5 rounded-full flex items-center gap-2 hover:scale-105 transition-transform cursor-default"
                title={t(country.nameKey)}
                style={{ animationDelay: `${0.3 + index * 0.05}s` }}
              >
                <span className="text-lg">{country.flag}</span>
                <span className="text-xs font-medium text-muted-foreground hidden sm:inline">{t(country.nameKey)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search Bar - Central Element */}
        <div className="max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <SearchBar />
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-12 mt-16 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          {[
            { value: "8", labelKey: "hero.stats.countries", color: "primary" },
            { value: "2K+", labelKey: "hero.stats.vehicles", color: "secondary" },
            { value: "15K+", labelKey: "hero.stats.rentals", color: "accent" },
            { value: "4.8", labelKey: "hero.stats.rating", color: "primary" }].map((stat, index) => (
            <div 
              key={stat.labelKey}
              className="stat-card min-w-[100px]"
              style={{ animationDelay: `${0.6 + index * 0.1}s` }}
            >
              <div className={`text-3xl md:text-4xl font-extrabold gradient-text mb-1`}>
                {stat.value}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                {t(stat.labelKey)}
              </div>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center items-center gap-4 mt-12 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {t("hero.trust.payment")}
          </div>
          <div className="w-1 h-1 rounded-full bg-border hidden md:block" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {t("hero.trust.verified")}
          </div>
          <div className="w-1 h-1 rounded-full bg-border hidden md:block" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            {t("hero.trust.support")}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
