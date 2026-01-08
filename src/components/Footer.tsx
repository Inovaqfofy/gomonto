import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  const { t } = useTranslation();

  const footerLinks = {
    solutions: [
      { labelKey: "footer.becomeOwner", href: "/devenir-loueur" },
      { labelKey: "footer.fleetEnterprise", href: "/flotte-entreprise" },
      { labelKey: "footer.certifiedDrivers", href: "/chauffeurs-certifies" }],
    support: [
      { labelKey: "footer.helpCenter", href: "/legal?tab=faq" },
      { labelKey: "footer.legalMentions", href: "/legal?tab=mentions" },
      { labelKey: "footer.termsPrivacy", href: "/legal?tab=cgu" },
      { labelKey: "footer.contact", href: "/contact" }],
    gomonto: [
      { labelKey: "footer.about", href: "/a-propos" },
      { labelKey: "footer.creditPricing", href: "/tarifs-credits" },
      { labelKey: "footer.howItWorks", href: "/fonctionnement" }],
  };

  const countries = [
    { nameKey: "countries.benin", flag: "🇧🇯" },
    { nameKey: "countries.togo", flag: "🇹🇬" },
    { nameKey: "countries.senegal", flag: "🇸🇳" },
    { nameKey: "countries.cote_ivoire", flag: "🇨🇮" },
    { nameKey: "countries.burkina_faso", flag: "🇧🇫" },
    { nameKey: "countries.mali", flag: "🇲🇱" },
    { nameKey: "countries.niger", flag: "🇳🇪" },
    { nameKey: "countries.guinee_bissau", flag: "🇬🇼" }];

  return (
    <footer className="border-t border-border pt-16 pb-24 md:pb-8 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img src={logo} alt="GoMonto" className="h-8 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {t("footer.tagline")}
            </p>
            <div className="flex gap-3">
              <a href="https://facebook.com/gomonto" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://twitter.com/gomonto" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://instagram.com/gomonto" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com/company/gomonto" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.solutions")}</h4>
            <ul className="space-y-3">
              {footerLinks.solutions.map((link) => (
                <li key={link.labelKey}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Légal */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.support")}</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.labelKey}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* GoMonto */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.gomonto")}</h4>
            <ul className="space-y-3">
              {footerLinks.gomonto.map((link) => (
                <li key={link.labelKey}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.contact")}</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:contact@gomonto.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  contact@gomonto.com
                </a>
              </li>
              <li>
                <a href="tel:+2250701238974" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  +225 07 01 23 89 74
                </a>
              </li>
              <li>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  Abidjan, {t("countries.cote_ivoire")}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Countries */}
        <div className="border-t border-border pt-8 mb-8">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            {t("footer.operationalIn")}
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">UEMOA</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {countries.map((country) => (
              <span key={country.nameKey} className="glass px-3 py-1.5 rounded-full text-sm text-muted-foreground flex items-center gap-2">
                <span>{country.flag}</span>
                {t(country.nameKey)}
              </span>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>{t("footer.copyright")}</p>
          <p>{t("footer.madeWith")}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
