import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, CreditCard, Globe, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { isInternationalCustomer, getPaymentChannels, getAvailablePaymentMethods } from "@/lib/paymentUtils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CinetPayCheckoutProps {
  amount: number;
  currency?: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  reservationId?: string;
  creditPurchaseId?: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

type PaymentStatus = "idle" | "loading" | "redirecting" | "checking" | "success" | "error" | "timeout";

const STORAGE_KEY = "cinetpay_pending_payment";
const REDIRECT_TIMEOUT_KEY = "cinetpay_redirect_timestamp";

interface PendingPayment {
  transactionId: string;
  reservationId?: string;
  creditPurchaseId?: string;
  timestamp: number;
}

const savePendingPayment = (data: PendingPayment) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Also save redirect timestamp to detect timeout
    localStorage.setItem(REDIRECT_TIMEOUT_KEY, Date.now().toString());
  } catch (e) {
    console.warn("Could not save pending payment to localStorage", e);
  }
};

const getPendingPayment = (): PendingPayment | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored) as PendingPayment;
    // Expire after 1 hour
    if (Date.now() - data.timestamp > 3600000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
};

const clearPendingPayment = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REDIRECT_TIMEOUT_KEY);
  } catch (e) {
    console.warn("Could not clear pending payment from localStorage", e);
  }
};

const getRedirectTimestamp = (): number | null => {
  try {
    const ts = localStorage.getItem(REDIRECT_TIMEOUT_KEY);
    return ts ? parseInt(ts, 10) : null;
  } catch (e) {
    return null;
  }
};

// Common payment error messages with user-friendly explanations
const PAYMENT_ERROR_MESSAGES = {
  invalidCard: {
    title: "Carte bancaire invalide",
    description: "Le numéro de carte que vous avez saisi n'est pas valide. Veuillez vérifier les informations de votre carte.",
    tips: [
      "Vérifiez le numéro de carte (16 chiffres)",
      "Vérifiez la date d'expiration (MM/AA)",
      "Vérifiez le code CVV (3 chiffres au dos)"],
  },
  timeout: {
    title: "Paiement non finalisé",
    description: "Le paiement n'a pas été complété. Cela peut arriver si :",
    tips: [
      "La carte a été refusée par votre banque",
      "Le numéro de carte est incorrect",
      "La session de paiement a expiré",
      "Problème de connexion réseau"],
  },
  declined: {
    title: "Paiement refusé",
    description: "Votre banque a refusé la transaction. Veuillez :",
    tips: [
      "Vérifier votre solde disponible",
      "Contacter votre banque pour autoriser la transaction",
      "Essayer une autre carte"],
  },
  generic: {
    title: "Erreur de paiement",
    description: "Une erreur est survenue lors du paiement.",
    tips: [
      "Vérifiez votre connexion internet",
      "Réessayez dans quelques instants",
      "Essayez une autre méthode de paiement"],
  },
};

