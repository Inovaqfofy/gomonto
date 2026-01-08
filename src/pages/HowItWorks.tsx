import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, UserCheck, CreditCard, Car, Shield, Zap, Globe, Star, Users, CheckCircle, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

const HowItWorks = () => {
  const { t } = useTranslation();

  const steps = [
    {
      number: t("pages.howItWorks.step1.number"),
      icon: Search,
      titleKey: "pages.howItWorks.step1.title",
      descKey: "pages.howItWorks.step1.description",
      color: "primary",
    },
    {
      number: t("pages.howItWorks.step2.number"),
      icon: UserCheck,
      titleKey: "pages.howItWorks.step2.title",
      descKey: "pages.howItWorks.step2.description",
      color: "secondary",
    },
    {
      number: t("pages.howItWorks.step3.number"),
      icon: CreditCard,
      titleKey: "pages.howItWorks.step3.title",
      descKey: "pages.howItWorks.step3.description",
      color: "accent",
    },
    {
      number: t("pages.howItWorks.step4.number"),
      icon: Car,
      titleKey: "pages.howItWorks.step4.title",
      descKey: "pages.howItWorks.step4.description",
      color: "primary",
    }];

  const forRenters = [
    {
      icon: Shield,
      titleKey: "pages.howItWorks.verifiedVehicles",
      descKey: "pages.howItWorks.verifiedVehiclesDesc",
    },
    {
      icon: CreditCard,
      titleKey: "pages.howItWorks.securePayment",
      descKey: "pages.howItWorks.securePaymentDesc",
    },
    {
      icon: Star,
      titleKey: "pages.howItWorks.authenticReviews",
      descKey: "pages.howItWorks.authenticReviewsDesc",
    }];

  const forOwners = [
    {
      icon: Globe,
      titleKey: "pages.howItWorks.uemoaVisibility",
      descKey: "pages.howItWorks.uemoaVisibilityDesc",
    },
    {
      icon: Zap,
      titleKey: "pages.howItWorks.qualifiedBookings",
      descKey: "pages.howItWorks.qualifiedBookingsDesc",
    },
    {
      icon: Users,
      titleKey: "pages.howItWorks.simplifiedManagement",
      descKey: "pages.howItWorks.simplifiedManagementDesc",
    }];

  return (
    <>
      <Helmet>
        <title>Comment Louer une Voiture en Afrique de l'Ouest | Guide GoMonto</title>
        <meta name="description" content="Découvrez comment louer un véhicule facilement sur GoMonto. Réservation en 4 étapes simples, paiement Mobile Money sécurisé, véhicules vérifiés dans 8 pays UEMOA." />
        <meta name="keywords" content="comment louer voiture Afrique, location véhicule UEMOA, réserver voiture Abidjan, location simple Dakar, Mobile Money location" />
        <link rel="canonical" href="https://gomonto.com/fonctionnement" />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        
        <main className="pt-24 pb-32 md:pb-16">
          <section className="py-12 md:py-20">
            <div className="container mx-auto px-4">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">{t("pages.howItWorks.badge")}</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  {t("pages.howItWorks.heroTitle")} <span className="gradient-text">{t("pages.howItWorks.heroHighlight")}</span> ?
                </h1>
                <p className="text-lg text-muted-foreground">
                  {t("pages.howItWorks.heroSubtitle")}
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {steps.map((step, index) => (
                  <div 
                    key={step.number}
                    className="glass-card p-6 relative group hover-lift"
                  >
                    <div className="text-6xl font-black text-muted/20 absolute top-4 right-4">
                      {step.number}
                    </div>
                    <div className={`w-14 h-14 rounded-2xl bg-${step.color}/10 border border-${step.color}/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <step.icon className={`w-7 h-7 text-${step.color}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{t(step.titleKey)}</h3>
                    <p className="text-muted-foreground">{t(step.descKey)}</p>
                    
                    {index < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                        <ArrowRight className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Link to="/vehicules">
                  <Button size="lg" className="btn-primary-glow px-8">
                    <span className="relative z-10">{t("pages.howItWorks.seeVehicles")}</span>
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  {t("pages.howItWorks.forRentersSubtitle").split(' ')[0]} <span className="gradient-text">{t("pages.howItWorks.forRenters")}</span>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {t("pages.howItWorks.forRentersSubtitle")}
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {forRenters.map((item) => (
                  <div key={item.titleKey} className="glass-card p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{t(item.titleKey)}</h3>
                    <p className="text-muted-foreground">{t(item.descKey)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  {t("pages.howItWorks.forOwnersSubtitle").split(' ')[0]} <span className="gradient-text">{t("pages.howItWorks.forOwners")}</span>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {t("pages.howItWorks.forOwnersSubtitle")}
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {forOwners.map((item) => (
                  <div key={item.titleKey} className="glass-card p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-8 h-8 text-secondary" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{t(item.titleKey)}</h3>
                    <p className="text-muted-foreground">{t(item.descKey)}</p>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="px-8">
                    {t("pages.howItWorks.becomeOwner")}
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="py-16 bg-primary/5">
            <div className="container mx-auto px-4">
              <div className="glass-card p-8 md:p-12 text-center">
                <CheckCircle className="w-16 h-16 text-primary mx-auto mb-6" />
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  {t("pages.howItWorks.trustPlatform")}
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                  {t("pages.howItWorks.trustPlatformDesc")}
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full">
                    <Shield className="w-5 h-5 text-primary" />
                    <span className="font-medium">{t("pages.howItWorks.kycVerified")}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span className="font-medium">{t("pages.howItWorks.mobileMoney")}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full">
                    <Globe className="w-5 h-5 text-primary" />
                    <span className="font-medium">{t("pages.howItWorks.uemoaCountries")}</span>
                  </div>
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

export default HowItWorks;