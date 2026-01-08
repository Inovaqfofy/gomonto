import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileText, Shield, HelpCircle, Scale, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LegalMentions from "@/components/legal/LegalMentions";
import TermsOfService from "@/components/legal/TermsOfService";
import PrivacyPolicy from "@/components/legal/PrivacyPolicy";
import FAQ from "@/components/legal/FAQ";
import logo from "@/assets/logo.png";

type LegalSection = "mentions" | "cgu" | "privacy" | "faq";

const Legal = () => {
  const { t } = useTranslation();
  const [currentSection, setCurrentSection] = useState<LegalSection>("mentions");

  const sidebarItems = [
    { id: "mentions" as LegalSection, titleKey: "legal.legalMentions", icon: FileText },
    { id: "cgu" as LegalSection, titleKey: "legal.termsOfService", icon: Scale },
    { id: "privacy" as LegalSection, titleKey: "legal.privacyPolicy", icon: Shield },
    { id: "faq" as LegalSection, titleKey: "legal.faq", icon: HelpCircle }];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const renderContent = () => {
    switch (currentSection) {
      case "mentions":
        return <LegalMentions />;
      case "cgu":
        return <TermsOfService />;
      case "privacy":
        return <PrivacyPolicy />;
      case "faq":
        return <FAQ />;
      default:
        return <LegalMentions />;
    }
  };

  const currentTitle = sidebarItems.find(item => item.id === currentSection)?.titleKey || "legal.legalMentions";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-nav border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">{t("common.back")}</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <Link to="/">
              <img src={logo} alt="GoMonto" className="h-7" />
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex">
              <Printer className="w-4 h-4 mr-2" />
              {t("legal.print")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("legal.downloadPdf")}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-xl font-bold mb-6">{t("legal.legalCenter")}</h2>
              <nav className="space-y-2">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                      currentSection === item.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{t(item.titleKey)}</span>
                  </button>
                ))}
              </nav>
              
              <div className="mt-8 p-4 glass-card rounded-xl">
                <h3 className="font-semibold mb-2">{t("legal.needHelp")}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("legal.contactLegalTeam")}
                </p>
                <a 
                  href="mailto:legal@gomonto.com" 
                  className="text-sm text-primary hover:underline"
                >
                  legal@gomonto.com
                </a>
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="glass-card rounded-2xl p-6 md:p-10">
              <div className="mb-8 pb-6 border-b border-border">
                <h1 className="text-2xl md:text-3xl font-bold">{t(currentTitle)}</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("legal.lastUpdated")} : 22 décembre 2025
                </p>
              </div>
              
              <div className="legal-content prose prose-slate max-w-none">
                {renderContent()}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Legal;