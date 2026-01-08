import { Link } from "react-router-dom";
import { Car, Wallet, Shield, TrendingUp, CheckCircle, ArrowRight, Coins, Users, BarChart3 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

const features = [
  {
    icon: Coins,
    title: "Revenus passifs",
    description: "Rentabilisez votre véhicule quand vous ne l'utilisez pas. Fixez vos propres tarifs.",
  },
  {
    icon: Shield,
    title: "Paiements sécurisés",
    description: "Recevez les paiements directement sur votre compte Mobile Money. Aucun intermédiaire.",
  },
  {
    icon: BarChart3,
    title: "Dashboard professionnel",
    description: "Gérez votre flotte, suivez vos revenus et optimisez vos annonces depuis un seul endroit.",
  },
  {
    icon: Users,
    title: "Pool de chauffeurs",
    description: "Accédez à des chauffeurs certifiés pour accompagner vos véhicules si besoin.",
  }];

const steps = [
  {
    step: "01",
    title: "Créez votre compte",
    description: "Inscription gratuite en 2 minutes avec votre téléphone.",
  },
  {
    step: "02",
    title: "Ajoutez vos véhicules",
    description: "Photos, tarifs, disponibilités. Tout se fait depuis votre téléphone.",
  },
  {
    step: "03",
    title: "Rechargez votre Wallet",
    description: "Achetez des crédits pour publier vos annonces et recevoir des mises en relation.",
  },
  {
    step: "04",
    title: "Recevez des réservations",
    description: "Les clients réservent et vous payent directement via Mobile Money.",
  }];

const BecomeOwner = () => {
  return (
    <>
      <Helmet>
        <title>Devenir Loueur de Véhicules | Gagnez de l'Argent avec votre Voiture | GoMonto</title>
        <meta name="description" content="Rejoignez GoMonto et rentabilisez votre véhicule en Afrique de l'Ouest. Plateforme professionnelle avec dashboard ERP, paiements Mobile Money directs, 0% commission. 8 pays UEMOA." />
        <meta name="keywords" content="devenir loueur voiture, rentabiliser véhicule Afrique, location voiture particulier, gagner argent voiture, loueur professionnel UEMOA, GoMonto loueur" />
        <link rel="canonical" href="https://gomonto.com/devenir-loueur" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-24 pb-32 md:pb-16">
          {/* Hero */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Car className="w-4 h-4" />
                  Modèle SaaS pour professionnels
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold mb-6">
                  Transformez votre véhicule en{" "}
                  <span className="gradient-text">source de revenus</span>
                </h1>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  GoMonto vous fournit tous les outils pour gérer votre flotte professionnellement : 
                  dashboard ERP, paiements directs, contrats automatisés et bien plus.
                </p>
                
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/auth">
                    <Button size="lg" className="btn-primary-glow px-8">
                      <span className="relative z-10 flex items-center gap-2">
                        Commencer maintenant
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </Button>
                  </Link>
                  <Link to="/tarifs-credits">
                    <Button size="lg" variant="outline" className="px-8">
                      Voir les tarifs
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Pourquoi choisir GoMonto ?
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Une plateforme conçue pour les loueurs professionnels d'Afrique de l'Ouest.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature) => (
                  <div key={feature.title} className="glass-card p-6 text-center hover-lift">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Comment ça marche ?
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {steps.map((step, index) => (
                  <div key={step.step} className="relative">
                    <div className="glass-card p-6">
                      <div className="text-4xl font-black gradient-text mb-4">{step.step}</div>
                      <h3 className="font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                        <ArrowRight className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing Model */}
          <section className="py-16 bg-primary/5">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <Wallet className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Modèle économique transparent
                </h2>
                <p className="text-muted-foreground mb-8">
                  GoMonto fonctionne sur un système de crédits prépayés. Pas d'abonnement mensuel, 
                  pas de commission sur vos locations. Vous payez uniquement pour les services que vous utilisez.
                </p>
                
                <div className="glass-card p-6 text-left space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <span className="font-medium">Publication de véhicule :</span>
                      <span className="text-muted-foreground"> 5 crédits par annonce</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <span className="font-medium">Mise en relation :</span>
                      <span className="text-muted-foreground"> 500 FCFA par réservation confirmée</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <span className="font-medium">Paiement location :</span>
                      <span className="text-muted-foreground"> 100% direct au loueur (0% commission)</span>
                    </div>
                  </div>
                </div>
                
                <Link to="/tarifs-credits" className="inline-block mt-8">
                  <Button variant="outline" size="lg">
                    Voir les packs de crédits
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="glass-card p-8 md:p-12 text-center bg-gradient-to-br from-primary/10 to-secondary/10 max-w-3xl mx-auto">
                <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Prêt à développer votre activité ?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Rejoignez les centaines de loueurs qui font confiance à GoMonto pour gérer leur flotte dans toute l'UEMOA.
                </p>
                <Link to="/auth">
                  <Button size="lg" className="btn-primary-glow px-10">
                    <span className="relative z-10">Créer mon compte loueur</span>
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

export default BecomeOwner;
