import { useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Crown, Check, Star, Zap, Building2, Rocket, Loader2, Copy, Phone, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

interface SubscriptionManagerProps {
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

type PaymentMethod = "wave" | "orange_money" | "mtn_momo" | "moov_money";

const paymentMethods = [
  { id: "wave" as PaymentMethod, name: "Wave", logo: "🌊", color: "from-cyan-400 to-cyan-600", phone: "+221 78 123 45 67" },
  { id: "orange_money" as PaymentMethod, name: "Orange Money", logo: "🟠", color: "from-orange-400 to-orange-600", phone: "+221 77 123 45 67" },
  { id: "mtn_momo" as PaymentMethod, name: "MTN MoMo", logo: "🟡", color: "from-yellow-400 to-yellow-600", phone: "+225 05 123 4567" }];

const planIcons: Record<string, React.ReactNode> = {
  starter: <Zap className="w-6 h-6" />,
  pro: <Star className="w-6 h-6" />,
  business: <Building2 className="w-6 h-6" />,
  enterprise: <Rocket className="w-6 h-6" />,
};

const SubscriptionManager = ({ ownerId }: SubscriptionManagerProps) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<OwnerSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [step, setStep] = useState<"plans" | "payment" | "confirm" | "pending">("plans");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleCount, setVehicleCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [ownerId]);

  const fetchData = async () => {
    setLoading(true);

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
    setLoading(false);
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setStep("payment");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !" });
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

      setStep("pending");
      toast({
        title: "Paiement soumis",
        description: "Votre abonnement sera activé après vérification du paiement.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de soumettre le paiement.",
        variant: "destructive",
      });
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Droit de Publication</h1>
        <p className="text-muted-foreground">
          Abonnez-vous pour publier vos véhicules sur GoMonto
        </p>
      </div>

      {/* Explanation Banner */}
      <div className="glass-card p-4 border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-400 mb-1">Un abonnement tout-en-un</h3>
            <p className="text-sm text-muted-foreground">
              Chaque abonnement inclut :
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span><strong className="text-foreground">Droit de publication</strong> - Publiez vos véhicules selon votre formule</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span><strong className="text-foreground">Crédits inclus</strong> - Recevez des crédits de connexion chaque mois</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span><strong className="text-foreground">Crédits supplémentaires</strong> - Achetez à prix réduit selon votre formule</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Subscription */}
      {currentSubscription && (
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

            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Début : </span>
                <span>{format(new Date(currentSubscription.starts_at), "d MMMM yyyy", { locale: fr })}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fin : </span>
                <span>{format(new Date(currentSubscription.ends_at), "d MMMM yyyy", { locale: fr })}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Véhicules publiés</span>
                  <span className="font-semibold">
                    {vehicleCount} / {currentSubscription.plan.max_vehicles === 999 ? "∞" : currentSubscription.plan.max_vehicles}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, (vehicleCount / currentSubscription.plan.max_vehicles) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Crédits inclus/mois</span>
                </div>
                <span className="text-xl font-bold text-primary">{currentSubscription.plan.included_credits || 0}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Crédit suppl.: {formatCurrency(currentSubscription.plan.extra_credit_price || 500)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid or Payment Flow */}
      {step === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.plan_id === plan.id;
            
            return (
              <div
                key={plan.id}
                className={cn(
                  "glass-card p-6 border relative overflow-hidden transition-all",
                  plan.is_featured ? "border-primary/50 bg-primary/5" : "border-glass-border",
                  isCurrentPlan && "ring-2 ring-primary"
                )}
              >
                {plan.is_featured && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-bl-lg">
                    Populaire
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    plan.is_featured ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {planIcons[plan.slug] || <Star className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold">{formatCurrency(plan.price, false)}</span>
                  <span className="text-muted-foreground"> FCFA/mois</span>
                </div>

                <div className="mb-4 p-2 rounded-lg bg-muted/50 text-center text-sm">
                  <span className="font-semibold">{plan.max_vehicles === 999 ? "Illimité" : plan.max_vehicles}</span>
                  <span className="text-muted-foreground"> véhicule{plan.max_vehicles > 1 ? "s" : ""}</span>
                </div>

                {/* Included credits highlight */}
                <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold">{plan.included_credits} crédits/mois</span>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    +{formatCurrency(plan.extra_credit_price)}/crédit supplémentaire
                  </p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrentPlan}
                  className={cn(
                    "w-full py-3 rounded-xl font-semibold transition-all",
                    isCurrentPlan
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : plan.is_featured
                        ? "btn-primary-glow text-primary-foreground"
                        : "glass border border-glass-border hover:border-primary/50"
                  )}
                >
                  {isCurrentPlan ? "Abonnement actuel" : "Choisir"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Step */}
      {step === "payment" && selectedPlan && (
        <div className="glass-card p-6 border border-glass-border max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setStep("plans")}
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
                placeholder="Ex: TXN123456789"
                className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
              />
            </div>

            <button
              onClick={handleSubmitPayment}
              disabled={!selectedPayment || !paymentReference || isSubmitting}
              className="w-full btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Confirmer mon paiement</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Pending Step */}
      {step === "pending" && (
        <div className="glass-card p-8 border border-glass-border max-w-lg mx-auto text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-amber-500/20 flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-400 animate-pulse" />
          </div>

          <h3 className="text-xl font-bold mb-2">Paiement en cours de vérification</h3>
          <p className="text-muted-foreground mb-6">
            Votre abonnement sera activé sous 24h après vérification de votre paiement.
            Vous recevrez une notification de confirmation.
          </p>

          <div className="p-4 rounded-lg bg-muted/50 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Formule</span>
              <span className="font-medium">{selectedPlan?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant</span>
              <span className="font-medium">{formatCurrency(selectedPlan?.price || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Référence</span>
              <span className="font-mono">{paymentReference}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setStep("plans");
              setSelectedPlan(null);
              setSelectedPayment(null);
              setPaymentReference("");
              fetchData();
            }}
            className="mt-6 w-full py-3 rounded-xl glass border border-glass-border font-medium"
          >
            Retour aux formules
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Abonnement + Crédits : comment ça marche ?</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Abonnement</strong> = droit de publier X véhicules sur la plateforme</li>
              <li><strong>Crédits de connexion</strong> = frais par mise en relation avec un locataire</li>
            </ul>
            <p className="mt-2">
              Les paiements de location vont directement sur vos comptes Mobile Money - 
              GoMonto ne prélève aucun pourcentage sur vos locations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;