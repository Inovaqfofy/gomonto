import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, Loader2, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/lib/supabase';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const STORAGE_KEY = "cinetpay_pending_payment";

interface PendingPayment {
  transactionId: string;
  reservationId?: string;
  creditPurchaseId?: string;
  timestamp: number;
}

const getPendingPayment = (): PendingPayment | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored) as PendingPayment;
    if (Date.now() - data.timestamp > 3600000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

const clearPendingPayment = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn("Could not clear pending payment");
  }
};

type PaymentStatus = "checking" | "success" | "failed" | "pending" | "unknown";

export default function PaymentConfirmation() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>("checking");
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    const checkPayment = async () => {
      // Get transaction ID from URL or localStorage
      const urlTxnId = searchParams.get("transaction_id");
      const pending = getPendingPayment();
      const txnId = urlTxnId || pending?.transactionId;

      if (!txnId) {
        setStatus("unknown");
        return;
      }

      setTransactionId(txnId);

      try {
        const { data, error } = await supabase.functions.invoke("cinetpay-check-status", {
          body: { transaction_id: txnId },
        });

        if (error) {
          console.error("Error checking payment status:", error);
          setStatus("failed");
          return;
        }

        if (data.status === "completed") {
          setStatus("success");
          clearPendingPayment();
        } else if (data.status === "failed") {
          setStatus("failed");
          clearPendingPayment();
        } else {
          setStatus("pending");
        }
      } catch (error) {
        console.error("Payment check error:", error);
        setStatus("failed");
      }
    };

    checkPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{t("payment.confirmation.title", "Confirmation de paiement")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === "checking" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="text-muted-foreground">
                  {t("payment.confirmation.checking", "Vérification du paiement...")}
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="rounded-full bg-green-100 p-4">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-green-600">
                  {t("payment.confirmation.success", "Paiement confirmé !")}
                </h2>
                <p className="text-center text-muted-foreground">
                  {t("payment.confirmation.successMessage", "Votre réservation est maintenant garantie. Vous recevrez un email de confirmation.")}
                </p>
                {transactionId && (
                  <p className="text-xs text-muted-foreground">
                    Transaction: {transactionId}
                  </p>
                )}
              </div>
            )}

            {status === "failed" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="rounded-full bg-red-100 p-4">
                  <XCircle className="h-16 w-16 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold text-destructive">
                  {t("payment.confirmation.failed", "Paiement non finalisé")}
                </h2>
                <p className="text-center text-muted-foreground">
                  {t("payment.confirmation.failedMessage", "Le paiement n'a pas pu être finalisé. Vous pouvez réessayer depuis votre tableau de bord.")}
                </p>
              </div>
            )}

            {status === "pending" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-16 w-16 text-amber-500" />
                <h2 className="text-xl font-semibold text-amber-600">
                  {t("payment.confirmation.pending", "Paiement en cours")}
                </h2>
                <p className="text-center text-muted-foreground">
                  {t("payment.confirmation.pendingMessage", "Votre paiement est en cours de traitement. Veuillez patienter quelques instants.")}
                </p>
              </div>
            )}

            {status === "unknown" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <XCircle className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-xl font-semibold">
                  {t("payment.confirmation.unknown", "Aucune transaction trouvée")}
                </h2>
                <p className="text-center text-muted-foreground">
                  {t("payment.confirmation.unknownMessage", "Nous n'avons pas pu trouver de transaction en cours.")}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              <Button asChild className="w-full">
                <Link to="/dashboard">
                  {t("payment.confirmation.viewReservations", "Voir mes réservations")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  {t("payment.confirmation.backHome", "Retour à l'accueil")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
