import { useEffect, useState } from "react";
import { AlertCircle, CreditCard, Loader2, CheckCircle, X, RefreshCw } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CinetPayCheckout from "@/components/payment/CinetPayCheckout";

const STORAGE_KEY = "cinetpay_pending_payment";

interface PendingPayment {
  transactionId: string;
  reservationId?: string;
  creditPurchaseId?: string;
  timestamp: number;
}

interface PaymentContext {
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

type RecoveryStatus = "idle" | "found" | "checking" | "success" | "failed" | "dismissed";

export default function PendingPaymentRecovery() {
  const [status, setStatus] = useState<RecoveryStatus>("idle");
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentContext, setPaymentContext] = useState<PaymentContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  useEffect(() => {
    // Check URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    
    // Check localStorage for pending payment
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      
      const data = JSON.parse(stored) as PendingPayment;
      
      // Expire after 1 hour
      if (Date.now() - data.timestamp > 3600000) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      
      setPendingPayment(data);
      
      // If returning from payment, auto-check status
      if (paymentStatus === "pending" || paymentStatus === "success") {
        setStatus("checking");
        checkPaymentStatus(data.transactionId);
        
        // Clean URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("payment");
        newUrl.searchParams.delete("reservation_id");
        newUrl.searchParams.delete("credit_purchase_id");
        window.history.replaceState({}, "", newUrl.toString());
      } else {
        setStatus("found");
      }
    } catch (e) {
      console.warn("Could not check pending payment", e);
    }
  }, []);

  const checkPaymentStatus = async (transactionId: string) => {
    setStatus("checking");
    
    try {
      const { data, error } = await supabase.functions.invoke("cinetpay-check-status", {
        body: { transaction_id: transactionId },
      });

      if (error) throw new Error(error.message);

      if (data.status === "completed") {
        setStatus("success");
        clearPendingPayment();
        
        // Update reservation if exists
        if (pendingPayment?.reservationId) {
          await supabase
            .from("reservations")
            .update({
              payment_reference: transactionId,
              deposit_paid: true,
              status: "guaranteed",
            })
            .eq("id", pendingPayment.reservationId);
        }
        
        toast.success("Paiement confirmé !", {
          description: "Votre paiement a été traité avec succès.",
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => setStatus("dismissed"), 5000);
      } else if (data.status === "failed") {
        setStatus("failed");
        clearPendingPayment();
        toast.error("Paiement échoué", {
          description: "Le paiement n'a pas pu être finalisé.",
        });
      } else {
        // Still pending
        setStatus("found");
        toast.info("Paiement en cours de traitement...", {
          description: "Nous vérifions votre paiement.",
        });
      }
    } catch (error) {
      console.error("Payment check error:", error);
      setStatus("found");
      toast.error("Erreur de vérification", {
        description: "Impossible de vérifier le statut du paiement.",
      });
    }
  };

  const clearPendingPayment = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Could not clear pending payment", e);
    }
  };

  const handleDismiss = () => {
    clearPendingPayment();
    setPendingPayment(null);
    setStatus("dismissed");
  };

  const handleRetry = () => {
    if (pendingPayment?.transactionId) {
      checkPaymentStatus(pendingPayment.transactionId);
    }
  };

  const handlePayNow = async () => {
    if (!pendingPayment?.reservationId) {
      toast.error("Impossible de relancer le paiement sans réservation");
      return;
    }

    setLoadingContext(true);
    try {
      // Fetch reservation details
      const { data: reservation, error: resError } = await supabase
        .from("reservations")
        .select(`
          id,
          deposit_amount,
          deposit_paid,
          has_digital_guarantee,
          guarantee_cost,
          renter_id,
          vehicles (brand, model)
        `)
        .eq("id", pendingPayment.reservationId)
        .single();

      if (resError || !reservation) {
        throw new Error("Réservation introuvable");
      }

      // Already paid?
      if (reservation.deposit_paid) {
        toast.success("Cette réservation est déjà payée !");
        handleDismiss();
        return;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, phone, full_name")
        .eq("user_id", reservation.renter_id)
        .single();

      // Also fetch renter_phone from reservation
      const { data: fullReservation } = await supabase
        .from("reservations")
        .select("renter_phone")
        .eq("id", pendingPayment.reservationId)
        .single();

      // Calculate amount
      const amountToPay = reservation.has_digital_guarantee
        ? reservation.guarantee_cost
        : reservation.deposit_amount;

      if (!amountToPay || amountToPay <= 0) {
        toast.error("Montant invalide pour le paiement");
        return;
      }

      const vehicleInfo = reservation.vehicles as { brand: string; model: string } | null;
      const description = reservation.has_digital_guarantee
        ? `Garantie digitale - ${vehicleInfo?.brand || ""} ${vehicleInfo?.model || ""}`
        : `Caution - ${vehicleInfo?.brand || ""} ${vehicleInfo?.model || ""}`;

      // Prioritize renter_phone from reservation, fallback to profile phone
      const customerPhone = fullReservation?.renter_phone || profile?.phone || "";

      setPaymentContext({
        amount: amountToPay,
        description,
        customerName: profile?.full_name || "Client GoMonto",
        customerEmail: profile?.email || "",
        customerPhone,
      });

      setShowPaymentModal(true);
    } catch (error) {
      console.error("Error loading payment context:", error);
      toast.error("Impossible de charger les informations de paiement");
    } finally {
      setLoadingContext(false);
    }
  };

  // Don't render if no pending payment or dismissed
  if (status === "idle" || status === "dismissed" || !pendingPayment) {
    return null;
  }

  return (
    <>
      <Card className="mb-6 border-primary/50 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {status === "checking" ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin flex-shrink-0 mt-0.5" />
            ) : status === "success" ? (
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
            ) : status === "failed" ? (
              <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            ) : (
              <CreditCard className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1 min-w-0">
              {status === "checking" && (
                <>
                  <p className="font-medium text-sm">Vérification du paiement en cours...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Transaction: {pendingPayment.transactionId}
                  </p>
                </>
              )}
              
              {status === "success" && (
                <>
                  <p className="font-medium text-sm text-green-600">Paiement confirmé !</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Votre réservation est maintenant garantie.
                  </p>
                </>
              )}
              
              {status === "failed" && (
                <>
                  <p className="font-medium text-sm text-destructive">Paiement non finalisé</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Le paiement n'a pas abouti. Vous pouvez réessayer.
                  </p>
                </>
              )}
              
              {status === "found" && (
                <>
                  <p className="font-medium text-sm">Paiement en attente détecté</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Un paiement initié n'a pas été finalisé.
                  </p>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {(status === "found" || status === "failed") && pendingPayment.reservationId && (
                <Button 
                  size="sm" 
                  onClick={handlePayNow}
                  disabled={loadingContext}
                >
                  {loadingContext ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-1" />
                      Payer
                    </>
                  )}
                </Button>
              )}
              {(status === "found" || status === "failed") && (
                <Button size="sm" variant="outline" onClick={handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Vérifier
                </Button>
              )}
              {status !== "checking" && (
                <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finaliser votre paiement</DialogTitle>
          </DialogHeader>
          {paymentContext && pendingPayment?.reservationId && (
            <CinetPayCheckout
              amount={paymentContext.amount}
              description={paymentContext.description}
              customerName={paymentContext.customerName}
              customerEmail={paymentContext.customerEmail}
              customerPhone={paymentContext.customerPhone}
              reservationId={pendingPayment.reservationId}
              onSuccess={() => {
                toast.success("Paiement effectué avec succès !");
                setShowPaymentModal(false);
                handleDismiss();
                // Refresh page to update dashboard
                window.location.reload();
              }}
              onError={(error) => {
                toast.error(`Erreur: ${error}`);
              }}
              onCancel={() => {
                setShowPaymentModal(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
