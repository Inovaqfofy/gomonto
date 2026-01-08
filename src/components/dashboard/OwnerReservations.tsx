import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, CheckCircle, AlertTriangle, Clock, Phone, MessageSquare, Car } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

interface OwnerReservationsProps {
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
  created_at: string;
  vehicle: {
    brand: string;
    model: string;
  };
  renter: {
    full_name: string;
    email: string;
  };
}

const OwnerReservations = ({ userId }: OwnerReservationsProps) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "guaranteed" | "pending">("all");

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
          renter: { full_name: "Client", email: "" }
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
    if (reservation.is_guaranteed) {
      return {
        label: "Garantie",
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        glow: "shadow-[0_0_15px_rgba(34,197,94,0.2)]",
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
      label: "En cours",
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/30",
      glow: "",
      icon: Clock,
    };
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
          <p className="text-muted-foreground">{reservations.length} réservation{reservations.length !== 1 ? "s" : ""}</p>
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
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
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

            return (
              <div
                key={reservation.id}
                className={cn(
                  "glass-card p-5 border transition-all",
                  status.border,
                  status.glow
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Vehicle Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <Car className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {reservation.vehicle?.brand} {reservation.vehicle?.model}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(reservation.start_date), "d MMM", { locale: fr })} - {format(new Date(reservation.end_date), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                    status.bg,
                    status.color
                  )}>
                    <status.icon className="w-4 h-4" />
                    {status.label}
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(reservation.total_price)}</p>
                    {reservation.deposit_paid && (
                      <p className="text-sm text-green-400">
                        Acompte: {formatCurrency(reservation.deposit_amount)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Renter Info */}
                <div className="mt-4 pt-4 border-t border-glass-border flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Client</p>
                    <p className="font-medium">{reservation.renter?.full_name || "Utilisateur"}</p>
                  </div>

                  {reservation.renter_phone && (
                    <a
                      href={`tel:${reservation.renter_phone}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass border border-glass-border hover:border-primary/30 transition-colors text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      {reservation.renter_phone}
                    </a>
                  )}

                  {reservation.renter_message && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{reservation.renter_message}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OwnerReservations;
