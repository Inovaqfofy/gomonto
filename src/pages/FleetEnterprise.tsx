import { Link } from "react-router-dom";
import { Building2, Shield, BarChart3, Users, FileText, Clock, CheckCircle, ArrowRight, Car } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

const benefits = [
  {
    icon: BarChart3,
    title: "Dashboard ERP complet",
    description: "Gérez toute votre flotte depuis une interface unique. Suivi des revenus, analyses, rapports.",
  },
  {
    icon: Shield,
    title: "Coffre-fort documents",
    description: "Stockez et gérez tous vos documents (assurances, contrôles techniques) en toute sécurité.",
  },
  {
    icon: FileText,
    title: "Contrats automatisés",
    description: "Génération automatique de contrats de location conformes à la législation locale.",
  },
  {
    icon: Users,
    title: "Gestion multi-utilisateurs",
    description: "Ajoutez des employés, définissez des rôles et gérez les accès à votre dashboard.",
  },
  {
    icon: Clock,
    title: "Calendrier intelligent",
    description: "Optimisez la disponibilité de vos véhicules avec notre système de calendrier avancé.",
  },
  {
    icon: Car,
    title: "Pool de chauffeurs",
    description: "Accédez à des chauffeurs certifiés pour vos clients qui en ont besoin.",
  }];

const testimonials = [
  {
    name: "Kofi A.",
    company: "KA Transport, Abidjan",
    text: "Depuis que nous utilisons GoMonto, notre taux d'occupation a augmenté de 40%. L'interface est très intuitive.",
    vehicles: 12,
  },
  {
    name: "Aminata D.",
    company: "Dakar Auto Services",
    text: "Le système de paiement Mobile Money nous permet de recevoir les paiements instantanément. Excellent service.",
    vehicles: 8,
  }];

const FleetEnterprise = () => {
  return (
    <>
      <Helmet>
        <title>Flotte Entreprise | GoMonto - Solution pour agences de location</title>
        <meta name="description" content="Solution professionnelle pour agences de location de véhicules. Dashboard ERP, gestion multi-véhicules, paiements directs Mobile Money dans 8 pays UEMOA." />
        <link rel="canonical" href="https://gomonto.com/flotte-entreprise" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-24 pb-32 md:pb-16">
          {/* Hero */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-6">
                  <Building2 className="w-4 h-4" />
                  Solution Entreprise
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold mb-6">
                  La solution complète pour{" "}
                  <span className="gradient-text">agences professionnelles</span>
                </h1>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Que vous ayez 5 ou 500 véhicules, GoMonto vous offre tous les outils 
                  pour digitaliser et optimiser votre activité de location.
                </p>
                
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/auth">
                    <Button size="lg" className="btn-primary-glow px-8">
                      <span className="relative z-10 flex items-center gap-2">
                        Créer mon compte Pro
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button size="lg" variant="outline" className="px-8">
                      Nous contacter
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Fonctionnalités pour professionnels
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Tout ce dont vous avez besoin pour gérer votre flotte efficacement.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {benefits.map((benefit) => (
                  <div key={benefit.title} className="glass-card p-6 hover-lift">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {[
                  { value: "500+", label: "Agences partenaires" },
                  { value: "5000+", label: "Véhicules gérés" },
                  { value: "8", label: "Pays UEMOA" },
                  { value: "99%", label: "Uptime plateforme" }].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-3xl md:text-4xl font-black gradient-text mb-2">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="py-16 bg-primary/5">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Ils nous font confiance
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {testimonials.map((testimonial) => (
                  <div key={testimonial.name} className="glass-card p-6">
                    <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold gradient-text">{testimonial.vehicles}</div>
                        <div className="text-xs text-muted-foreground">véhicules</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="glass-card p-8 md:p-12 text-center bg-gradient-to-br from-secondary/10 to-primary/10 max-w-3xl mx-auto">
                <Building2 className="w-12 h-12 text-secondary mx-auto mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Besoin d'une solution sur mesure ?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Notre équipe peut adapter GoMonto à vos besoins spécifiques. 
                  Contactez-nous pour discuter de votre projet.
                </p>
                <Link to="/contact">
                  <Button size="lg" className="btn-primary-glow px-10">
                    <span className="relative z-10">Contacter l'équipe commerciale</span>
                  </Button>
                </Link>
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

export default FleetEnterprise;
