import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, CreditCard, Loader2, CheckCircle, XCircle, Clock, Unlock, Lock, ExternalLink, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from "@/lib/currency";
import { calculateDepositFees, SMART_DEPOSIT_FEE_RATE } from "@/lib/cinetpayFees";

interface SmartDepositProps {
  reservationId: string;
  depositAmount: number;
  userId: string;
  isOwner: boolean;
  depositMode?: "direct" | "gomonto" | "digital_guarantee";
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "En attente de paiement", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-4 w-4" /> },
  held: { label: "Sécurisée", color: "bg-blue-100 text-blue-800", icon: <Lock className="h-4 w-4" /> },
  released: { label: "Libérée", color: "bg-green-100 text-green-800", icon: <Unlock className="h-4 w-4" /> },
  captured: { label: "Prélevée", color: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4" /> },
  failed: { label: "Échec", color: "bg-gray-100 text-gray-800", icon: <XCircle className="h-4 w-4" /> },
  expired: { label: "Expirée", color: "bg-gray-100 text-gray-800", icon: <Clock className="h-4 w-4" /> },
};

const SmartDeposit = ({ reservationId, depositAmount, userId, isOwner, depositMode = "gomonto" }: SmartDepositProps) => {
  const queryClient = useQueryClient();
  const [showPartialCaptureModal, setShowPartialCaptureModal] = useState(false);
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [captureReason, setCaptureReason] = useState("");

  const { data: depositTransaction, isLoading } = useQuery({
    queryKey: ["deposit-transaction", reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deposit_transactions")
        .select("*")
        .eq("reservation_id", reservationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Initiate GoMonto deposit payment
  const initiateDepositMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("smart-deposit", {
        body: {
          action: "initiate",
          reservationId,
          amount: depositAmount,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.payment_url) {
        // Redirect to CinetPay payment page
        window.location.href = data.payment_url;
      }
      queryClient.invalidateQueries({ queryKey: ["deposit-transaction", reservationId] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'initier le paiement de la caution.",
        variant: "destructive",
      });
    },
  });

  const releaseDepositMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("smart-deposit", {
        body: {
          action: "release",
          reservationId,
          transactionId: depositTransaction?.id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Caution libérée",
        description: data.message || "La caution a été libérée.",
      });
      queryClient.invalidateQueries({ queryKey: ["deposit-transaction", reservationId] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de libérer la caution.",
        variant: "destructive",
      });
    },
  });

  const captureDepositMutation = useMutation({
    mutationFn: async (reason: string) => {
      const { data, error } = await supabase.functions.invoke("smart-deposit", {
        body: {
          action: "capture",
          reservationId,
          transactionId: depositTransaction?.id,
          captureReason: reason,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Caution prélevée",
        description: "La caution a été prélevée pour couvrir les dommages.",
      });
      queryClient.invalidateQueries({ queryKey: ["deposit-transaction", reservationId] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de prélever la caution.",
        variant: "destructive",
      });
    },
  });

  const partialCaptureMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("smart-deposit", {
        body: {
          action: "partial_capture",
          reservationId,
          transactionId: depositTransaction?.id,
          captureAmount: partialAmount,
          captureReason: captureReason,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Capture partielle effectuée",
        description: data.message,
      });
      setShowPartialCaptureModal(false);
      setPartialAmount(0);
      setCaptureReason("");
      queryClient.invalidateQueries({ queryKey: ["deposit-transaction", reservationId] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer la capture partielle.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const status = depositTransaction?.status || "none";
  const statusInfo = statusConfig[status] || statusConfig.pending;
  const isGoMontoDeposit = depositMode === "gomonto" || depositTransaction?.cinetpay_transaction_id;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                {isGoMontoDeposit ? "Smart Deposit GoMonto" : "Caution Directe"}
              </CardTitle>
            </div>
            {depositTransaction && (
              <Badge className={statusInfo.color}>
                {statusInfo.icon}
                <span className="ml-1">{statusInfo.label}</span>
              </Badge>
            )}
          </div>
          <CardDescription>
            {isGoMontoDeposit 
              ? "Caution sécurisée par GoMonto - Libération ou capture en 1 clic"
              : "Caution gérée directement par le propriétaire"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Montant de la caution</p>
            <p className="text-2xl font-bold">{formatCurrency(depositAmount)}</p>
          </div>

          {/* Renter view - No transaction yet, GoMonto mode */}
          {!depositTransaction && !isOwner && isGoMontoDeposit && (() => {
            const fees = calculateDepositFees(depositAmount);
            return (
              <div className="space-y-4">
                {/* Fee breakdown */}
                <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Caution</span>
                    <span>{formatCurrency(fees.depositAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frais de service ({SMART_DEPOSIT_FEE_RATE * 100}%)</span>
                    <span>{formatCurrency(fees.serviceFee)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-semibold">
                    <span>Total à payer</span>
                    <span>{formatCurrency(fees.totalToPay)}</span>
                  </div>
                </div>

                {/* Warning about non-refundable fees */}
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800 dark:text-amber-200">
                      <p className="font-medium">Frais de service non remboursables</p>
                      <p className="mt-1">
                        Les frais de service de {formatCurrency(fees.serviceFee)} couvrent le traitement sécurisé et ne sont pas remboursables. 
                        En cas de restitution, vous recevrez {formatCurrency(fees.refundableAmount)}.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Caution sécurisée par GoMonto</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Votre caution sera bloquée de manière sécurisée via CinetPay. 
                        Elle vous sera automatiquement restituée sous 48h à la fin de la location si aucun dommage n'est constaté.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => initiateDepositMutation.mutate()}
                  disabled={initiateDepositMutation.isPending}
                >
                  {initiateDepositMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Payer {formatCurrency(fees.totalToPay)}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Paiement sécurisé via Orange Money, MTN MoMo, Wave ou carte bancaire.
                </p>
              </div>
            );
          })()}

          {/* Pending payment - waiting for CinetPay */}
          {depositTransaction?.status === "pending" && depositTransaction?.cinetpay_payment_url && (
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-800">Paiement en attente</p>
                </div>
                <p className="text-xs text-yellow-600">
                  Cliquez sur le bouton ci-dessous pour finaliser votre paiement.
                </p>
              </div>

              {!isOwner && (
                <Button
                  className="w-full"
                  onClick={() => window.location.href = depositTransaction.cinetpay_payment_url!}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Finaliser le paiement
                </Button>
              )}
            </div>
          )}

          {/* Deposit held - Owner actions */}
          {depositTransaction?.status === "held" && isOwner && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800">Caution sécurisée</p>
                </div>
                <p className="text-xs text-blue-600">
                  {isGoMontoDeposit 
                    ? "La caution est sécurisée par GoMonto. Libérez-la après l'état des lieux ou capturez-la en cas de dommages."
                    : "La caution est bloquée. Libérez-la après l'état des lieux."}
                </p>
                {depositTransaction.hold_expires_at && (
                  <p className="text-xs text-blue-500 mt-2">
                    Expire le: {new Date(depositTransaction.hold_expires_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  className="border-green-500 text-green-700 hover:bg-green-50"
                  onClick={() => releaseDepositMutation.mutate()}
                  disabled={releaseDepositMutation.isPending}
                >
                  {releaseDepositMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Unlock className="h-4 w-4 mr-2" />
                  )}
                  Libérer la caution
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="border-amber-500 text-amber-700 hover:bg-amber-50"
                    onClick={() => setShowPartialCaptureModal(true)}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Capture partielle
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-500 text-red-700 hover:bg-red-50"
                    onClick={() => captureDepositMutation.mutate("Dommages constatés lors de l'état des lieux")}
                    disabled={captureDepositMutation.isPending}
                  >
                    {captureDepositMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Capturer tout
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Deposit held - Renter view */}
          {depositTransaction?.status === "held" && !isOwner && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <p className="font-medium text-blue-800">Caution sécurisée</p>
              </div>
              <p className="text-sm text-blue-600">
                Votre caution de {formatCurrency(depositAmount)} est sécurisée. 
                Elle vous sera restituée automatiquement à la fin de la location si aucun dommage n'est constaté.
              </p>
            </div>
          )}

          {/* Released */}
          {depositTransaction?.status === "released" && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 dark:text-green-200 font-medium">Caution libérée</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Libérée le {new Date(depositTransaction.released_at!).toLocaleDateString('fr-FR')}
              </p>
              {depositTransaction.refund_amount && depositTransaction.refund_amount > 0 && (
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Remboursement: {formatCurrency(depositTransaction.refund_amount)}
                </p>
              )}
              {depositTransaction.service_fee && depositTransaction.service_fee > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  (Frais de service de {formatCurrency(depositTransaction.service_fee)} non inclus - non remboursables)
                </p>
              )}
            </div>
          )}

          {/* Captured */}
          {depositTransaction?.status === "captured" && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-red-800 font-medium text-center">Caution prélevée</p>
              {depositTransaction.capture_reason && (
                <p className="text-sm text-red-600 mt-2 text-center">
                  Raison: {depositTransaction.capture_reason}
                </p>
              )}
              {depositTransaction.refund_amount && depositTransaction.refund_amount > 0 && (
                <p className="text-sm text-red-700 mt-1 text-center">
                  Remboursement partiel: {formatCurrency(depositTransaction.refund_amount)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partial Capture Modal */}
      <Dialog open={showPartialCaptureModal} onOpenChange={setShowPartialCaptureModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capture partielle de la caution</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Montant total de la caution: <strong>{formatCurrency(depositAmount)}</strong>
            </div>

            <div className="space-y-2">
              <Label htmlFor="captureAmount">Montant à capturer (FCFA)</Label>
              <Input
                id="captureAmount"
                type="number"
                min={1}
                max={depositAmount - 1}
                value={partialAmount}
                onChange={(e) => setPartialAmount(parseInt(e.target.value) || 0)}
                placeholder="Ex: 10000"
              />
              {partialAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Le locataire sera remboursé de {formatCurrency(depositAmount - partialAmount)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="captureReason">Raison de la capture</Label>
              <Textarea
                id="captureReason"
                value={captureReason}
                onChange={(e) => setCaptureReason(e.target.value)}
                placeholder="Décrivez les dommages constatés..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPartialCaptureModal(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => partialCaptureMutation.mutate()}
              disabled={partialAmount <= 0 || partialAmount >= depositAmount || !captureReason || partialCaptureMutation.isPending}
            >
              {partialCaptureMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Capturer {partialAmount > 0 ? formatCurrency(partialAmount) : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SmartDeposit;
