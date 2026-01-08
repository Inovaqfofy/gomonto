import { useState, useEffect } from "react";
import { 
  Wallet, Plus, Sparkles, CreditCard, History, 
  ArrowUpRight, Check, Zap, Gift, Clock, X 
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPricePerCredit } from "@/lib/currency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import CinetPayCheckout from "@/components/payment/CinetPayCheckout";

interface WalletManagerProps {
  userId: string;
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

interface SubscriptionInfo {
  included_credits: number;
  extra_credit_price: number;
  plan_name: string;
}

const WalletManager = ({ userId }: WalletManagerProps) => {
  const [wallet, setWallet] = useState<{ balance: number; currency: string; monthly_credits_used: number } | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPurchaseId, setPendingPurchaseId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    // Fetch or create wallet
    let { data: walletData } = await supabase
      .from("owner_wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!walletData) {
      const { data: newWallet } = await supabase
        .from("owner_wallets")
        .insert({ user_id: userId, balance: 0, monthly_credits_used: 0 })
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
        .limit(20);
      
      setTransactions(txData || []);
    }

    // Fetch current subscription with plan details
    const { data: subData } = await supabase
      .from("owner_subscriptions")
      .select("*, subscription_plans(name, included_credits, extra_credit_price)")
      .eq("owner_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (subData?.subscription_plans) {
      setSubscriptionInfo({
        included_credits: subData.subscription_plans.included_credits || 0,
        extra_credit_price: subData.subscription_plans.extra_credit_price || 500,
        plan_name: subData.subscription_plans.name || "Standard",
      });
    }

    // Fetch credit packs
    const { data: packs } = await supabase
      .from("credit_packs")
      .select("*")
      .eq("is_active", true)
      .order("credits", { ascending: true });

    setCreditPacks(packs || []);

    // Fetch user profile for email/phone
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, phone")
      .eq("user_id", userId)
      .single();

    if (profile) {
      setUserEmail(profile.email || "");
      setUserPhone(profile.phone || "");
    }

    setLoading(false);
  };

