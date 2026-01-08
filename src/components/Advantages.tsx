import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, Zap, Globe, CreditCard, Star, Users } from "lucide-react";

const getColorClasses = (color: string) => {
  switch (color) {
    case "primary":
      return { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" };
    case "secondary":
      return { bg: "bg-secondary/10", text: "text-secondary", border: "border-secondary/20" };
    case "accent":
      return { bg: "bg-accent/10", text: "text-accent-foreground", border: "border-accent/20" };
    default:
      return { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" };
  }
};

const Advantages = () => {
  const { t } = useTranslation();

  const advantages = [
    {
      icon: Shield,
      titleKey: "advantages.verifiedVehicles.title",
      descriptionKey: "advantages.verifiedVehicles.description",
      color: "primary",
    },
    {
      icon: CreditCard,
      titleKey: "advantages.securePayment.title",
      descriptionKey: "advantages.securePayment.description",
      color: "secondary",
    },
    {
      icon: Globe,
      titleKey: "advantages.uemoaCoverage.title",
      descriptionKey: "advantages.uemoaCoverage.description",
      color: "accent",
    },
    {
      icon: Zap,
      titleKey: "advantages.instantBooking.title",
      descriptionKey: "advantages.instantBooking.description",
      color: "primary",
    },
    {
      icon: Star,
      titleKey: "advantages.verifiedReviews.title",
      descriptionKey: "advantages.verifiedReviews.description",
      color: "secondary",
    },
    {
      icon: Users,
      titleKey: "advantages.dedicatedSupport.title",
      descriptionKey: "advantages.dedicatedSupport.description",
      color: "accent",
    }];

  return (
    <section id="advantages" className="py-20 md:py-32 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 pattern-afro opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{t("advantages.badge")}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            {t("advantages.title")}{" "}
            <span className="gradient-text">{t("advantages.titleHighlight")}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("advantages.subtitle")}
          </p>
        </div>

        {/* Advantages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantages.map((advantage, index) => {
            const colors = getColorClasses(advantage.color);
            
            return (
              <div
                key={advantage.titleKey}
                className="card-interactive p-6 md:p-8 group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl ${colors.bg} ${colors.border} border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <advantage.icon className={`w-7 h-7 ${colors.text}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {t(advantage.titleKey)}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(advantage.descriptionKey)}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Link
            to="/vehicules"
            className="btn-primary-glow inline-flex items-center gap-2 px-8 py-4 rounded-xl text-primary-foreground font-bold touch-target"
          >
            <span className="relative z-10">{t("advantages.cta")}</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Advantages;
