import { Link } from "react-router-dom";
import { Users, Shield, Star, Clock, CheckCircle, Car, Award, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";

const benefits = [
  {
    icon: Shield,
    title: "Chauffeurs vérifiés",
    description: "Permis validé, casier judiciaire vérifié, expérience confirmée. Tous nos chauffeurs passent un processus de certification rigoureux.",
  },
  {
    icon: Star,
    title: "Système de notation",
    description: "Consultez les avis des autres utilisateurs et choisissez votre chauffeur en toute confiance.",
  },
  {
    icon: Clock,
    title: "Disponibilité flexible",
    description: "Chauffeurs disponibles à l'heure, à la journée ou pour des missions longue durée.",
  },
  {
    icon: Car,
    title: "Multi-véhicules",
    description: "Nos chauffeurs sont qualifiés pour conduire différents types de véhicules : berlines, SUV, minibus.",
  }];

const howItWorks = [
  {
    step: "1",
    title: "Réservez un véhicule",
    description: "Choisissez votre véhicule et indiquez si vous souhaitez un chauffeur.",
  },
  {
    step: "2",
    title: "Sélectionnez un chauffeur",
    description: "Parcourez les profils disponibles, consultez les avis et tarifs.",
  },
  {
    step: "3",
    title: "Confirmez la réservation",
    description: "Le chauffeur vous contacte pour confirmer les détails de la mission.",
  },
  {
    step: "4",
    title: "Profitez du trajet",
    description: "Votre chauffeur certifié vous conduit en toute sécurité.",
  }];

const CertifiedDrivers = () => {
  return (
    <>
      <Helmet>
        <title>Chauffeurs Certifiés | GoMonto - Pool de chauffeurs professionnels</title>
        <meta name="description" content="Réservez un chauffeur certifié pour votre location. Conducteurs vérifiés, expérimentés et notés par la communauté dans 8 pays UEMOA." />
        <link rel="canonical" href="https://gomonto.com/chauffeurs-certifies" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-24 pb-32 md:pb-16">
          {/* Hero */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium mb-6">
                  <Users className="w-4 h-4" />
                  Pool de Chauffeurs
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold mb-6">
                  Des chauffeurs{" "}
                  <span className="gradient-text">certifiés et fiables</span>
                </h1>
                
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Vous ne souhaitez pas conduire ? Réservez un chauffeur certifié GoMonto 
                  pour vous accompagner pendant votre location.
                </p>
                
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/vehicules">
                    <Button size="lg" className="btn-primary-glow px-8">
                      <span className="relative z-10">Réserver avec chauffeur</span>
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="lg" variant="outline" className="px-8">
                      Devenir chauffeur
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
                  Pourquoi choisir nos chauffeurs ?
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {benefits.map((benefit) => (
                  <div key={benefit.title} className="glass-card p-6 text-center hover-lift">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                      <benefit.icon className="w-7 h-7 text-blue-500" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
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
              
              <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {howItWorks.map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-4">
                      {item.step}
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Certification Process */}
          <section className="py-16 bg-blue-500/5">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                  <Award className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">
                    Processus de certification
                  </h2>
                  <p className="text-muted-foreground">
                    Chaque chauffeur GoMonto passe par un processus de vérification rigoureux.
                  </p>
                </div>
                
                <div className="glass-card p-6 space-y-4">
                  {[
                    "Vérification du permis de conduire valide",
                    "Contrôle du casier judiciaire",
                    "Minimum 3 ans d'expérience de conduite",
                    "Entretien et test de conduite",
                    "Formation aux standards GoMonto",
                    "Évaluation continue par les clients"].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Become a Driver CTA */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="glass-card p-8 md:p-12 text-center bg-gradient-to-br from-blue-500/10 to-primary/10 max-w-3xl mx-auto">
                <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Vous êtes chauffeur professionnel ?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Rejoignez notre réseau de chauffeurs certifiés et accédez à des missions 
                  dans toute l'UEMOA. Revenus flexibles, clients réguliers.
                </p>
                <Link to="/auth">
                  <Button size="lg" className="btn-primary-glow px-10">
                    <span className="relative z-10">Rejoindre le pool chauffeurs</span>
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

export default CertifiedDrivers;
