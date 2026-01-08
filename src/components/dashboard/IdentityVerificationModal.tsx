import { useState } from "react";
import { CheckCircle, AlertTriangle, User, FileText, Calendar, IdCard, X, Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RenterKYCViewer from "./RenterKYCViewer";

interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  renterId: string;
  renterName?: string;
  onVerificationComplete: (verified: boolean, notes?: string) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: typeof CheckCircle;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "photo_match",
    label: "Photo conforme",
    description: "La photo du document correspond à la personne présente",
    icon: User,
  },
  {
    id: "original_document",
    label: "Document original",
    description: "Le document présenté est un original (pas une copie)",
    icon: FileText,
  },
  {
    id: "not_expired",
    label: "Document valide",
    description: "Le document n'est pas expiré",
    icon: Calendar,
  },
  {
    id: "name_match",
    label: "Nom correspondant",
    description: "Le nom sur le document correspond à la réservation",
    icon: IdCard,
  }];

const IdentityVerificationModal = ({
  isOpen,
  onClose,
  reservationId,
  renterId,
  renterName,
  onVerificationComplete,
}: IdentityVerificationModalProps) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showAnomalyForm, setShowAnomalyForm] = useState(false);
  const [anomalyDescription, setAnomalyDescription] = useState("");
  const [anomalyType, setAnomalyType] = useState("document_mismatch");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"view" | "verify">("view");

  const toggleItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const allItemsChecked = checkedItems.size === CHECKLIST_ITEMS.length;

  const handleConfirmVerification = async () => {
    if (!allItemsChecked) {
      toast.error("Veuillez confirmer tous les éléments de la checklist");
      return;
    }

    setSubmitting(true);

    try {
      // Record verification in history
      const { error: historyError } = await supabase
        .from("kyc_verification_history")
        .insert({
          user_id: renterId,
          new_status: "verified",
          previous_status: "pre_verified",
          verification_type: "owner_physical",
          reservation_id: reservationId,
          reason: "Vérification physique par le propriétaire",
        });

      if (historyError) throw historyError;

      // Update KYC documents status to verified
      const { error: updateError } = await supabase
        .from("kyc_documents")
        .update({ 
          status: "verified",
          reviewed_at: new Date().toISOString()
        })
        .eq("user_id", renterId);

      if (updateError) throw updateError;

      toast.success("Identité vérifiée avec succès !");
      onVerificationComplete(true);
      onClose();
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Erreur lors de la vérification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportAnomaly = async () => {
    if (!anomalyDescription.trim()) {
      toast.error("Veuillez décrire l'anomalie");
      return;
    }

    setSubmitting(true);

    try {
      // Get a KYC document ID for reference
      const { data: docs } = await supabase
        .from("kyc_documents")
        .select("id")
        .eq("user_id", renterId)
        .limit(1);

      const docId = docs?.[0]?.id;

      // Create anomaly report
      const { error: anomalyError } = await supabase
        .from("kyc_anomalies")
        .insert({
          kyc_document_id: docId,
          reservation_id: reservationId,
          reporter_id: (await supabase.auth.getUser()).data.user?.id,
          anomaly_type: anomalyType,
          description: anomalyDescription,
        });

      if (anomalyError) throw anomalyError;

      // Record in history
      await supabase
        .from("kyc_verification_history")
        .insert({
          user_id: renterId,
          new_status: "rejected",
          previous_status: "pre_verified",
          verification_type: "owner_physical",
          reservation_id: reservationId,
          reason: `Anomalie signalée: ${anomalyType} - ${anomalyDescription}`,
        });

      toast.success("Anomalie signalée. L'équipe GoMonto sera notifiée.");
      onVerificationComplete(false, anomalyDescription);
      onClose();
    } catch (error) {
      console.error("Anomaly report error:", error);
      toast.error("Erreur lors du signalement");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setCheckedItems(new Set());
    setShowAnomalyForm(false);
    setAnomalyDescription("");
    setStep("view");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="glass-card border-glass-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IdCard className="w-5 h-5 text-primary" />
            Vérification d'identité{renterName ? ` - ${renterName}` : ""}
          </DialogTitle>
        </DialogHeader>

        {step === "view" ? (
          <div className="space-y-4">
            <RenterKYCViewer
              renterId={renterId}
              reservationId={reservationId}
              renterName={renterName}
              onVerificationComplete={() => setStep("verify")}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Back button */}
            <button
              onClick={() => setStep("view")}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              ← Retour aux documents
            </button>

            {!showAnomalyForm ? (
              <>
                {/* Verification Checklist */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Checklist de vérification
                  </h4>
                  
                  {CHECKLIST_ITEMS.map((item) => {
                    const isChecked = checkedItems.has(item.id);
                    const ItemIcon = item.icon;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          "w-full p-4 rounded-xl border transition-all text-left flex items-start gap-4",
                          isChecked
                            ? "bg-green-500/10 border-green-500/30"
                            : "glass border-glass-border hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          isChecked ? "bg-green-500 text-white" : "bg-muted"
                        )}>
                          {isChecked ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <ItemIcon className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className={cn(
                            "font-medium",
                            isChecked && "text-green-400"
                          )}>
                            {item.label}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Progress */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {checkedItems.size}/{CHECKLIST_ITEMS.length} vérifications
                  </span>
                  <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                      style={{ width: `${(checkedItems.size / CHECKLIST_ITEMS.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-glass-border">
                  <button
                    onClick={handleConfirmVerification}
                    disabled={!allItemsChecked || submitting}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                      allItemsChecked
                        ? "btn-primary-glow text-primary-foreground"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirmer l'identité
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowAnomalyForm(true)}
                    className="px-6 py-3 rounded-xl glass border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-2"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    Signaler
                  </button>
                </div>
              </>
            ) : (
              /* Anomaly Form */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Signaler une anomalie
                  </h4>
                  <button
                    onClick={() => setShowAnomalyForm(false)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type d'anomalie</label>
                    <select
                      value={anomalyType}
                      onChange={(e) => setAnomalyType(e.target.value)}
                      className="w-full p-3 rounded-xl glass border border-glass-border focus:border-primary/50 focus:outline-none"
                    >
                      <option value="document_mismatch">Document ne correspond pas à la personne</option>
                      <option value="expired_document">Document expiré</option>
                      <option value="copy_not_original">Copie au lieu d'original</option>
                      <option value="name_mismatch">Nom différent de la réservation</option>
                      <option value="suspected_fraud">Suspicion de fraude</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={anomalyDescription}
                      onChange={(e) => setAnomalyDescription(e.target.value)}
                      placeholder="Décrivez l'anomalie constatée..."
                      rows={4}
                      className="w-full p-3 rounded-xl glass border border-glass-border focus:border-primary/50 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleReportAnomaly}
                    disabled={!anomalyDescription.trim() || submitting}
                    className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5" />
                        Envoyer le signalement
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowAnomalyForm(false)}
                    className="px-6 py-3 rounded-xl glass border border-glass-border hover:bg-muted/50 transition-colors"
                  >
                    Annuler
                  </button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Ce signalement sera transmis à l'équipe GoMonto pour investigation.
                  La location peut être refusée en cas de doute.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IdentityVerificationModal;