  const handlePurchase = async (packId: string) => {
    setPurchasing(true);
    setSelectedPack(packId);

    try {
      // Create a pending purchase record
      const pack = creditPacks.find(p => p.id === packId);
      if (!pack) throw new Error("Pack not found");

      const totalCredits = pack.credits + (pack.bonus_credits || 0);

      const { data: purchase, error } = await supabase
        .from("credit_purchases")
        .insert({
          user_id: userId,
          pack_id: packId,
          credits_purchased: totalCredits,
          amount_paid: pack.price,
          payment_method: "cinetpay",
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setPendingPurchaseId(purchase.id);
      setShowPaymentModal(true);
    } catch (error) {
      toast.error("Erreur lors de la préparation du paiement.");
    } finally {
      setPurchasing(false);
      setSelectedPack(null);
    }
  };

  const handlePaymentSuccess = (transactionId: string) => {
    setShowPaymentModal(false);
    setShowSuccess(true);
    toast.success("Paiement réussi ! Vos crédits ont été ajoutés.");
    
    setTimeout(() => {
      fetchData();
      setShowSuccess(false);
      setPendingPurchaseId(null);
    }, 2000);
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setPendingPurchaseId(null);
  };

  const selectedPackDetails = selectedPack ? creditPacks.find(p => p.id === selectedPack) : 
    (pendingPurchaseId ? creditPacks.find(p => {
      // Find pack by checking pending purchase
      return true; // Will be refined
    }) : null);

  const getCurrentPackForPayment = () => {
    if (!pendingPurchaseId) return null;
    // Find the pack that matches the pending purchase
    return creditPacks.find(p => p.id === selectedPack) || creditPacks[0];
  };

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
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Crédits de Connexion</h1>
        <p className="text-muted-foreground">Frais de mise en relation locataire-propriétaire</p>
      </div>

      {/* Subscription Credits Info */}
      {subscriptionInfo && (
        <div className="glass-card p-4 border border-green-500/30 bg-green-500/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-400 mb-1">
                Crédits inclus dans votre abonnement {subscriptionInfo.plan_name}
              </h3>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-400">{subscriptionInfo.included_credits}</span>
                  <span className="text-sm text-muted-foreground">crédits/mois inclus</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-sm text-muted-foreground">
                  Crédit suppl.: <strong className="text-foreground">{formatCurrency(subscriptionInfo.extra_credit_price)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explanation Banner */}
      <div className="glass-card p-4 border border-blue-500/30 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-400 mb-1">Comment ça marche ?</h3>
            <p className="text-sm text-muted-foreground">
              Chaque fois qu'un locataire confirme une réservation sur l'un de vos véhicules, 
              <strong className="text-foreground"> 1 crédit</strong> est débité de votre wallet. 
              {subscriptionInfo 
                ? ` Vos ${subscriptionInfo.included_credits} crédits mensuels sont renouvelés automatiquement.`
                : " Rechargez votre wallet pour recevoir des réservations."}
            </p>
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

      {/* Wallet Card - Glassmorphic */}
      <div className="glass-card p-6 md:p-8 border border-glass-border relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-secondary/20 to-primary/20 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary bg-[length:200%_200%] animate-gradient flex items-center justify-center shadow-lg shadow-primary/30">
              <Wallet className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Solde disponible</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold gradient-text tabular-nums">
                  {(wallet?.balance || 0).toLocaleString()}
                </span>
                <span className="text-lg text-muted-foreground">crédits</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ≈ {formatCurrency((wallet?.balance || 0) * 500)} de valeur
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="glass px-5 py-3 rounded-xl font-medium border border-glass-border hover:border-primary/30 transition-all flex items-center gap-2"
            >
              <History className="w-5 h-5" />
              <span className="hidden md:inline">Historique</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      {showHistory && (
        <div className="glass-card p-6 border border-glass-border animate-fade-in">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Historique des transactions
          </h3>
          
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune transaction pour le moment
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
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
      )}

      {/* Credit Packs */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Recharger mon wallet</h2>
          </div>
          <span className="text-sm text-muted-foreground px-3 py-1 rounded-full bg-muted">
            1 crédit = 1 mise en relation
          </span>
        </div>

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
              {/* Popular badge */}
              {pack.is_popular && (
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                  POPULAIRE
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform",
                    pack.is_popular
                      ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>

              <h3 className="font-bold text-lg mb-1">{pack.name}</h3>
              
              {/* Total credits display (base + bonus) */}
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold gradient-text">
                  {pack.credits + (pack.bonus_credits || 0)}
                </span>
                <span className="text-muted-foreground">crédits</span>
              </div>

              {/* Show breakdown if there's a bonus */}
              {pack.bonus_credits > 0 && (
                <div className="flex items-center gap-1 text-green-400 text-sm mb-3">
                  <Gift className="w-4 h-4" />
                  <span>{pack.credits} + {pack.bonus_credits} bonus</span>
                </div>
              )}

              {/* No bonus - add spacing */}
              {!pack.bonus_credits && <div className="mb-3" />}

              <div className="pt-3 border-t border-glass-border">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {formatCurrency(pack.price)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatPricePerCredit(Math.round(pack.price / (pack.credits + (pack.bonus_credits || 0))))}
                </p>
              </div>

              {/* Loading overlay */}
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
      <div className="glass-card p-6 border border-glass-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-secondary" />
          Méthodes de paiement acceptées
        </h3>
        <div className="flex flex-wrap gap-4">
          {[
            { name: "Orange Money", color: "bg-orange-500", icon: "🟠" },
            { name: "MTN MoMo", color: "bg-yellow-500", icon: "🟡" },
            { name: "Wave", color: "bg-blue-500", icon: "🔵" },
            { name: "Moov Money", color: "bg-blue-400", icon: "🔷" }].map((method) => (
            <div
              key={method.name}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-glass-border"
            >
              <span className="text-lg">{method.icon}</span>
              <span className="font-medium text-sm">{method.name}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          💡 <strong>Rappel :</strong> Votre abonnement inclut déjà des crédits chaque mois. 
          Achetez des crédits supplémentaires uniquement si vous dépassez votre quota mensuel.
        </p>
      </div>

      {/* CinetPay Payment Modal */}
      {showPaymentModal && pendingPurchaseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <button
              onClick={handlePaymentCancel}
              className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-destructive/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <CinetPayCheckout
              amount={creditPacks.find(p => p.id === selectedPack)?.price || 0}
              currency="XOF"
              description={`Achat de crédits GoMonto - ${creditPacks.find(p => p.id === selectedPack)?.name || "Pack"}`}
              customerName="Client GoMonto"
              customerEmail={userEmail}
              customerPhone={userPhone}
              creditPurchaseId={pendingPurchaseId}
              onSuccess={handlePaymentSuccess}
              onError={(error) => toast.error(error)}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletManager;
