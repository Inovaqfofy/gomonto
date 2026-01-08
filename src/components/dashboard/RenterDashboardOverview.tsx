import { useEffect, useState } from "react";
import { Car, Calendar, MessageCircle, Gift, Clock, ArrowUpRight, Star } from "lucide-react";
import { supabase } from '@/lib/supabase';
import type { RenterDashboardView } from "@/pages/Dashboard";

interface RenterDashboardOverviewProps {
  userId: string;
  onNavigate: (view: RenterDashboardView) => void;
}

interface Stats {
  activeReservations: number;
  completedReservations: number;
  pendingReservations: number;
}

const RenterDashboardOverview = ({ userId, onNavigate }: RenterDashboardOverviewProps) => {
  const [stats, setStats] = useState<Stats>({ activeReservations: 0, completedReservations: 0, pendingReservations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: reservations } = await supabase
        .from("reservations")
        .select("status")
        .eq("renter_id", userId);

      if (reservations) {
        const today = new Date().toISOString().split("T")[0];
        setStats({
          activeReservations: reservations.filter((r) => r.status === "confirmed" || r.status === "guaranteed").length,
          completedReservations: reservations.filter((r) => r.status === "completed").length,
          pendingReservations: reservations.filter((r) => r.status === "pending").length,
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Mon espace locataire</h1>
        <p className="text-muted-foreground">Gérez vos locations et réservations sur GoMonto</p>
      </div>

      {/* Welcome Card */}
      <div className="glass-card p-6 md:p-8 border border-glass-border relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Car className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Bienvenue sur GoMonto</p>
              <p className="text-xl md:text-2xl font-bold">
                Trouvez le véhicule idéal pour vos besoins
              </p>
            </div>
          </div>

          <button 
            onClick={() => onNavigate("renter-vehicles")}
            className="btn-primary-glow px-6 py-3 rounded-xl font-semibold text-primary-foreground flex items-center gap-2 w-fit"
          >
            <Car className="w-5 h-5" />
            <span className="relative z-10">Rechercher un véhicule</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate("renter-reservations")}
          className="glass-card p-6 border border-glass-border hover-lift text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Réservations en cours</p>
          <p className="text-2xl font-bold">{stats.activeReservations}</p>
        </button>

        <button
          onClick={() => onNavigate("renter-reservations")}
          className="glass-card p-6 border border-glass-border hover-lift text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">En attente</p>
          <p className="text-2xl font-bold">{stats.pendingReservations}</p>
        </button>

        <button
          onClick={() => onNavigate("renter-history")}
          className="glass-card p-6 border border-glass-border hover-lift text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Star className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Locations terminées</p>
          <p className="text-2xl font-bold">{stats.completedReservations}</p>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6 border border-glass-border">
        <h3 className="font-semibold mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate("renter-vehicles")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-center">Louer un véhicule</span>
          </button>

          <button
            onClick={() => onNavigate("renter-reservations")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-center">Mes réservations</span>
          </button>

          <button
            onClick={() => onNavigate("renter-messages")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-center">Messages</span>
          </button>

          <button
            onClick={() => onNavigate("renter-referral")}
            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-center">Parrainage</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenterDashboardOverview;
