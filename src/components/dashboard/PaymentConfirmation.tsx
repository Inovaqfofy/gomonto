import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, User, Car, CreditCard, AlertTriangle, Loader2, Phone, Copy, MessageSquare, Wallet } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { useWalletBalance } from "@/hooks/useWalletBalance";

interface PaymentConfirmationProps {
  ownerId: string;
  onNavigateToWallet?: () => void;
}

interface PendingPayment {
  id: string;
  renter_id: string;
  renter_name: string;
  renter_phone: string;
  vehicle_brand: string;
  vehicle_model: string;
  start_date: string;
  end_date: string;
  total_price: number;
  deposit_amount: number;
  payment_method: string;
  payment_reference_submitted: string;
  payment_submitted_at: string;
  renter_message: string;
}

const paymentMethodLabels: Record<string, { name: string; logo: string; color: string }> = {
  wave: { name: "Wave", logo: "🌊", color: "from-cyan-400 to-cyan-600" },
  orange_money: { name: "Orange Money", logo: "🟠", color: "from-orange-400 to-orange-600" },
  mtn_momo: { name: "MTN MoMo", logo: "🟡", color: "from-yellow-400 to-yellow-600" },
  moov_money: { name: "Moov Money", logo: "🔵", color: "from-blue-400 to-blue-600" },
};

