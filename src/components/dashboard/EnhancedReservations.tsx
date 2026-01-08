import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DOMPurify from "dompurify";
import { 
  Calendar, CheckCircle, AlertTriangle, Clock, Phone, 
  MessageSquare, Car, FileText, Camera, Download, ExternalLink, UserCheck 
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CheckinPhotos from "./CheckinPhotos";
import RenterKYCViewer from "./RenterKYCViewer";
import IdentityVerificationModal from "./IdentityVerificationModal";

interface EnhancedReservationsProps {
  userId: string;
}

interface Reservation {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  deposit_amount: number;
  deposit_paid: boolean;
  status: string;
  is_guaranteed: boolean;
  renter_phone: string;
  renter_message: string;
  renter_id: string;
  created_at: string;
  vehicle: {
    brand: string;
    model: string;
  };
}

const EnhancedReservations = ({ userId }: EnhancedReservationsProps) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "guaranteed" | "pending">("all");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [contractHtml, setContractHtml] = useState<string>("");
  const [generatingContract, setGeneratingContract] = useState(false);

  useEffect(() => {
    const fetchReservations = async () => {
      const { data } = await supabase
        .from("reservations")
        .select(`
          *,
          vehicle:vehicles(brand, model)
        `)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (data) {
        setReservations(data.map(r => ({
          ...r,
          vehicle: r.vehicle as { brand: string; model: string },
        })));
      }
      setLoading(false);
    };

    fetchReservations();
  }, [userId]);

  const filteredReservations = reservations.filter((r) => {
    if (filter === "guaranteed") return r.is_guaranteed;
    if (filter === "pending") return !r.is_guaranteed && r.status === "pending";
    return true;
  });

  const getStatusConfig = (reservation: Reservation) => {
    if (reservation.is_guaranteed || reservation.status === "guaranteed") {
      return {
        label: "Garantie",
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        glow: "shadow-[0_0_20px_rgba(34,197,94,0.3)]",
        icon: CheckCircle,
      };
    }
    if (reservation.status === "confirmed") {
      return {
        label: "Confirmée",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        glow: "shadow-[0_0_15px_rgba(59,130,246,0.2)]",
        icon: CheckCircle,
      };
    }
    if (reservation.status === "pending") {
      return {
        label: "En attente",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        glow: "shadow-[0_0_15px_rgba(245,158,11,0.2)]",
        icon: AlertTriangle,
      };
    }
    return {
      label: reservation.status,
      color: "text-muted-foreground",
      bg: "bg-muted/10",
      border: "border-glass-border",
      glow: "",
      icon: Clock,
    };
  };

  const generateContract = async (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setGeneratingContract(true);
    setShowContractModal(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: { reservation_id: reservation.id },
      });

      if (error) throw error;

      if (data.success) {
        setContractHtml(data.contract_html);
      } else {
        toast.error(data.message || "Erreur lors de la génération");
        setShowContractModal(false);
      }
    } catch (error) {
      console.error("Contract generation error:", error);
      toast.error("Impossible de générer le contrat");
      setShowContractModal(false);
    } finally {
      setGeneratingContract(false);
    }
  };

  const openCheckin = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowCheckinModal(true);
  };

  const openKYCViewer = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowKYCModal(true);
  };

  const openVerificationModal = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowVerificationModal(true);
  };

  const downloadContract = () => {
    const blob = new Blob([contractHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contrat-${selectedReservation?.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Contrat téléchargé !");
  };

  const printContract = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(contractHtml);
      printWindow.document.close();
      printWindow.print();
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Réservations</h1>
          <p className="text-muted-foreground">
            {reservations.length} réservation{reservations.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { id: "all", label: "Toutes" },
            { id: "guaranteed", label: "Garanties" },
            { id: "pending", label: "En attente" }].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px]",
                filter === f.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "glass border border-glass-border hover:border-primary/30"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reservations List */}
      {filteredReservations.length === 0 ? (
        <div className="glass-card p-12 border border-glass-border text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucune réservation</h3>
          <p className="text-muted-foreground">
            {filter === "all"
              ? "Vous n'avez pas encore reçu de réservations."
              : filter === "guaranteed"
              ? "Aucune réservation garantie pour le moment."
              : "Aucune réservation en attente."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => {
            const status = getStatusConfig(reservation);
            const canGenerateContract = reservation.is_guaranteed || reservation.status === "confirmed";

            return (
              <div
                key={reservation.id}
                className={cn(
                  "glass-card p-5 border transition-all",
                  status.border,
                  status.glow
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Vehicle Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                      <Car className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {reservation.vehicle?.brand} {reservation.vehicle?.model}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(reservation.start_date), "d MMM", { locale: fr })} - {format(new Date(reservation.end_date), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
                    status.bg,
                    status.color
                  )}>
                    <status.icon className="w-4 h-4" />
                    {status.label}
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(reservation.total_price)}</p>
                    {reservation.deposit_paid && (
                      <p className="text-sm text-green-400">
                        Acompte: {formatCurrency(reservation.deposit_amount)} ✓
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Row */}
                <div className="mt-4 pt-4 border-t border-glass-border flex flex-wrap items-center gap-3">
                  {/* Contact */}
                  {reservation.renter_phone && (
                    <a
                      href={`tel:${reservation.renter_phone}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-glass-border hover:border-primary/30 transition-colors text-sm min-h-[44px]"
                    >
                      <Phone className="w-4 h-4" />
                      {reservation.renter_phone}
                    </a>
                  )}

                  {/* Message */}
                  {reservation.renter_message && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground max-w-xs">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="truncate">{reservation.renter_message}</span>
                    </div>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Action Buttons */}
                  {canGenerateContract && (
                    <>
                      <button
                        onClick={() => openKYCViewer(reservation)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm font-medium min-h-[44px]"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">Docs KYC</span>
                      </button>

                      <button
                        onClick={() => openCheckin(reservation)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors text-sm font-medium min-h-[44px]"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="hidden sm:inline">État des lieux</span>
                      </button>

                      <button
                        onClick={() => generateContract(reservation)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium min-h-[44px]"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">Contrat</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Check-in Modal */}
      <Dialog open={showCheckinModal} onOpenChange={setShowCheckinModal}>
        <DialogContent className="glass-card border-glass-border max-w-lg">
          <DialogHeader>
            <DialogTitle>État des lieux - {selectedReservation?.vehicle?.brand} {selectedReservation?.vehicle?.model}</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <CheckinPhotos 
              reservationId={selectedReservation.id}
              onComplete={() => setShowCheckinModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Contract Modal */}
      <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
        <DialogContent className="glass-card border-glass-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Contrat de location</span>
              {!generatingContract && (
                <div className="flex gap-2">
                  <button
                    onClick={downloadContract}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </button>
                  <button
                    onClick={printContract}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Imprimer
                  </button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {generatingContract ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Génération du contrat...</p>
            </div>
          ) : (
            <div 
              className="bg-white rounded-xl p-4 shadow-inner"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contractHtml) }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* KYC Documents Modal */}
      <Dialog open={showKYCModal} onOpenChange={setShowKYCModal}>
        <DialogContent className="glass-card border-glass-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documents KYC du locataire</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <RenterKYCViewer 
              renterId={selectedReservation.renter_id}
              reservationId={selectedReservation.id}
              onVerificationComplete={() => {
                setShowKYCModal(false);
                openVerificationModal(selectedReservation);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Identity Verification Modal */}
      {selectedReservation && (
        <IdentityVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          renterId={selectedReservation.renter_id}
          reservationId={selectedReservation.id}
          renterName="Locataire"
          onVerificationComplete={() => setShowVerificationModal(false)}
        />
      )}
    </div>
  );
};

export default EnhancedReservations;
