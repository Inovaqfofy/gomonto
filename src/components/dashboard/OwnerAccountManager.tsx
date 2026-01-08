import { useState, useEffect } from "react";
import { 
  Crown, Wallet, History, Check, Zap, Gift, Clock, 
  CreditCard, Plus, ArrowUpRight, Sparkles, Star, 
  Building2, Rocket, Loader2, Copy, Phone, CheckCircle
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPricePerCredit } from "@/lib/currency";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface OwnerAccountManagerProps {
  ownerId: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  duration_days: number;
  max_vehicles: number;
  features: string[];
  is_featured: boolean;
  included_credits: number;
  extra_credit_price: number;
}

interface OwnerSubscription {
  id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  payment_method: string;
  plan: SubscriptionPlan;
}

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus_credits: number;
  is_popular: boolean;
}

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  reference: string | null;
  created_at: string;
}

type PaymentMethod = "wave" | "orange_money" | "mtn_momo";

const paymentMethods = [
  { id: "wave" as PaymentMethod, name: "Wave", logo: "🌊", color: "from-cyan-400 to-cyan-600", phone: "+221 78 123 45 67" },
  { id: "orange_money" as PaymentMethod, name: "Orange Money", logo: "🟠", color: "from-orange-400 to-orange-600", phone: "+221 77 123 45 67" },
  { id: "mtn_momo" as PaymentMethod, name: "MTN MoMo", logo: "🟡", color: "from-yellow-400 to-yellow-600", phone: "+225 05 123 4567" }];

const planIcons: Record<string, React.ReactNode> = {
  starter: <Zap className="w-5 h-5" />,
  pro: <Star className="w-5 h-5" />,
  business: <Building2 className="w-5 h-5" />,
  enterprise: <Rocket className="w-5 h-5" />,
};

