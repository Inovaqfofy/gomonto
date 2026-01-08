import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, Car, CalendarCheck, Wallet, AlertTriangle, 
  TrendingUp, ShieldAlert, Clock, ArrowRight 
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AdminStats {
  totalUsers: number;
  newUsersThisWeek: number;
  totalVehicles: number;
  activeVehicles: number;
  totalReservations: number;
  pendingReservations: number;
  monthlyRevenue: number;
  pendingKYC: number;
  openIncidents: number;
  nonCompliantVehicles: number;
}

interface AdminDashboardOverviewProps {
  onNavigate: (view: string) => void;
}

const AdminDashboardOverview = ({ onNavigate }: AdminDashboardOverviewProps) => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    newUsersThisWeek: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    totalReservations: 0,
    pendingReservations: 0,
    monthlyRevenue: 0,
    pendingKYC: 0,
    openIncidents: 0,
    nonCompliantVehicles: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchStats = async () => {
    try {
      // Get users count
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get new users this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: newUsersThisWeek } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      // Get vehicles count
      const { count: totalVehicles } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true });

      const { count: activeVehicles } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Get reservations
      const { count: totalReservations } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true });

      const { count: pendingReservations } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Get monthly revenue
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data: monthlyReservations } = await supabase
        .from("reservations")
        .select("connection_fee")
        .in("status", ["confirmed", "guaranteed", "completed"])
        .gte("created_at", startOfMonth.toISOString());

      const monthlyRevenue = monthlyReservations?.reduce(
        (sum, r) => sum + (r.connection_fee || 0), 0
      ) || 0;

      // Get pending KYC
      const { count: pendingKYC } = await supabase
        .from("kyc_documents")
        .select("*", { count: "exact", head: true })
        .eq("status", "uploaded");

      // Get open incidents
      const { count: openIncidents } = await supabase
        .from("incident_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Get non-compliant vehicles
      const today = new Date().toISOString().split("T")[0];
      const { count: nonCompliantVehicles } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .or(`insurance_expiry_date.lt.${today},technical_inspection_expiry_date.lt.${today}`);

      setStats({
        totalUsers: totalUsers || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        totalVehicles: totalVehicles || 0,
        activeVehicles: activeVehicles || 0,
        totalReservations: totalReservations || 0,
        pendingReservations: pendingReservations || 0,
        monthlyRevenue,
        pendingKYC: pendingKYC || 0,
        openIncidents: openIncidents || 0,
        nonCompliantVehicles: nonCompliantVehicles || 0,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: reservations } = await supabase
        .from("reservations")
        .select(`
          id, status, created_at, total_price,
          vehicles(brand, model),
          profiles!reservations_renter_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentActivity(reservations || []);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Utilisateurs Total",
      value: stats.totalUsers,
      subtitle: `+${stats.newUsersThisWeek} cette semaine`,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Véhicules",
      value: stats.totalVehicles,
      subtitle: `${stats.activeVehicles} actifs`,
      icon: Car,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Réservations",
      value: stats.totalReservations,
      subtitle: `${stats.pendingReservations} en attente`,
      icon: CalendarCheck,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Revenus du Mois",
      value: `${stats.monthlyRevenue.toLocaleString()} FCFA`,
      subtitle: "Commissions plateforme",
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    }];

  const alerts = [
    {
      title: "KYC en attente",
      count: stats.pendingKYC,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      action: () => onNavigate("admin-users"),
    },
    {
      title: "Incidents ouverts",
      count: stats.openIncidents,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      action: () => onNavigate("admin-disputes"),
    },
    {
      title: "Véhicules non-conformes",
      count: stats.nonCompliantVehicles,
      icon: ShieldAlert,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      action: () => onNavigate("admin-vehicles"),
    }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
          <p className="text-muted-foreground">Vue d'ensemble de la plateforme GoMonto</p>
        </div>
        <Badge variant="destructive" className="text-sm">
          Administration
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="glass-card border-glass-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
                </div>
                <div className={`${kpi.bgColor} p-3 rounded-xl`}>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Section */}
      <Card className="glass-card border-glass-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Alertes Critiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.map((alert, index) => (
              <button
                key={index}
                onClick={alert.action}
                className={`${alert.bgColor} p-4 rounded-xl text-left hover:opacity-80 transition-opacity`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <alert.icon className={`w-5 h-5 ${alert.color}`} />
                    <div>
                      <p className="font-medium text-foreground">{alert.title}</p>
                      <p className={`text-2xl font-bold ${alert.color}`}>{alert.count}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="glass-card border-glass-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Activité Récente
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => onNavigate("admin-reservations")}>
            Voir tout
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {activity.vehicles?.brand} {activity.vehicles?.model}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.profiles?.full_name || "Utilisateur"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      activity.status === "confirmed" ? "default" :
                      activity.status === "pending" ? "secondary" : "outline"
                    }
                  >
                    {activity.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(activity.created_at), "dd MMM HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Aucune activité récente
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => onNavigate("kyc-admin")}
        >
          <Clock className="w-6 h-6" />
          <span>Vérifier KYC</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => onNavigate("admin-users")}
        >
          <Users className="w-6 h-6" />
          <span>Gérer Utilisateurs</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => onNavigate("admin-vehicles")}
        >
          <Car className="w-6 h-6" />
          <span>Gérer Véhicules</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => onNavigate("admin-finance")}
        >
          <Wallet className="w-6 h-6" />
          <span>Voir Finances</span>
        </Button>
      </div>
    </div>
  );
};

export default AdminDashboardOverview;
