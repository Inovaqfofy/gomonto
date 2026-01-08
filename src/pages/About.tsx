import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Globe, Users, Target, Heart, Zap, MapPin, Mail, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

const About = () => {
  const { t } = useTranslation();

  const stats = [
    { value: "8", labelKey: "pages.about.stats.countries" },
    { value: "1000+", labelKey: "pages.about.stats.vehicles" },
    { value: "5000+", labelKey: "pages.about.stats.users" },
    { value: "99%", labelKey: "pages.about.stats.satisfaction" }];

  const values = [
    {
      icon: Heart,
      titleKey: "pages.about.trust",
      descKey: "pages.about.trustDesc",
    },
    {
      icon: Zap,
      titleKey: "pages.about.innovation",
      descKey: "pages.about.innovationDesc",
    },
    {
      icon: Users,
      titleKey: "pages.about.community",
      descKey: "pages.about.communityDesc",
    },
    {
      icon: Target,
      titleKey: "pages.about.excellence",
      descKey: "pages.about.excellenceDesc",
    }];

  const countries = [
    { nameKey: "countries.senegal", flag: "🇸🇳", city: "Dakar" },
    { nameKey: "countries.cote_ivoire", flag: "🇨🇮", city: "Abidjan" },
    { nameKey: "countries.mali", flag: "🇲🇱", city: "Bamako" },
    { nameKey: "countries.burkina_faso", flag: "🇧🇫", city: "Ouagadougou" },
    { nameKey: "countries.niger", flag: "🇳🇪", city: "Niamey" },
    { nameKey: "countries.togo", flag: "🇹🇬", city: "Lomé" },
    { nameKey: "countries.benin", flag: "🇧🇯", city: "Cotonou" },
    { nameKey: "countries.guinee_bissau", flag: "🇬🇼", city: "Bissau" }];

  return (
    <>
      <Helmet>
        <title>À Propos de GoMonto | Location de Véhicules Afrique de l'Ouest | UEMOA</title>
        <meta name="description" content="Découvrez GoMonto, la plateforme N°1 de location de véhicules en Afrique de l'Ouest. Présent dans 8 pays UEMOA : Côte d'Ivoire, Sénégal, Mali, Burkina Faso, Bénin, Togo, Niger, Guinée-Bissau." />
        <meta name="keywords" content="GoMonto entreprise, location voiture Afrique, UEMOA location, histoire GoMonto, équipe GoMonto, présence Afrique Ouest" />
        <link rel="canonical" href="https://gomonto.com/a-propos" />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        
        <main className="pt-24 pb-32 md:pb-16">
          <section className="py-12 md:py-20">
            <div className="container mx-auto px-4">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  {t("pages.about.heroTitle")} <span className="gradient-text">{t("pages.about.heroHighlight")}</span>
                </h1>
                <p className="text-lg text-muted-foreground">
                  {t("pages.about.heroSubtitle")}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
                {stats.map((stat) => (
                  <div key={stat.labelKey} className="glass-card p-6 text-center">
                    <div className="text-3xl md:text-4xl font-black gradient-text mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">{t(stat.labelKey)}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="w-8 h-8 text-primary" />
                  <h2 className="text-2xl md:text-3xl font-bold">{t("pages.about.ourHistory")}</h2>
                </div>
                
                <div className="space-y-4 text-muted-foreground">
                  <p>{t("pages.about.historyP1")}</p>
                  <p>{t("pages.about.historyP2")}</p>
                  <p>{t("pages.about.historyP3")}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("pages.about.ourValues")}</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {t("pages.about.valuesSubtitle")}
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {values.map((value) => (
                  <div key={value.titleKey} className="glass-card p-6 text-center hover-lift">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{t(value.titleKey)}</h3>
                    <p className="text-muted-foreground text-sm">{t(value.descKey)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 bg-primary/5">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Globe className="w-8 h-8 text-primary" />
                  <h2 className="text-2xl md:text-3xl font-bold">{t("pages.about.ourPresence")}</h2>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {t("pages.about.presenceSubtitle")}
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {countries.map((country) => (
                  <div key={country.nameKey} className="glass-card p-4 flex items-center gap-3">
                    <span className="text-3xl">{country.flag}</span>
                    <div>
                      <div className="font-semibold">{t(country.nameKey)}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {country.city}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
                  {t("pages.about.legalInfo")}
                </h2>
                
                <div className="glass-card p-6 md:p-8 space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{t("pages.about.platformEditor")}</h3>
                    <p className="text-muted-foreground">
                      {t("pages.about.platformEditorText")}
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">{t("pages.about.rccm")}</h4>
                      <p className="text-muted-foreground">CI-ABJ-03-2023-B13-03481</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">{t("pages.about.headquarters")}</h4>
                      <p className="text-muted-foreground">27 BP 148 Abidjan 27, Côte d'Ivoire</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <a 
                      href="tel:+2250701238974" 
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="w-4 h-4" />
                      +225 07 01 23 89 74
                    </a>
                    <a 
                      href="mailto:contact@gomonto.com" 
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      contact@gomonto.com
                    </a>
                  </div>
                  
                  <div className="pt-4 border-t border-border">
                    <Link to="/legal" className="text-primary hover:underline font-medium">
                      {t("pages.about.seeFullLegal")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="glass-card p-8 md:p-12 text-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  {t("pages.about.ctaTitle")}
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto mb-8">
                  {t("pages.about.ctaSubtitle")}
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/vehicules">
                    <Button size="lg" className="btn-primary-glow px-8">
                      <span className="relative z-10">{t("pages.about.exploreVehicles")}</span>
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="lg" variant="outline" className="px-8">
                      {t("pages.about.createAccount")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
        <MobileTabBar />
      </div>
    </>
  );
};

export default About;