const PaymentConfirmation = ({ ownerId, onNavigateToWallet }: PaymentConfirmationProps) => {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  
  const { balance: walletBalance, loading: walletLoading } = useWalletBalance(ownerId);
  const connectionFee = 5; // Credits needed per confirmation

  useEffect(() => {
    fetchPendingPayments();
  }, [ownerId]);

  const fetchPendingPayments = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id,
        renter_id,
        start_date,
        end_date,
        total_price,
        deposit_amount,
        payment_method,
        payment_reference_submitted,
        payment_submitted_at,
        renter_phone,
        renter_message,
        vehicles!inner(brand, model),
        profiles:renter_id(full_name, phone)
      `)
      .eq("owner_id", ownerId)
      .not("payment_reference_submitted", "is", null)
      .is("payment_confirmed_at", null)
      .is("payment_rejected_at", null)
      .order("payment_submitted_at", { ascending: false });

    if (error) {
      // Error handled silently - no pending payments to show
    } else if (data) {
      const payments: PendingPayment[] = data.map((r: any) => ({
        id: r.id,
        renter_id: r.renter_id,
        renter_name: r.profiles?.full_name || "Locataire",
        renter_phone: r.renter_phone || r.profiles?.phone || "",
        vehicle_brand: r.vehicles?.brand || "",
        vehicle_model: r.vehicles?.model || "",
        start_date: r.start_date,
        end_date: r.end_date,
        total_price: r.total_price,
        deposit_amount: r.deposit_amount,
        payment_method: r.payment_method,
        payment_reference_submitted: r.payment_reference_submitted,
        payment_submitted_at: r.payment_submitted_at,
        renter_message: r.renter_message || "",
      }));
      setPendingPayments(payments);
    }
    
    setLoading(false);
  };

  const handleConfirmPayment = async (reservationId: string, renterId: string) => {
    // Check wallet balance first using hook value
    if (walletBalance < connectionFee) {
      setShowInsufficientBalance(true);
      toast({
        title: "Solde insuffisant",
        description: `Vous avez besoin de ${connectionFee} crédits pour accepter cette réservation.`,
        variant: "destructive",
      });
      return;
    }

    setProcessingId(reservationId);

    try {

      // Update reservation status - trigger will handle wallet deduction
      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          status: "guaranteed",
          is_guaranteed: true,
          deposit_paid: true,
          payment_confirmed_at: new Date().toISOString(),
          payment_date: new Date().toISOString(),
          connection_fee: connectionFee,
        })
        .eq("id", reservationId);

      if (updateError) throw updateError;

      // Notify renter
      await supabase.from("notifications").insert({
        user_id: renterId,
        type: "payment_confirmed",
        title: "Paiement confirmé !",
        message: "Le loueur a confirmé la réception de votre paiement. Votre réservation est maintenant garantie.",
        data: { reservation_id: reservationId },
      });

      toast({
        title: "Paiement confirmé",
        description: `Réservation garantie. ${connectionFee} crédits débités de votre wallet.`,
      });

      // Refresh list
      fetchPendingPayments();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de confirmer le paiement.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPayment = async (reservationId: string, renterId: string) => {
    if (!rejectionReason) {
      toast({
        title: "Raison requise",
        description: "Veuillez indiquer pourquoi le paiement est rejeté.",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(reservationId);

    try {
      // Update reservation
      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          status: "cancelled",
          payment_rejected_at: new Date().toISOString(),
          payment_rejection_reason: rejectionReason,
        })
        .eq("id", reservationId);

      if (updateError) throw updateError;

      // Notify renter
      await supabase.from("notifications").insert({
        user_id: renterId,
        type: "payment_rejected",
        title: "Paiement non reçu",
        message: `Le loueur n'a pas reçu votre paiement. Raison: ${rejectionReason}`,
        data: { reservation_id: reservationId, reason: rejectionReason },
      });

      toast({
        title: "Paiement rejeté",
        description: "Le locataire a été notifié.",
      });

      setShowRejectModal(null);
      setRejectionReason("");
      fetchPendingPayments();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de rejeter le paiement. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !" });
  };

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Confirmation des Paiements</h1>
          <p className="text-muted-foreground">
            Vérifiez la réception des acomptes et confirmez les réservations
          </p>
        </div>
        
        {/* Wallet Balance Indicator */}
        {!walletLoading && (
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border",
            walletBalance < connectionFee
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-primary/10 border-primary/30"
          )}>
            <Wallet className="w-5 h-5" />
            <div>
              <p className="text-sm font-medium">{walletBalance} crédits</p>
              <p className="text-xs opacity-70">Coût: {connectionFee} crédit/réservation</p>
            </div>
          </div>
        )}
      </div>

      {/* Insufficient Balance Warning */}
      {showInsufficientBalance && walletBalance < connectionFee && (
        <div className="glass-card p-4 border border-destructive/30 bg-destructive/10 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">Solde insuffisant</p>
              <p className="text-sm text-muted-foreground">
                Vous avez besoin de {connectionFee} crédits pour confirmer une réservation.
              </p>
            </div>
          </div>
          {onNavigateToWallet && (
            <button
              onClick={onNavigateToWallet}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Recharger mon wallet
            </button>
          )}
        </div>
      )}

      {pendingPayments.length === 0 ? (
        <div className="glass-card p-8 border border-glass-border text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h3 className="text-xl font-semibold mb-2">Tout est en ordre !</h3>
          <p className="text-muted-foreground">
            Aucun paiement en attente de confirmation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending count badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 font-medium">
            <Clock className="w-4 h-4" />
            {pendingPayments.length} paiement{pendingPayments.length > 1 ? "s" : ""} en attente
          </div>

          {pendingPayments.map((payment) => {
            const methodInfo = paymentMethodLabels[payment.payment_method] || { name: "Mobile Money", logo: "📱", color: "from-gray-400 to-gray-600" };
            
            return (
              <div key={payment.id} className="glass-card p-6 border border-glass-border relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
                
                <div className="relative">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${methodInfo.color} flex items-center justify-center text-xl`}>
                        {methodInfo.logo}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{payment.deposit_amount.toLocaleString()} FCFA</p>
                        <p className="text-sm text-muted-foreground">via {methodInfo.name}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Soumis le</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(payment.payment_submitted_at), "d MMM à HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-background/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <User className="w-4 h-4" />
                        Locataire
                      </div>
                      <p className="font-medium">{payment.renter_name}</p>
                      {payment.renter_phone && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">{payment.renter_phone}</span>
                          <button onClick={() => copyToClipboard(payment.renter_phone)} className="hover:text-primary">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-background/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Car className="w-4 h-4" />
                        Véhicule
                      </div>
                      <p className="font-medium">{payment.vehicle_brand} {payment.vehicle_model}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.start_date), "d MMM", { locale: fr })} - {format(new Date(payment.end_date), "d MMM", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {/* Transaction Reference */}
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Référence de transaction</p>
                        <p className="font-mono font-bold text-lg">{payment.payment_reference_submitted}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(payment.payment_reference_submitted)}
                        className="p-2 rounded-lg hover:bg-amber-500/20 transition-colors"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Renter Message */}
                  {payment.renter_message && (
                    <div className="p-3 rounded-lg bg-muted/50 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <MessageSquare className="w-4 h-4" />
                        Message du locataire
                      </div>
                      <p className="text-sm italic">"{payment.renter_message}"</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleConfirmPayment(payment.id, payment.renter_id)}
                      disabled={processingId === payment.id}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors disabled:opacity-50"
                    >
                      {processingId === payment.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Confirmer la réception
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(payment.id)}
                      disabled={processingId === payment.id}
                      className="px-4 py-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 font-medium transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 border border-glass-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Rejeter le paiement</h3>
                <p className="text-sm text-muted-foreground">Cette action annulera la réservation</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-muted-foreground mb-2">
                Raison du rejet (visible par le locataire)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Ex: Paiement non reçu sur mon compte Wave..."
                className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason("");
                }}
                className="flex-1 py-3 rounded-xl glass border border-glass-border hover:border-primary/30 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const payment = pendingPayments.find((p) => p.id === showRejectModal);
                  if (payment) {
                    handleRejectPayment(payment.id, payment.renter_id);
                  }
                }}
                disabled={!rejectionReason || processingId === showRejectModal}
                className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingId === showRejectModal ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Rejeter"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentConfirmation;