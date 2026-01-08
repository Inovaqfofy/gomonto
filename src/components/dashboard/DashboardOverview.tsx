import { useEffect, useState } from "react";
import { Wallet, Plus, Car, TrendingUp, Calendar, ArrowUpRight, X, Phone, Banknote, Loader2, CheckCircle } from "lucide-react";
import { supabase } from '@/lib/supabase';
import type { DashboardView } from "@/pages/Dashboard";
import ComplianceAlerts from "./ComplianceAlerts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface DashboardOverviewProps {
  userId: string;
  onNavigate: (view: DashboardView) => void;
}

interface WalletData {
  balance: number;
  currency: string;
}

interface Stats {
  totalVehicles: number;
  activeVehicles: number;
  pendingVehicles: number;
}

const DashboardOverview = ({ userId, onNavigate }: DashboardOverviewProps) => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [stats, setStats] = useState<Stats>({ totalVehicles: 0, activeVehicles: 0, pendingVehicles: 0 });
  const [loading, setLoading] = useState(true);
  
  // Withdrawal modal state
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"mobile_money" | "bank_transfer">("mobile_money");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Credit to XOF conversion rate
  const CREDIT_TO_XOF = 500;

  useEffect(() => {
    const fetchData = async () => {
      // Fetch or create wallet
      let { data: walletData } = await supabase
        .from("owner_wallets")
        .select("balance, currency")
        .eq("user_id", userId)
        .single();

      if (!walletData) {
        const { data: newWallet } = await supabase
          .from("owner_wallets")
          .insert({ user_id: userId, balance: 0 })
          .select("balance, currency")
          .single();
        walletData = newWallet;
      }

      setWallet(walletData);

      // Fetch vehicle stats
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("status")
        .eq("owner_id", userId);

      if (vehicles) {
        setStats({
          totalVehicles: vehicles.length,
          activeVehicles: vehicles.filter((v) => v.status === "active").length,
          pendingVehicles: vehicles.filter((v) => v.status === "pending").length,
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    
    if (!amount || amount <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      toast.error("Solde insuffisant");
      return;
    }

    if (withdrawMethod === "mobile_money" && !withdrawPhone) {
      toast.error("Veuillez entrer votre numéro de téléphone");
      return;
    }

    setWithdrawLoading(true);

    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: userId,
          amount,
          payment_method: withdrawMethod,
          phone_number: withdrawMethod === "mobile_money" ? withdrawPhone : null,
          status: "pending"
        });

      if (error) throw error;

      setWithdrawSuccess(true);
      toast.success("Demande de retrait envoyée avec succès");
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setWithdrawOpen(false);
        setWithdrawSuccess(false);
        setWithdrawAmount("");
        setWithdrawPhone("");
      }, 2000);
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast.error("Erreur lors de la demande de retrait");
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const creditBalance = wallet?.balance || 0;
  const xofEquivalent = creditBalance * CREDIT_TO_XOF;

  return (
    <div className="space-y-8">
      {/* Compliance Alerts */}
      <ComplianceAlerts 
        userId={userId} 
        onNavigateToVehicle={(vehicleId) => onNavigate("fleet")}
        onViewAllAlerts={() => onNavigate("compliance")}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Tableau de bord</h1>
        <p className="text-muted-foreground">Gérez votre activité de location sur GoMonto</p>
      </div>

      {/* Wallet Card - Prominent */}
      <div className="glass-card p-6 md:p-8 border border-glass-border relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Wallet className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Solde disponible</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-bold gradient-text">
                  {creditBalance.toLocaleString()}
                </span>
                <span className="text-lg text-muted-foreground">crédits</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ≈ <span className="text-foreground font-medium">{xofEquivalent.toLocaleString()} XOF</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => onNavigate("wallet")}
              className="btn-primary-glow px-6 py-3 rounded-xl font-semibold text-primary-foreground flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="relative z-10">Recharger</span>
            </button>
            <button 
              onClick={() => setWithdrawOpen(true)}
              className="glass px-6 py-3 rounded-xl font-medium border border-glass-border hover:border-primary/30 transition-colors flex items-center gap-2"
            >
              <ArrowUpRight className="w-5 h-5" />
              Retirer
            </button>
          </div>
        </div>

        {/* Payment methods hint */}
        <div className="relative mt-6 pt-6 border-t border-glass-border">
          <p className="text-sm text-muted-foreground">
            💡 Rechargez via <span className="text-primary font-medium">Mobile Money</span>, <span className="text-secondary font-medium">Carte bancaire</span> ou <span className="text-foreground font-medium">Virement</span>
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate("fleet")}
          className="glass-card p-6 border border-glass-border hover-lift text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Car className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Véhicules totaux</p>
          <p className="text-2xl font-bold">{stats.totalVehicles}</p>
        </button>

        <div className="glass-card p-6 border border-glass-border">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Véhicules actifs</p>
          <p className="text-2xl font-bold">{stats.activeVehicles}</p>
        </div>

        <button
          onClick={() => onNavigate("calendar")}
          className="glass-card p-6 border border-glass-border hover-lift text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">En attente</p>
          <p className="text-2xl font-bold">{stats.pendingVehicles}</p>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6 border border-glass-border">
        <h3 className="font-semibold mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate("add-vehicle")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-center">Ajouter un véhicule</span>
          </button>

          <button
            onClick={() => onNavigate("fleet")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-center">Gérer ma flotte</span>
          </button>

          <button
            onClick={() => onNavigate("calendar")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-center">Calendrier</span>
          </button>

          <button 
            onClick={() => onNavigate("wallet")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-center">Historique</span>
          </button>
        </div>
      </div>

      {/* Withdrawal Modal */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Demande de retrait</DialogTitle>
            <DialogDescription>
              Retirez vos crédits vers votre compte Mobile Money
            </DialogDescription>
          </DialogHeader>

          {withdrawSuccess ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-center font-medium">Demande envoyée avec succès!</p>
              <p className="text-sm text-muted-foreground text-center">
                Votre demande sera traitée sous 24-48h
              </p>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Balance display */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground mb-1">Solde disponible</p>
                <p className="text-2xl font-bold">{creditBalance.toLocaleString()} crédits</p>
                <p className="text-sm text-muted-foreground">≈ {xofEquivalent.toLocaleString()} XOF</p>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Montant à retirer (en crédits)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Ex: 100"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={creditBalance}
                />
                {withdrawAmount && parseInt(withdrawAmount) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    = {(parseInt(withdrawAmount) * CREDIT_TO_XOF).toLocaleString()} XOF
                  </p>
                )}
              </div>

              {/* Payment method selection */}
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod("mobile_money")}
                    className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                      withdrawMethod === "mobile_money"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span className="text-sm font-medium">Mobile Money</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod("bank_transfer")}
                    className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                      withdrawMethod === "bank_transfer"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span className="text-sm font-medium">Virement</span>
                  </button>
                </div>
              </div>

              {/* Phone number for Mobile Money */}
              {withdrawMethod === "mobile_money" && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro Mobile Money</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+221 77 000 00 00"
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                  />
                </div>
              )}

              {/* Bank transfer notice */}
              {withdrawMethod === "bank_transfer" && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-600">
                    Pour un virement bancaire, notre équipe vous contactera pour les coordonnées bancaires.
                  </p>
                </div>
              )}

              {/* Submit button */}
              <Button
                className="w-full"
                onClick={handleWithdraw}
                disabled={withdrawLoading || !withdrawAmount || parseInt(withdrawAmount) <= 0}
              >
                {withdrawLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Demander le retrait
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Les retraits sont traités sous 24-48h ouvrées
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardOverview;
