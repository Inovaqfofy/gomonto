import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, Car, Calendar, Wallet, Users, Target, Clock, Star, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

interface AdvancedAnalyticsProps {
  userId: string;
}

interface VehicleStats {
  id: string;
  brand: string;
  model: string;
  totalRevenue: number;
  totalBookings: number;
  occupancyRate: number;
  avgRating: number;
  avgDailyRate: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  bookings: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

const AdvancedAnalytics = ({ userId }: AdvancedAnalyticsProps) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [vehicleStats, setVehicleStats] = useState<VehicleStats[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [totals, setTotals] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    avgOccupancy: 0,
    avgRating: 0,
    revenueChange: 0,
    bookingsChange: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [userId, period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const days = parseInt(period);
    const startDate = format(subDays(new Date(), days), "yyyy-MM-dd");
    const previousStartDate = format(subDays(new Date(), days * 2), "yyyy-MM-dd");

    // Fetch vehicles
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, brand, model, daily_price")
      .eq("owner_id", userId);

    if (!vehicles?.length) {
      setLoading(false);
      return;
    }

    const vehicleIds = vehicles.map(v => v.id);

    // Fetch reservations for current period
    const { data: currentReservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("owner_id", userId)
      .gte("start_date", startDate)
      .in("status", ["completed", "confirmed", "guaranteed"]);

    // Fetch reservations for previous period
    const { data: previousReservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("owner_id", userId)
      .gte("start_date", previousStartDate)
      .lt("start_date", startDate)
      .in("status", ["completed", "confirmed", "guaranteed"]);

    // Fetch reviews
    const { data: reviews } = await supabase
      .from("reviews")
      .select("vehicle_id, rating")
      .in("vehicle_id", vehicleIds);

    // Calculate vehicle stats
    const stats: VehicleStats[] = vehicles.map(vehicle => {
      const vehicleReservations = currentReservations?.filter(r => r.vehicle_id === vehicle.id) || [];
      const vehicleReviews = reviews?.filter(r => r.vehicle_id === vehicle.id) || [];
      
      const totalRevenue = vehicleReservations.reduce((sum, r) => sum + r.total_price, 0);
      const totalDays = vehicleReservations.reduce((sum, r) => sum + r.total_days, 0);
      const occupancyRate = (totalDays / days) * 100;
      const avgRating = vehicleReviews.length > 0 
        ? vehicleReviews.reduce((sum, r) => sum + r.rating, 0) / vehicleReviews.length 
        : 0;

      return {
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        totalRevenue,
        totalBookings: vehicleReservations.length,
        occupancyRate: Math.min(occupancyRate, 100),
        avgRating,
        avgDailyRate: vehicle.daily_price,
      };
    });

    setVehicleStats(stats.sort((a, b) => b.totalRevenue - a.totalRevenue));

    // Calculate daily revenue
    const dateRange = eachDayOfInterval({
      start: subDays(new Date(), days),
      end: new Date(),
    });

    const daily: DailyRevenue[] = dateRange.map(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayReservations = currentReservations?.filter(r => 
        r.start_date <= dateStr && r.end_date >= dateStr
      ) || [];
      
      return {
        date: format(date, "dd/MM", { locale: fr }),
        revenue: dayReservations.reduce((sum, r) => sum + (r.daily_price || 0), 0),
        bookings: dayReservations.length,
      };
    });

    setDailyRevenue(daily);

    // Calculate totals
    const currentTotal = currentReservations?.reduce((sum, r) => sum + r.total_price, 0) || 0;
    const previousTotal = previousReservations?.reduce((sum, r) => sum + r.total_price, 0) || 0;
    const currentBookings = currentReservations?.length || 0;
    const previousBookings = previousReservations?.length || 0;

    const revenueChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
    const bookingsChange = previousBookings > 0 ? ((currentBookings - previousBookings) / previousBookings) * 100 : 0;
    const avgOccupancy = stats.length > 0 ? stats.reduce((sum, s) => sum + s.occupancyRate, 0) / stats.length : 0;
    const avgRating = stats.filter(s => s.avgRating > 0).length > 0
      ? stats.filter(s => s.avgRating > 0).reduce((sum, s) => sum + s.avgRating, 0) / stats.filter(s => s.avgRating > 0).length
      : 0;

    setTotals({
      totalRevenue: currentTotal,
      totalBookings: currentBookings,
      avgOccupancy,
      avgRating,
      revenueChange,
      bookingsChange,
    });

    setLoading(false);
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
          <h1 className="text-2xl md:text-3xl font-bold">Analytics Avancées</h1>
          <p className="text-muted-foreground">Analysez la performance de votre flotte</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">3 derniers mois</SelectItem>
            <SelectItem value="365">Cette année</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-glass-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              {totals.revenueChange !== 0 && (
                <Badge variant={totals.revenueChange > 0 ? "default" : "destructive"} className="text-xs">
                  {totals.revenueChange > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {Math.abs(totals.revenueChange).toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold">{totals.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Revenus (XOF)</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-5 h-5 text-secondary" />
              {totals.bookingsChange !== 0 && (
                <Badge variant={totals.bookingsChange > 0 ? "default" : "destructive"} className="text-xs">
                  {totals.bookingsChange > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {Math.abs(totals.bookingsChange).toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold">{totals.totalBookings}</p>
            <p className="text-xs text-muted-foreground">Réservations</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{totals.avgOccupancy.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Taux d'occupation</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold">{totals.avgRating.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Note moyenne</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="glass">
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
          <TabsTrigger value="vehicles">Par véhicule</TabsTrigger>
          <TabsTrigger value="occupancy">Occupation</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle>Évolution des revenus</CardTitle>
              <CardDescription>Revenus journaliers sur la période</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyRevenue}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: number) => [`${value.toLocaleString()} XOF`, 'Revenus']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle>Performance par véhicule</CardTitle>
              <CardDescription>Comparaison des revenus générés</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vehicleStats.slice(0, 6)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                    <YAxis dataKey="model" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value: number) => [`${value.toLocaleString()} XOF`, 'Revenus']}
                    />
                    <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy">
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle>Taux d'occupation</CardTitle>
              <CardDescription>Occupation par véhicule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vehicleStats.slice(0, 6).map((v, i) => ({
                        name: `${v.brand} ${v.model}`,
                        value: v.occupancyRate,
                        fill: COLORS[i % COLORS.length],
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {vehicleStats.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Occupation']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vehicle Performance Table */}
      <Card className="glass-card border-glass-border">
        <CardHeader>
          <CardTitle>Détail par véhicule</CardTitle>
          <CardDescription>Performance complète de chaque véhicule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Véhicule</th>
                  <th className="text-right py-3 px-4 font-medium">Revenus</th>
                  <th className="text-right py-3 px-4 font-medium">Réservations</th>
                  <th className="text-right py-3 px-4 font-medium">Occupation</th>
                  <th className="text-right py-3 px-4 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {vehicleStats.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{vehicle.brand} {vehicle.model}</td>
                    <td className="text-right py-3 px-4">{vehicle.totalRevenue.toLocaleString()} XOF</td>
                    <td className="text-right py-3 px-4">{vehicle.totalBookings}</td>
                    <td className="text-right py-3 px-4">
                      <Badge variant={vehicle.occupancyRate > 50 ? "default" : "secondary"}>
                        {vehicle.occupancyRate.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-4">
                      {vehicle.avgRating > 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          {vehicle.avgRating.toFixed(1)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedAnalytics;
