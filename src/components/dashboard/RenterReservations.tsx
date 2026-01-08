import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Calendar, Car, MapPin, Clock, MessageCircle, Star, XCircle, CheckCircle, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CinetPayCheckout from "@/components/payment/CinetPayCheckout";
import type { RenterDashboardView } from "@/pages/Dashboard";

interface RenterReservationsProps {
  userId: string;
  onMessage?: (ownerId: string) => void;
  onNavigate?: (view: RenterDashboardView) => void;
}

interface Reservation {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  daily_price: number;
  total_days: number;
  status: string;
  vehicle_id: string;
  owner_id: string;
  deposit_amount: number;
  deposit_paid: boolean;
  has_digital_guarantee: boolean;
  guarantee_cost: number;
  renter_phone?: string | null;
  vehicles?: {
    brand: string;
    model: string;
    location_city: string;
    vehicle_photos?: { file_path: string; is_primary: boolean }[];
  };
}

interface UserProfile {
  email: string | null;
  phone: string | null;
  full_name: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  pending: { label: "En attente", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: Clock },
  guaranteed: { label: "Garantie", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: CheckCircle },
  confirmed: { label: "Confirmée", color: "bg-green-500/10 text-green-400 border-green-500/20", icon: CheckCircle },
  completed: { label: "Terminée", color: "bg-primary/10 text-primary border-primary/20", icon: Star },
  cancelled: { label: "Annulée", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
};

const RenterReservations = ({ userId, onMessage, onNavigate }: RenterReservationsProps) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [paymentReservation, setPaymentReservation] = useState<Reservation | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Fetch user profile for payment
  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("email, phone, full_name")
        .eq("user_id", userId)
        .single();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [userId]);

  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        vehicles (
          brand,
          model,
          location_city,
          vehicle_photos (file_path, is_primary)
        )
      `)
      .eq("renter_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reservations:", error);
      toast.error("Erreur lors du chargement des réservations");
    } else {
      setReservations(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();
  }, [userId]);

  const filteredReservations = reservations.filter((r) => {
    if (filter === "all") return true;
    if (filter === "active") return ["pending", "guaranteed", "confirmed"].includes(r.status);
    if (filter === "completed") return ["completed", "cancelled"].includes(r.status);
    return true;
  });

  const getVehicleImage = (vehicle: Reservation["vehicles"]) => {
    const primaryPhoto = vehicle?.vehicle_photos?.find((p) => p.is_primary);
    return primaryPhoto?.file_path || vehicle?.vehicle_photos?.[0]?.file_path || "/placeholder.svg";
  };

  const handleCancelReservation = async (reservationId: string) => {
    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservationId)
      .eq("renter_id", userId);

    if (error) {
      toast.error("Erreur lors de l'annulation");
    } else {
      toast.success("Réservation annulée");
      setReservations((prev) =>
        prev.map((r) => (r.id === reservationId ? { ...r, status: "cancelled" } : r))
      );
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mes réservations</h1>
          <p className="text-muted-foreground">Suivez l'état de vos locations</p>
        </div>

        <div className="flex gap-2">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f === "all" ? "Toutes" : f === "active" ? "En cours" : "Terminées"}
            </button>
          ))}
        </div>
      </div>

      {filteredReservations.length === 0 ? (
        <div className="glass-card p-12 text-center border border-glass-border">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">Aucune réservation</h3>
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas encore de réservation
          </p>
          <button
            onClick={() => onNavigate?.("renter-vehicles")}
            className="inline-flex items-center gap-2 btn-primary-glow px-6 py-3 rounded-xl font-semibold text-primary-foreground"
          >
            <Car className="w-5 h-5" />
            Trouver un véhicule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => {
            const StatusIcon = statusConfig[reservation.status]?.icon || Clock;
            return (
              <div
                key={reservation.id}
                className="glass-card border border-glass-border overflow-hidden"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-48 h-40 md:h-auto">
                    <img
                      src={getVehicleImage(reservation.vehicles)}
                      alt={`${reservation.vehicles?.brand} ${reservation.vehicles?.model}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {reservation.vehicles?.brand} {reservation.vehicles?.model}
                        </h3>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{reservation.vehicles?.location_city}</span>
                        </div>
                      </div>

                      <Badge className={`${statusConfig[reservation.status]?.color} border`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig[reservation.status]?.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Début</p>
                        <p className="font-medium">
                          {format(new Date(reservation.start_date), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fin</p>
                        <p className="font-medium">
                          {format(new Date(reservation.end_date), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Durée</p>
                        <p className="font-medium">{reservation.total_days} jour(s)</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-medium text-primary">
                          {reservation.total_price.toLocaleString()} XOF
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Payment button for pending/confirmed reservations with unpaid deposit or guarantee */}
                      {(() => {
                        const amountToPay = reservation.has_digital_guarantee 
                          ? reservation.guarantee_cost 
                          : reservation.deposit_amount;
                        const canPay = !reservation.deposit_paid && 
                          amountToPay > 0 && 
                          ["pending", "confirmed"].includes(reservation.status);
                        
                        if (canPay) {
                          return (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setPaymentReservation(reservation)}
                              className="bg-primary hover:bg-primary/90"
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              {reservation.has_digital_guarantee ? "Payer la garantie" : "Payer la caution"}
                            </Button>
                          );
                        }
                        return null;
                      })()}
                      {onMessage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onMessage(reservation.owner_id)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Contacter le loueur
                        </Button>
                      )}
                      {reservation.status === "pending" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelReservation(reservation.id)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Annuler
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      <Dialog open={!!paymentReservation} onOpenChange={() => setPaymentReservation(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentReservation?.has_digital_guarantee ? "Payer votre garantie digitale" : "Payer votre caution"}
            </DialogTitle>
          </DialogHeader>
          {paymentReservation && userProfile && (() => {
            const amountToPay = paymentReservation.has_digital_guarantee 
              ? paymentReservation.guarantee_cost 
              : paymentReservation.deposit_amount;
            const paymentDescription = paymentReservation.has_digital_guarantee
              ? `Garantie digitale - ${paymentReservation.vehicles?.brand} ${paymentReservation.vehicles?.model}`
              : `Caution - ${paymentReservation.vehicles?.brand} ${paymentReservation.vehicles?.model}`;
            // Prioritize renter_phone from reservation, fallback to profile phone
            const customerPhone = paymentReservation.renter_phone || userProfile.phone || "";
            
            return (
              <div>
                <CinetPayCheckout
                  amount={amountToPay}
                  description={paymentDescription}
                  customerName={userProfile.full_name || "Client GoMonto"}
                  customerEmail={userProfile.email || ""}
                  customerPhone={customerPhone}
                  reservationId={paymentReservation.id}
                  onSuccess={() => {
                    toast.success("Paiement effectué avec succès !");
                    setPaymentReservation(null);
                    fetchReservations(); // Refresh reservations
                  }}
                  onError={(error) => {
                    toast.error(`Erreur: ${error}`);
                  }}
                  onCancel={() => {
                    setPaymentReservation(null);
                  }}
                />
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RenterReservations;
