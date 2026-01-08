import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Wallet, TrendingUp, Download, Calendar, DollarSign,
  CreditCard, ArrowUpRight, ArrowDownRight, PieChart
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPie, Pie, Cell } from "recharts";

interface FinanceStats {
  totalRevenue: number;
  monthlyRevenue: number;
  previousMonthRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
  revenueByCountry: { country: string; revenue: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  paymentMethods: { method: string; count: number; amount: number }[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "#10b981", "#f59e0b", "#8b5cf6"];

const AdminFinanceDashboard = () => {
  const [stats, setStats] = useState<FinanceStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    previousMonthRevenue: 0,
    totalTransactions: 0,
    avgTransactionValue: 0,
    revenueByCountry: [],
    revenueByMonth: [],
    paymentMethods: [],
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    fetchFinanceData();
  }, [period]);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      // Get all completed reservations with connection fees
      const { data: reservations } = await supabase
        .from("reservations")
        .select(`
          id, connection_fee, total_price, payment_method, created_at, status,
          vehicles(location_country)
        `)
        .in("status", ["confirmed", "guaranteed", "completed"]);

      if (reservations) {
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const previousMonthStart = startOfMonth(subMonths(now, 1));
        const previousMonthEnd = endOfMonth(subMonths(now, 1));

        // Calculate total revenue (commissions)
        const totalRevenue = reservations.reduce((sum, r) => sum + (r.connection_fee || 0), 0);

        // Monthly revenue
        const monthlyReservations = reservations.filter(
          r => new Date(r.created_at) >= currentMonthStart
        );
        const monthlyRevenue = monthlyReservations.reduce((sum, r) => sum + (r.connection_fee || 0), 0);

        // Previous month revenue
        const prevMonthReservations = reservations.filter(
          r => new Date(r.created_at) >= previousMonthStart && new Date(r.created_at) <= previousMonthEnd
        );
        const previousMonthRevenue = prevMonthReservations.reduce((sum, r) => sum + (r.connection_fee || 0), 0);

        // Revenue by country
        const countryMap = new Map<string, number>();
        reservations.forEach(r => {
          const country = (r.vehicles as any)?.location_country || "Inconnu";
          countryMap.set(country, (countryMap.get(country) || 0) + (r.connection_fee || 0));
        });
        const revenueByCountry = Array.from(countryMap.entries())
          .map(([country, revenue]) => ({ country, revenue }))
          .sort((a, b) => b.revenue - a.revenue);

        // Revenue by month (last 6 months)
        const monthMap = new Map<string, number>();
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const monthKey = format(monthDate, "MMM yyyy", { locale: fr });
          monthMap.set(monthKey, 0);
        }
        reservations.forEach(r => {
          const monthKey = format(new Date(r.created_at), "MMM yyyy", { locale: fr });
          if (monthMap.has(monthKey)) {
            monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + (r.connection_fee || 0));
          }
        });
        const revenueByMonth = Array.from(monthMap.entries()).map(([month, revenue]) => ({ month, revenue }));

        // Payment methods
        const methodMap = new Map<string, { count: number; amount: number }>();
        reservations.forEach(r => {
          const method = r.payment_method || "non_specifié";
          const current = methodMap.get(method) || { count: 0, amount: 0 };
          methodMap.set(method, {
            count: current.count + 1,
            amount: current.amount + (r.connection_fee || 0),
          });
        });
        const paymentMethods = Array.from(methodMap.entries()).map(([method, data]) => ({
          method,
          count: data.count,
          amount: data.amount,
        }));

        setStats({
          totalRevenue,
          monthlyRevenue,
          previousMonthRevenue,
          totalTransactions: reservations.length,
          avgTransactionValue: reservations.length > 0 ? totalRevenue / reservations.length : 0,
          revenueByCountry,
          revenueByMonth,
          paymentMethods,
        });

        // Set recent transactions
        setTransactions(reservations.slice(0, 20));
      }
    } catch (error) {
      console.error("Error fetching finance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Date", "Montant", "Commission", "Méthode", "Statut"];
    const rows = transactions.map(t => [
      format(new Date(t.created_at), "dd/MM/yyyy"),
      t.total_price,
      t.connection_fee,
      t.payment_method || "N/A",
      t.status]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const revenueGrowth = stats.previousMonthRevenue > 0
    ? ((stats.monthlyRevenue - stats.previousMonthRevenue) / stats.previousMonthRevenue * 100).toFixed(1)
    : 0;

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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Tableau de Bord Financier
          </h1>
          <p className="text-muted-foreground">Vue d'ensemble des revenus de la plateforme</p>
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-glass-border">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenus Total</p>
                <p className="text-2xl font-bold mt-1">{stats.totalRevenue.toLocaleString()} FCFA</p>
                <p className="text-xs text-muted-foreground mt-1">Commissions cumulées</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-xl">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenus du Mois</p>
                <p className="text-2xl font-bold mt-1">{stats.monthlyRevenue.toLocaleString()} FCFA</p>
                <div className="flex items-center gap-1 mt-1">
                  {Number(revenueGrowth) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-xs ${Number(revenueGrowth) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {revenueGrowth}% vs mois précédent
                  </span>
                </div>
              </div>
              <div className="bg-green-500/10 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold mt-1">{stats.totalTransactions}</p>
                <p className="text-xs text-muted-foreground mt-1">Réservations validées</p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-xl">
                <CreditCard className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Commission Moyenne</p>
                <p className="text-2xl font-bold mt-1">{Math.round(stats.avgTransactionValue).toLocaleString()} FCFA</p>
                <p className="text-xs text-muted-foreground mt-1">Par réservation</p>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-xl">
                <PieChart className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Month */}
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle className="text-lg">Évolution des Revenus</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.revenueByMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString()} FCFA`, "Revenus"]}
                  contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Country */}
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle className="text-lg">Revenus par Pays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.revenueByCountry.slice(0, 5).map((item, index) => (
                <div key={item.country} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="capitalize">{item.country.replace("_", " ")}</span>
                  </div>
                  <span className="font-medium">{item.revenue.toLocaleString()} FCFA</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card className="glass-card border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg">Méthodes de Paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.paymentMethods.map((method, index) => (
              <div key={method.method} className="p-4 rounded-lg bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground capitalize">{method.method.replace("_", " ")}</p>
                <p className="text-xl font-bold mt-1">{method.count}</p>
                <p className="text-xs text-muted-foreground">{method.amount.toLocaleString()} FCFA</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="glass-card border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg">Transactions Récentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Montant Total</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{format(new Date(t.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>{t.total_price?.toLocaleString()} FCFA</TableCell>
                  <TableCell className="text-primary font-medium">{t.connection_fee?.toLocaleString()} FCFA</TableCell>
                  <TableCell className="capitalize">{t.payment_method?.replace("_", " ") || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "completed" ? "default" : "secondary"}>
                      {t.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinanceDashboard;
