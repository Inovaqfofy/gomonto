import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Shield, TrendingUp, Download, AlertTriangle, CheckCircle, 
  Clock, XCircle, FileText, DollarSign, Users
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface GuaranteeStats {
  totalGuarantees: number;
  activeGuarantees: number;
  claimedGuarantees: number;
  totalRevenue: number;
  avgGuaranteeCost: number;
  monthlyData: { month: string; count: number; revenue: number }[];
}

interface DigitalGuarantee {
  id: string;
  reservation_id: string;
  renter_id: string;
  deposit_waived: number;
  total_cost: number;
  daily_rate: number;
  status: string;
  claim_amount: number | null;
  claim_reason: string | null;
  created_at: string;
  renter_name?: string;
  vehicle_name?: string;
}

const statusConfig = {
  active: { label: "Active", color: "bg-green-500/10 text-green-500", icon: CheckCircle },
  claimed: { label: "Réclamée", color: "bg-red-500/10 text-red-500", icon: AlertTriangle },
  expired: { label: "Expirée", color: "bg-gray-500/10 text-gray-500", icon: Clock },
  cancelled: { label: "Annulée", color: "bg-yellow-500/10 text-yellow-500", icon: XCircle },
};

const AdminGuaranteesTracking = () => {
  const [stats, setStats] = useState<GuaranteeStats>({
    totalGuarantees: 0,
    activeGuarantees: 0,
    claimedGuarantees: 0,
    totalRevenue: 0,
    avgGuaranteeCost: 0,
    monthlyData: [],
  });
  const [guarantees, setGuarantees] = useState<DigitalGuarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "claimed">("all");

  useEffect(() => {
    fetchGuarantees();
  }, []);

  const fetchGuarantees = async () => {
    try {
      const { data: guaranteesData } = await supabase
        .from("digital_guarantees")
        .select("*")
        .order("created_at", { ascending: false });

      if (guaranteesData) {
        // Enrich with renter and vehicle info
        const enriched = await Promise.all(
          guaranteesData.map(async (g) => {
            const { data: reservation } = await supabase
              .from("reservations")
              .select(`
                vehicles(brand, model),
                profiles!reservations_renter_id_fkey(full_name)
              `)
              .eq("id", g.reservation_id)
              .single();

            return {
              ...g,
              renter_name: (reservation?.profiles as any)?.full_name || "Locataire",
              vehicle_name: reservation?.vehicles 
                ? `${(reservation.vehicles as any).brand} ${(reservation.vehicles as any).model}`
                : "Véhicule",
            };
          })
        );

        setGuarantees(enriched);

        // Calculate stats
        const totalRevenue = guaranteesData.reduce((sum, g) => sum + g.total_cost, 0);
        const activeCount = guaranteesData.filter((g) => g.status === "active").length;
        const claimedCount = guaranteesData.filter((g) => g.status === "claimed").length;

        // Monthly aggregation
        const monthlyMap = new Map<string, { count: number; revenue: number }>();
        guaranteesData.forEach((g) => {
          const monthKey = format(new Date(g.created_at), "MMM yyyy", { locale: fr });
          const current = monthlyMap.get(monthKey) || { count: 0, revenue: 0 };
          monthlyMap.set(monthKey, {
            count: current.count + 1,
            revenue: current.revenue + g.total_cost,
          });
        });

        setStats({
          totalGuarantees: guaranteesData.length,
          activeGuarantees: activeCount,
          claimedGuarantees: claimedCount,
          totalRevenue,
          avgGuaranteeCost: guaranteesData.length > 0 ? totalRevenue / guaranteesData.length : 0,
          monthlyData: Array.from(monthlyMap.entries())
            .slice(-6)
            .map(([month, data]) => ({ month, ...data })),
        });
      }
    } catch (error) {
      console.error("Error fetching guarantees:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Date", "Locataire", "Véhicule", "Caution évitée", "Coût garantie", "Statut", "Réclamation"];
    const rows = guarantees.map((g) => [
      format(new Date(g.created_at), "dd/MM/yyyy"),
      g.renter_name,
      g.vehicle_name,
      g.deposit_waived,
      g.total_cost,
      g.status,
      g.claim_amount || 0]);
    
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `garanties_digitales_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const filteredGuarantees = guarantees.filter((g) => {
    if (filter === "all") return true;
    return g.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-500" />
            Suivi Garanties Digitales
          </h1>
          <p className="text-muted-foreground">Tableau de bord assureur - Garanties GoMonto</p>
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export Assureur
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-card border-glass-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-xl">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Garanties</p>
                <p className="text-2xl font-bold">{stats.totalGuarantees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-3 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actives</p>
                <p className="text-2xl font-bold">{stats.activeGuarantees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/10 p-3 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Réclamations</p>
                <p className="text-2xl font-bold">{stats.claimedGuarantees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-3 rounded-xl">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenus Total</p>
                <p className="text-xl font-bold">{stats.totalRevenue.toLocaleString()} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/10 p-3 rounded-xl">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coût Moyen</p>
                <p className="text-xl font-bold">{Math.round(stats.avgGuaranteeCost).toLocaleString()} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {stats.monthlyData.length > 0 && (
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle className="text-lg">Évolution des souscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "count" ? value : `${value.toLocaleString()} FCFA`,
                    name === "count" ? "Garanties" : "Revenus"]}
                  contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { id: "all", label: "Toutes" },
          { id: "active", label: "Actives" },
          { id: "claimed", label: "Réclamées" }].map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.id as typeof filter)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Guarantees Table */}
      <Card className="glass-card border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Liste des Garanties ({filteredGuarantees.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Locataire</TableHead>
                <TableHead>Véhicule</TableHead>
                <TableHead>Caution évitée</TableHead>
                <TableHead>Coût garantie</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Réclamation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuarantees.map((g) => {
                const config = statusConfig[g.status as keyof typeof statusConfig] || statusConfig.active;
                return (
                  <TableRow key={g.id}>
                    <TableCell>{format(new Date(g.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{g.renter_name}</TableCell>
                    <TableCell>{g.vehicle_name}</TableCell>
                    <TableCell className="font-medium">{g.deposit_waived.toLocaleString()} FCFA</TableCell>
                    <TableCell className="text-emerald-500 font-medium">{g.total_cost.toLocaleString()} FCFA</TableCell>
                    <TableCell>
                      <Badge className={config.color}>{config.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {g.claim_amount ? (
                        <span className="text-red-500 font-medium">{g.claim_amount.toLocaleString()} FCFA</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredGuarantees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune garantie trouvée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGuaranteesTracking;
