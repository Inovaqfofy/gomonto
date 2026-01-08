import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Phone, Mail, Clock, Send, Building2, MessageSquare } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Helmet } from "react-helmet-async";

const Contact = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactInfo = [
    {
      icon: Building2,
      titleKey: "pages.contact.headquarters",
      content: "27 BP 148 Abidjan 27, Côte d'Ivoire",
    },
    {
      icon: Phone,
      titleKey: "pages.contact.phone",
      content: "+225 07 01 23 89 74",
      href: "tel:+2250701238974",
    },
    {
      icon: Mail,
      titleKey: "pages.contact.email",
      content: "contact@gomonto.com",
      href: "mailto:contact@gomonto.com",
    },
    {
      icon: Clock,
      titleKey: "pages.contact.hours",
      content: t("pages.contact.hoursValue"),
    }];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: t("pages.contact.messageSent"),
      description: t("pages.contact.messageSentDesc"),
    });
    
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  return (
    <>
      <Helmet>
        <title>Contactez GoMonto | Support Client Location Véhicules | Afrique de l'Ouest</title>
        <meta name="description" content="Contactez l'équipe GoMonto pour toute question sur la location de véhicules en Afrique de l'Ouest. Support 24h/7j, téléphone, email, WhatsApp. Abidjan, Côte d'Ivoire." />
        <meta name="keywords" content="contact GoMonto, support location voiture, aide location Afrique, service client UEMOA, téléphone GoMonto, email GoMonto" />
        <link rel="canonical" href="https://gomonto.com/contact" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-24 pb-32 md:pb-16">
          <section className="py-12 md:py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <MessageSquare className="w-4 h-4" />
                  {t("pages.contact.supportBadge")}
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold mb-6">
                  {t("pages.contact.heroTitle")}{" "}
                  <span className="gradient-text">{t("pages.contact.heroHighlight")}</span>
                </h1>
                
                <p className="text-lg text-muted-foreground">
                  {t("pages.contact.heroSubtitle")}
                </p>
              </div>
            </div>
          </section>

          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                <div>
                  <h2 className="text-2xl font-bold mb-8">{t("pages.contact.ourCoordinates")}</h2>
                  
                  <div className="space-y-6 mb-8">
                    {contactInfo.map((info) => (
                      <div key={info.titleKey} className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <info.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{t(info.titleKey)}</h3>
                          {info.href ? (
                            <a 
                              href={info.href} 
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              {info.content}
                            </a>
                          ) : (
                            <p className="text-muted-foreground">{info.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="glass-card aspect-video rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                    <div className="text-center p-8">
                      <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
                      <p className="font-semibold mb-2">Inopay Group</p>
                      <p className="text-sm text-muted-foreground">
                        27 BP 148 Abidjan 27<br />
                        Côte d'Ivoire
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-8">{t("pages.contact.sendMessage")}</h2>
                  
                  <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">{t("pages.contact.fullName")}</label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t("pages.contact.yourName")}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t("pages.contact.emailLabel")}</label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder={t("pages.contact.emailPlaceholder")}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">{t("pages.contact.phoneLabel")}</label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder={t("pages.contact.phonePlaceholder")}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t("pages.contact.subject")}</label>
                        <Input
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder={t("pages.contact.subjectPlaceholder")}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">{t("pages.contact.message")}</label>
                      <Textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder={t("pages.contact.messagePlaceholder")}
                        rows={5}
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full btn-primary-glow"
                      disabled={isSubmitting}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {isSubmitting ? t("pages.contact.sending") : (
                          <>
                            <Send className="w-4 h-4" />
                            {t("pages.contact.send")}
                          </>
                        )}
                      </span>
                    </Button>
                  </form>
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

export default Contact;