const OwnerAccountManager = ({ ownerId }: OwnerAccountManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<{ balance: number; currency: string; monthly_credits_used: number } | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<OwnerSubscription | null>(null);
  const [vehicleCount, setVehicleCount] = useState(0);
  
  // Purchase states
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Plan change states
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [ownerId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch or create wallet
    let { data: walletData } = await supabase
      .from("owner_wallets")
      .select("*")
      .eq("user_id", ownerId)
      .single();

    if (!walletData) {
      const { data: newWallet } = await supabase
        .from("owner_wallets")
        .insert({ user_id: ownerId, balance: 0, monthly_credits_used: 0 })
        .select()
        .single();
      walletData = newWallet;
    }

    setWallet(walletData);

    // Fetch transactions
    if (walletData) {
      const { data: txData } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", walletData.id)
        .order("created_at", { ascending: false })
        .limit(30);
      
      setTransactions(txData || []);
    }

    // Fetch subscription plans
    const { data: plansData } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (plansData) {
      setPlans(plansData.map((p) => ({
        ...p,
        features: typeof p.features === "string" ? JSON.parse(p.features) : p.features || [],
      })));
    }

    // Fetch current subscription
    const { data: subData } = await supabase
      .from("owner_subscriptions")
      .select("*, subscription_plans(*)")
      .eq("owner_id", ownerId)
      .eq("status", "active")
      .maybeSingle();

    if (subData) {
      setCurrentSubscription({
        id: subData.id,
        plan_id: subData.plan_id,
        status: subData.status,
        starts_at: subData.starts_at,
        ends_at: subData.ends_at,
        payment_method: subData.payment_method,
        plan: {
          ...subData.subscription_plans,
          features: typeof subData.subscription_plans?.features === "string" 
            ? JSON.parse(subData.subscription_plans.features) 
            : subData.subscription_plans?.features || [],
        },
      });
    }

    // Count owner's vehicles
    const { count } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId);

    setVehicleCount(count || 0);

    // Fetch credit packs
    const { data: packs } = await supabase
      .from("credit_packs")
      .select("*")
      .eq("is_active", true)
      .order("credits", { ascending: true });

    setCreditPacks(packs || []);
    setLoading(false);
  };

  const handlePurchase = async (packId: string) => {
    setPurchasing(true);
    setSelectedPack(packId);

    try {
      const { data, error } = await supabase.functions.invoke("process-credit-purchase", {
        body: {
          user_id: ownerId,
          pack_id: packId,
          payment_method: "wave",
        },
      });

      if (error) throw error;

      if (data.success) {
        setShowSuccess(true);
        toast.success(`${data.credits_added} crédits ajoutés !`);
        setTimeout(() => {
          fetchData();
          setShowSuccess(false);
        }, 2000);
      }
    } catch (error) {
      toast.error("Erreur lors de l'achat. Veuillez réessayer.");
    } finally {
      setPurchasing(false);
      setSelectedPack(null);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setChangingPlan(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  const handleSubmitPayment = async () => {
    if (!selectedPlan || !selectedPayment || !paymentReference) return;

    setIsSubmitting(true);

    try {
      const startsAt = new Date();
      const endsAt = addDays(startsAt, selectedPlan.duration_days);

      const { error } = await supabase.from("owner_subscriptions").insert({
        owner_id: ownerId,
        plan_id: selectedPlan.id,
        status: "pending",
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        payment_method: selectedPayment,
        payment_reference: paymentReference,
      });

      if (error) throw error;

      toast.success("Paiement soumis ! Votre abonnement sera activé après vérification.");
      setChangingPlan(false);
      setSelectedPlan(null);
      setSelectedPayment(null);
      setPaymentReference("");
      fetchData();
    } catch (error) {
      toast.error("Impossible de soumettre le paiement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysRemaining = currentSubscription
    ? Math.max(0, Math.ceil((new Date(currentSubscription.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Mon Compte Pro</h1>
        <p className="text-muted-foreground">Gérez votre abonnement et vos crédits de connexion</p>
      </div>

      {/* Explanation Banner */}
      <div className="glass-card p-4 border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-400 mb-1">Comment ça marche ?</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400 shrink-0" />
                <span><strong className="text-foreground">Abonnement</strong> = Droit de publier vos véhicules</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400 shrink-0" />
                <span><strong className="text-foreground">Crédits inclus</strong> = X crédits offerts chaque mois (renouvelés automatiquement)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400 shrink-0" />
                <span><strong className="text-foreground">Crédit = Mise en relation</strong> → Débité uniquement quand un locataire confirme</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="glass-card p-8 border border-green-500/30 shadow-[0_0_60px_rgba(34,197,94,0.3)] animate-scale-in text-center">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-green-400 mb-2">Recharge réussie !</h3>
            <p className="text-muted-foreground">Vos crédits ont été ajoutés</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 glass border border-glass-border">
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            <span className="hidden sm:inline">Mon Abonnement</span>
            <span className="sm:hidden">Abo</span>
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">Mes Crédits</span>
            <span className="sm:hidden">Crédits</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Historique</span>
            <span className="sm:hidden">Hist.</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Subscription */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Subscription Card */}
          {currentSubscription ? (
            <div className="glass-card p-6 border border-primary/30 bg-primary/5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Abonnement {currentSubscription.plan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentSubscription.plan.max_vehicles === 999 ? "Véhicules illimités" : `Jusqu'à ${currentSubscription.plan.max_vehicles} véhicules`}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    daysRemaining > 7 ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                  )}>
                    {daysRemaining > 0 ? `${daysRemaining} jours restants` : "Expiré"}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground mb-1">Véhicules publiés</p>
                    <span className="font-semibold text-lg">
                      {vehicleCount} / {currentSubscription.plan.max_vehicles === 999 ? "∞" : currentSubscription.plan.max_vehicles}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Gift className="w-4 h-4" /> Crédits inclus/mois
                    </p>
                    <span className="text-xl font-bold text-green-400">{currentSubscription.plan.included_credits}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="text-sm text-muted-foreground mb-1">Prix crédit suppl.</p>
                    <span className="font-semibold">{formatCurrency(currentSubscription.plan.extra_credit_price)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm mt-4 pt-4 border-t border-glass-border">
                  <div>
                    <span className="text-muted-foreground">Fin : </span>
                    <span>{format(new Date(currentSubscription.ends_at), "d MMMM yyyy", { locale: fr })}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 border border-amber-500/30 bg-amber-500/5 text-center">
              <Crown className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Aucun abonnement actif</h3>
              <p className="text-muted-foreground mb-4">Choisissez un plan pour publier vos véhicules</p>
            </div>
          )}

          {/* Plan Change Modal/Section */}
          {changingPlan && selectedPlan ? (
            <div className="glass-card p-6 border border-glass-border animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => { setChangingPlan(false); setSelectedPlan(null); }}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center"
                >
                  ←
                </button>
                <div>
                  <h3 className="font-bold text-lg">Payer l'abonnement {selectedPlan.name}</h3>
                  <p className="text-sm text-muted-foreground">{formatCurrency(selectedPlan.price)} pour 30 jours</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Mode de paiement</label>
                  <div className="grid grid-cols-3 gap-3">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPayment(method.id)}
                        className={cn(
                          "p-3 rounded-xl flex flex-col items-center gap-2 transition-all",
                          selectedPayment === method.id
                            ? "bg-primary/10 border-2 border-primary"
                            : "glass border border-glass-border hover:border-primary/30"
                        )}
                      >
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${method.color} flex items-center justify-center text-lg`}>
                          {method.logo}
                        </div>
                        <span className="text-xs font-medium">{method.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPayment && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 animate-fade-in">
                    <p className="text-sm text-muted-foreground mb-2">Envoyez {formatCurrency(selectedPlan.price)} à :</p>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <div>
                        <p className="font-bold text-lg">GoMonto SAS</p>
                        <p className="font-mono">{paymentMethods.find((m) => m.id === selectedPayment)?.phone}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(paymentMethods.find((m) => m.id === selectedPayment)?.phone || "")}
                        className="p-2 rounded-lg hover:bg-primary/10"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Référence de transaction</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Ex: MP240615123456"
                    className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary/50 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleSubmitPayment}
                  disabled={!selectedPayment || !paymentReference || isSubmitting}
                  className="w-full py-4 rounded-xl font-semibold btn-primary-glow text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  {isSubmitting ? "Envoi en cours..." : "Confirmer le paiement"}
                </button>
              </div>
            </div>
          ) : (
            /* Plans Grid */
            <div>
              <h3 className="font-semibold mb-4">{currentSubscription ? "Changer de plan" : "Choisir un plan"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((plan) => {
                  const isCurrentPlan = currentSubscription?.plan_id === plan.id;
                  
                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "glass-card p-5 border relative overflow-hidden transition-all",
                        plan.is_featured ? "border-primary/50 bg-primary/5" : "border-glass-border",
                        isCurrentPlan && "ring-2 ring-primary"
                      )}
                    >
                      {plan.is_featured && (
                        <div className="absolute top-0 right-0 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-bl-lg">
                          Populaire
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          plan.is_featured ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {planIcons[plan.slug] || <Star className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold">{plan.name}</h4>
                          <p className="text-xs text-muted-foreground">{plan.max_vehicles === 999 ? "Illimité" : `${plan.max_vehicles} véh.`}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <span className="text-2xl font-bold">{formatCurrency(plan.price, false)}</span>
                        <span className="text-muted-foreground text-sm"> /mois</span>
                      </div>

                      <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 mb-3 text-center">
                        <span className="text-green-400 font-bold">{plan.included_credits} crédits</span>
                        <span className="text-muted-foreground text-xs"> inclus/mois</span>
                      </div>

                      <button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isCurrentPlan}
                        className={cn(
                          "w-full py-2 rounded-lg font-medium transition-all text-sm",
                          isCurrentPlan
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : plan.is_featured
                              ? "btn-primary-glow text-primary-foreground"
                              : "glass border border-glass-border hover:border-primary/50"
                        )}
                      >
                        {isCurrentPlan ? "Plan actuel" : "Choisir"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Credits */}
        <TabsContent value="credits" className="space-y-6">
          {/* Wallet Card */}
          <div className="glass-card p-6 md:p-8 border border-glass-border relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-secondary/20 to-primary/20 rounded-full blur-3xl" />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary bg-[length:200%_200%] animate-gradient flex items-center justify-center shadow-lg shadow-primary/30">
                  <Wallet className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Solde disponible</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold gradient-text tabular-nums">
                      {(wallet?.balance || 0).toLocaleString()}
                    </span>
                    <span className="text-lg text-muted-foreground">crédits</span>
                  </div>
                </div>
              </div>

              {currentSubscription && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <Gift className="w-5 h-5 text-green-400" />
                  <div className="text-sm">
                    <p className="text-green-400 font-medium">{currentSubscription.plan.included_credits} crédits/mois inclus</p>
                    <p className="text-muted-foreground">renouvelés automatiquement</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recharge Note */}
          <div className="glass-card p-4 border border-blue-500/30 bg-blue-500/5">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-blue-400">Besoin de plus de crédits ?</strong> Achetez des packs supplémentaires uniquement si vous dépassez vos crédits mensuels inclus.
                {currentSubscription && (
                  <span className="block mt-1">
                    Avec votre plan {currentSubscription.plan.name}, le crédit supplémentaire coûte <strong className="text-foreground">{formatCurrency(currentSubscription.plan.extra_credit_price)}</strong>.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Credit Packs */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Packs de crédits supplémentaires
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {creditPacks.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => handlePurchase(pack.id)}
                  disabled={purchasing}
                  className={cn(
                    "glass-card p-5 border text-left transition-all hover-lift group relative overflow-hidden",
                    pack.is_popular
                      ? "border-primary/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                      : "border-glass-border hover:border-primary/30"
                  )}
                >
                  {pack.is_popular && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-bl-xl rounded-tr-xl">
                      POPULAIRE
                    </div>
                  )}

                  <h4 className="font-bold mb-2">{pack.name}</h4>
                  
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold gradient-text">
                      {pack.credits + (pack.bonus_credits || 0)}
                    </span>
                    <span className="text-muted-foreground text-sm">crédits</span>
                  </div>

                  {pack.bonus_credits > 0 && (
                    <div className="flex items-center gap-1 text-green-400 text-xs mb-3">
                      <Gift className="w-3 h-3" />
                      <span>+{pack.bonus_credits} bonus</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-glass-border">
                    <span className="text-xl font-bold">{formatCurrency(pack.price)}</span>
                    <p className="text-xs text-muted-foreground">
                      {formatPricePerCredit(Math.round(pack.price / (pack.credits + (pack.bonus_credits || 0))))}
                    </p>
                  </div>

                  {purchasing && selectedPack === pack.id && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="glass-card p-4 border border-glass-border">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-secondary" />
              Paiements acceptés
            </h4>
            <div className="flex flex-wrap gap-3">
              {[
                { name: "Orange Money", icon: "🟠" },
                { name: "MTN MoMo", icon: "🟡" },
                { name: "Wave", icon: "🔵" },
                { name: "Moov Money", icon: "🔷" }].map((method) => (
                <div key={method.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm">
                  <span>{method.icon}</span>
                  <span>{method.name}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: History */}
        <TabsContent value="history" className="space-y-6">
          <div className="glass-card p-6 border border-glass-border">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Historique des transactions
            </h3>
            
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune transaction pour le moment
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          tx.type === "credit"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        )}
                      >
                        {tx.type === "credit" ? (
                          <Plus className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), "d MMM yyyy, HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "font-bold tabular-nums",
                        tx.type === "credit" ? "text-green-400" : "text-red-400"
                      )}
                    >
                      {tx.type === "credit" ? "+" : ""}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerAccountManager;