export default function CinetPayCheckout({
  amount,
  currency = "XOF",
  description,
  customerName,
  customerEmail,
  customerPhone,
  reservationId,
  creditPurchaseId,
  onSuccess,
  onError,
  onCancel,
}: CinetPayCheckoutProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<keyof typeof PAYMENT_ERROR_MESSAGES>("generic");

  // Detect if customer is international based on phone number
  const isInternational = useMemo(() => isInternationalCustomer(customerPhone), [customerPhone]);
  const paymentChannels = useMemo(() => getPaymentChannels(customerPhone), [customerPhone]);
  const availableMethods = useMemo(() => getAvailablePaymentMethods(customerPhone), [customerPhone]);

  const initiatePayment = async () => {
    setStatus("loading");
    setErrorMessage(null);
    setErrorType("generic");

    try {
      // Use dedicated payment confirmation page as return URL
      const returnUrl = new URL(window.location.origin + "/payment/confirmation");
      if (reservationId) returnUrl.searchParams.set("reservation_id", reservationId);
      if (creditPurchaseId) returnUrl.searchParams.set("credit_purchase_id", creditPurchaseId);
      const { data, error } = await supabase.functions.invoke("cinetpay-initiate", {
        body: {
          amount,
          currency,
          description,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          reservation_id: reservationId,
          credit_purchase_id: creditPurchaseId,
          return_url: returnUrl.toString(),
          channels: paymentChannels,
        },
      });

      if (error) {
        throw new Error(error.message || "Payment initiation failed");
      }

      if (!data.success) {
        throw new Error(data.error || "Payment initiation failed");
      }

      const txnId = data.transaction_id;
      setTransactionId(txnId);
      setStatus("redirecting");

      // Store pending payment in localStorage for recovery after redirect
      savePendingPayment({
        transactionId: txnId,
        reservationId,
        creditPurchaseId,
        timestamp: Date.now(),
      });

      // Redirect to CinetPay payment page
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage(message);
      setErrorType("generic");
      setStatus("error");
      onError?.(message);
      toast.error("Erreur de paiement", { description: message });
    }
  };

  const checkPaymentStatus = useCallback(async (txnIdToCheck?: string) => {
    const txnId = txnIdToCheck || transactionId;
    if (!txnId) return;

    setStatus("checking");
    setTransactionId(txnId);

    try {
      const { data, error } = await supabase.functions.invoke("cinetpay-check-status", {
        body: { transaction_id: txnId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.status === "completed") {
        setStatus("success");
        clearPendingPayment();
        onSuccess?.(txnId);
        toast.success("Paiement réussi !");
      } else if (data.status === "failed") {
        setStatus("error");
        clearPendingPayment();
        setErrorMessage("Le paiement a été refusé");
        setErrorType("declined");
        onError?.("Payment failed");
      } else {
        // Still pending - check if we've been waiting too long (user came back without completing)
        const redirectTs = getRedirectTimestamp();
        if (redirectTs && Date.now() - redirectTs > 30000) {
          // More than 30 seconds since redirect - likely a timeout/cancel
          setStatus("timeout");
          setErrorType("timeout");
          setErrorMessage("Le paiement n'a pas été finalisé");
        } else {
          setStatus("idle");
          toast.info("Paiement en cours de traitement...");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage(message);
      setErrorType("generic");
      setStatus("error");
    }
  }, [transactionId, onSuccess, onError]);

  // Check for payment return from URL or recover from localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    
    if (paymentStatus === "pending" || paymentStatus === "success") {
      // Try to recover transaction from localStorage
      const pending = getPendingPayment();
      if (pending?.transactionId) {
        console.log("Recovering pending payment:", pending);
        checkPaymentStatus(pending.transactionId);
        // Clean URL params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("payment");
        newUrl.searchParams.delete("reservation_id");
        newUrl.searchParams.delete("credit_purchase_id");
        window.history.replaceState({}, "", newUrl.toString());
      }
    }

    // Also check if user came back after redirect without completing
    const pending = getPendingPayment();
    const redirectTs = getRedirectTimestamp();
    if (pending && redirectTs && Date.now() - redirectTs > 5000 && status === "idle") {
      // User was redirected and came back - check status
      checkPaymentStatus(pending.transactionId);
    }
  }, [checkPaymentStatus, status]);

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat("fr-FR").format(amt);
  };

  const handleRetry = () => {
    clearPendingPayment();
    setStatus("idle");
    setErrorMessage(null);
    setErrorType("generic");
  };

  const currentError = PAYMENT_ERROR_MESSAGES[errorType];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <CreditCard className="h-5 w-5" />
          Paiement sécurisé
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* International Customer Notice */}
        {isInternational && status === "idle" && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <Globe className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                {t("payment.internationalCustomer", "Voyageur international")}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t("payment.cardOnly", "Le paiement par carte bancaire (Visa/Mastercard) est disponible pour les clients internationaux.")}
              </p>
            </div>
          </div>
        )}

        {/* Amount Display */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">{t("payment.amountToPay", "Montant à payer")}</p>
          <p className="text-3xl font-bold text-primary">
            {formatAmount(amount)} {currency}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        {/* Status Display */}
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Préparation du paiement...</p>
          </div>
        )}

        {status === "redirecting" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Redirection vers CinetPay...</p>
          </div>
        )}

        {status === "checking" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Vérification du paiement...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-lg font-medium text-green-600">Paiement réussi !</p>
            <p className="text-sm text-muted-foreground">
              Transaction: {transactionId}
            </p>
          </div>
        )}

        {/* Error/Timeout Display with detailed feedback */}
        {(status === "error" || status === "timeout") && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{currentError.title}</AlertTitle>
              <AlertDescription className="mt-2">
                {currentError.description}
              </AlertDescription>
            </Alert>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Conseils :</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {currentError.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {errorMessage && errorMessage !== currentError.description && (
              <p className="text-xs text-muted-foreground text-center">
                Détail technique : {errorMessage}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {status === "idle" && (
          <div className="space-y-3">
            <Button onClick={initiatePayment} className="w-full" size="lg">
              <CreditCard className="mr-2 h-4 w-4" />
              Payer {formatAmount(amount)} {currency}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="w-full">
                Annuler
              </Button>
            )}
          </div>
        )}

        {(status === "error" || status === "timeout") && (
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full" size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer le paiement
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="w-full">
                Choisir une autre méthode
              </Button>
            )}
          </div>
        )}

        {/* Payment Methods Info */}
        {status === "idle" && (
          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground mb-3">
              {t("payment.acceptedMethods", "Méthodes de paiement acceptées")}
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              {availableMethods.map((method) => (
                <span
                  key={method}
                  className="text-xs px-2 py-1 bg-muted rounded-full"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Security Note */}
        <p className="text-xs text-center text-muted-foreground">
          🔒 Paiement sécurisé par CinetPay
        </p>
      </CardContent>
    </Card>
  );
}