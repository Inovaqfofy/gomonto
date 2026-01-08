import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Coins, CheckCircle, Sparkles, Star, Zap, Rocket, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatPricePerCredit } from "@/lib/currency";

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus_credits: number | null;
  is_popular: boolean | null;
}

const packIcons: Record<string, React.ElementType> = {
  "Recharge 5": Zap,
  "Recharge 10": Star,
  "Recharge 25": Sparkles,
  "Recharge 50": Rocket,
};

const CreditPricing = () => {
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreditPacks = async () => {
      const { data, error } = await supabase
        .from("credit_packs")
        .select("*")
        .eq("is_active", true)
        .order("credits", { ascending: true });

      if (data && !error) {
        setCreditPacks(data);
      }
      setLoading(false);
    };

    fetchCreditPacks();
  }, []);

  return (
    <>
      <Helmet>
        <title>Crédits de Connexion | GoMonto - Frais de mise en relation</title>
        <meta name="description" content="Rechargez vos crédits de connexion GoMonto. Frais de mise en relation locataire-propriétaire transparents, sans commission sur vos locations." />
        <link rel="canonical" href="https://gomonto.com/tarifs-credits" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-24 pb-32 md:pb-16">
          {/* Hero */}
          <section className="py-12 md:py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Coins className="w-4 h-4" />
                  Crédits de Connexion
                </div>
                
                <h1 className="text-3xl md:text-5xl font-bold mb-6">
                  Frais de{" "}
                  <span className="gradient-text">mise en relation</span>
                </h1>
                
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Chaque fois qu'un locataire réserve votre véhicule, 1 crédit est débité de votre wallet.
                  Pas de commission sur vos locations - les paiements vont directement chez vous.
                </p>
              </div>
            </div>
          </section>

          {/* Explanation */}
          <section className="pb-8">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <div className="glass-card p-6 border border-blue-500/30 bg-blue-500/5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Zap className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-400 mb-2">Comment ça marche ?</h3>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <p>
                          <strong className="text-foreground">1. Abonnez-vous</strong> pour avoir le droit de publier vos véhicules (voir les formules d'abonnement)
                        </p>
                        <p>
                          <strong className="text-foreground">2. Rechargez vos crédits</strong> pour recevoir des réservations
                        </p>
                        <p>
                          <strong className="text-foreground">3. 1 crédit = 1 mise en relation</strong> avec un locataire qui confirme sa réservation
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Credit Packs */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                  {creditPacks.map((pack) => {
                    const IconComponent = packIcons[pack.name] || Zap;
                    const isPopular = pack.is_popular ?? false;
                    const bonusCredits = pack.bonus_credits ?? 0;
                    
                    return (
                      <div 
                        key={pack.id} 
                        className={`glass-card p-6 relative ${isPopular ? 'border-2 border-primary shadow-glow-primary' : ''}`}
                      >
                        {isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                            Populaire
                          </div>
                        )}
                        
                        <div className="text-center mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <IconComponent className="w-7 h-7 text-primary" />
                          </div>
                        <h3 className="text-xl font-bold mb-1">{pack.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {pack.credits <= 10 
                              ? "Pour démarrer"
                              : pack.credits <= 25 
                                ? "Pour loueurs actifs"
                                : "Pour grandes flottes"
                            }
                          </p>
                        </div>
                        
                        <div className="text-center mb-6">
                          <div className="text-4xl font-black gradient-text">
                            {pack.credits}
                            {bonusCredits > 0 && (
                              <span className="text-green-500 text-lg font-semibold">+{bonusCredits}</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">crédits</div>
                        </div>
                        
                        <div className="text-center mb-6">
                          <div className="text-2xl font-bold">{formatCurrency(pack.price)}</div>
                          {bonusCredits > 0 && (
                            <div className="text-xs text-green-500 font-medium">
                              +{bonusCredits} crédits bonus offerts
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatPricePerCredit(Math.round(pack.price / pack.credits))}
                          </div>
                        </div>
                        
                        <Link to="/auth" className="block">
                          <Button 
                            className={`w-full ${isPopular ? 'btn-primary-glow' : ''}`}
                            variant={isPopular ? "default" : "outline"}
                          >
                            <span className={isPopular ? "relative z-10" : ""}>
                              Acheter
                            </span>
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Simple Pricing Info */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">
                    1 crédit = 1 connexion
                  </h2>
                  <p className="text-muted-foreground">
                    C'est aussi simple que ça. Pas de calcul compliqué.
                  </p>
                </div>
                
                <div className="glass-card p-6 md:p-8">
                  <div className="grid md:grid-cols-3 gap-6 text-center">
                    <div className="p-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Zap className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="font-semibold mb-1">Réservation confirmée</h4>
                      <p className="text-2xl font-bold text-primary">1 crédit</p>
                    </div>
                    <div className="p-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                      <h4 className="font-semibold mb-1">Commission GoMonto</h4>
                      <p className="text-2xl font-bold text-green-500">0%</p>
                    </div>
                    <div className="p-4">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                        <Coins className="w-6 h-6 text-amber-500" />
                      </div>
                      <h4 className="font-semibold mb-1">Paiements location</h4>
                      <p className="text-2xl font-bold text-amber-500">100% vous</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="glass-card p-8 md:p-12 text-center max-w-3xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Prêt à commencer ?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Créez votre compte loueur et rechargez votre wallet pour publier vos premiers véhicules.
                </p>
                <Link to="/auth">
                  <Button size="lg" className="btn-primary-glow px-10">
                    <span className="relative z-10">Créer mon compte</span>
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

export default CreditPricing;
