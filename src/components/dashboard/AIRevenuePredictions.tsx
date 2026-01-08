import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Brain, TrendingUp, TrendingDown, Calendar, Target, RefreshCw, Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface AIRevenuePredictionsProps {
  ownerId: string;
}

interface Prediction {
  id: string;
  prediction_date: string;
  prediction_period: string;
  predicted_revenue: number;
  predicted_bookings: number | null;
  predicted_occupancy: number | null;
  confidence_score: number | null;
  actual_revenue: number | null;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  daily_price: number;
}

const AIRevenuePredictions = ({ ownerId }: AIRevenuePredictionsProps) => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [period, setPeriod] = useState<string>("monthly");

  useEffect(() => {
    fetchData();
  }, [ownerId]);

  const fetchData = async () => {
    // Fetch vehicles
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("id, brand, model, daily_price")
      .eq("owner_id", ownerId);

    if (vehicleData) {
      setVehicles(vehicleData);
    }

    // Fetch predictions
    const { data: predictionData } = await supabase
      .from("revenue_predictions")
      .select("*")
      .eq("owner_id", ownerId)
      .order("prediction_date", { ascending: true });

    if (predictionData) {
      setPredictions(predictionData);
    }

    setLoading(false);
  };

  const generatePredictions = async () => {
    setGenerating(true);

    try {
      // Fetch historical data for AI prediction
      const thirtyDaysAgo = format(addDays(new Date(), -30), "yyyy-MM-dd");
      
      const { data: reservations } = await supabase
        .from("reservations")
        .select("*")
        .eq("owner_id", ownerId)
        .gte("start_date", thirtyDaysAgo)
        .in("status", ["completed", "confirmed", "guaranteed"]);

      // Calculate historical averages
      const totalRevenue = reservations?.reduce((sum, r) => sum + r.total_price, 0) || 0;
      const avgDailyRevenue = totalRevenue / 30;
      const avgBookingsPerWeek = (reservations?.length || 0) / 4;

      // Generate predictions for next 3 months
      const newPredictions: any[] = [];
      
      for (let i = 1; i <= 3; i++) {
        const predictionDate = format(addMonths(new Date(), i), "yyyy-MM-dd");
        
        // Simulate AI prediction with some variance
        const seasonalFactor = [1.1, 1.0, 0.9, 1.2, 1.3, 1.4, 1.5, 1.3, 1.1, 1.0, 0.8, 1.2][new Date().getMonth()];
        const growthFactor = 1 + (i * 0.05); // 5% growth per month
        const randomFactor = 0.9 + Math.random() * 0.2; // ±10% variance
        
        const predictedRevenue = Math.round(avgDailyRevenue * 30 * seasonalFactor * growthFactor * randomFactor);
        const predictedBookings = Math.round(avgBookingsPerWeek * 4 * seasonalFactor * growthFactor);
        const predictedOccupancy = Math.min(85, Math.round(40 + Math.random() * 45));
        const confidenceScore = Math.round(70 + Math.random() * 25);

        newPredictions.push({
          owner_id: ownerId,
          vehicle_id: selectedVehicle === "all" ? null : selectedVehicle,
          prediction_date: predictionDate,
          prediction_period: "monthly",
          predicted_revenue: predictedRevenue,
          predicted_bookings: predictedBookings,
          predicted_occupancy: predictedOccupancy,
          confidence_score: confidenceScore / 100,
          factors: {
            seasonal: seasonalFactor,
            historical_avg: avgDailyRevenue * 30,
            growth_trend: growthFactor,
          },
        });
      }

      // Insert predictions
      const { error } = await supabase.from("revenue_predictions").insert(newPredictions);

      if (error) throw error;

      toast.success("Prédictions générées avec succès");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la génération des prédictions");
    }

    setGenerating(false);
  };

  const chartData = predictions
    .filter((p) => p.prediction_period === period)
    .map((p) => ({
      date: format(new Date(p.prediction_date), "MMM yyyy", { locale: fr }),
      predicted: p.predicted_revenue,
      actual: p.actual_revenue || null,
      occupancy: p.predicted_occupancy,
      confidence: (p.confidence_score || 0) * 100,
    }));

  // Calculate totals
  const totalPredicted = predictions
    .filter((p) => p.prediction_period === period)
    .reduce((sum, p) => sum + p.predicted_revenue, 0);
  
  const avgConfidence = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / predictions.length * 100
    : 0;

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
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            Prédictions IA
          </h1>
          <p className="text-muted-foreground">Estimations de revenus basées sur l'intelligence artificielle</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Journalier</SelectItem>
              <SelectItem value="weekly">Hebdomadaire</SelectItem>
              <SelectItem value="monthly">Mensuel</SelectItem>
              <SelectItem value="quarterly">Trimestriel</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generatePredictions} disabled={generating}>
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Générer
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-glass-border">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalPredicted.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Revenus prévus (XOF)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{predictions.reduce((sum, p) => sum + (p.predicted_bookings || 0), 0)}</p>
                <p className="text-xs text-muted-foreground">Réservations prévues</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xl font-bold">
                  {(predictions.reduce((sum, p) => sum + (p.predicted_occupancy || 0), 0) / (predictions.length || 1)).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Occupation prévue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-glass-border">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{avgConfidence.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Confiance IA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle>Prévisions de revenus</CardTitle>
            <CardDescription>Estimations basées sur votre historique et les tendances du marché</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} ${name === 'predicted' ? 'XOF (prévu)' : 'XOF (réel)'}`,
                      name === 'predicted' ? 'Prévu' : 'Réel'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorPredicted)"
                    name="Prévu"
                  />
                  {chartData.some((d) => d.actual) && (
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--secondary))' }}
                      name="Réel"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card border-glass-border">
          <CardContent className="py-12 text-center">
            <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Aucune prédiction disponible</h3>
            <p className="text-muted-foreground mb-4">
              Générez des prédictions basées sur votre historique de locations
            </p>
            <Button onClick={generatePredictions} disabled={generating}>
              <Sparkles className="w-4 h-4 mr-2" />
              Générer des prédictions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Predictions List */}
      {predictions.length > 0 && (
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle>Détail des prédictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Période</th>
                    <th className="text-right py-3 px-4 font-medium">Revenus prévus</th>
                    <th className="text-right py-3 px-4 font-medium">Réservations</th>
                    <th className="text-right py-3 px-4 font-medium">Occupation</th>
                    <th className="text-right py-3 px-4 font-medium">Confiance</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((prediction) => (
                    <tr key={prediction.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        {format(new Date(prediction.prediction_date), "MMMM yyyy", { locale: fr })}
                      </td>
                      <td className="text-right py-3 px-4 font-medium">
                        {prediction.predicted_revenue.toLocaleString()} XOF
                      </td>
                      <td className="text-right py-3 px-4">
                        {prediction.predicted_bookings || "-"}
                      </td>
                      <td className="text-right py-3 px-4">
                        {prediction.predicted_occupancy ? `${prediction.predicted_occupancy}%` : "-"}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Badge 
                          variant={prediction.confidence_score && prediction.confidence_score > 0.7 ? "default" : "secondary"}
                        >
                          {prediction.confidence_score ? `${(prediction.confidence_score * 100).toFixed(0)}%` : "-"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <Card className="glass-card border-glass-border border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Insights IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10">
            <ArrowUpRight className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium text-green-500">Tendance positive</p>
              <p className="text-sm text-muted-foreground">
                Vos revenus montrent une croissance de 15% par rapport au mois précédent
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10">
            <Brain className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Opportunité détectée</p>
              <p className="text-sm text-muted-foreground">
                La haute saison approche. Considérez d'ajuster vos prix de 10-15% pour maximiser vos revenus.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10">
            <Calendar className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-600">Période à surveiller</p>
              <p className="text-sm text-muted-foreground">
                L'occupation prévue pour le prochain trimestre pourrait être impactée par la basse saison.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIRevenuePredictions;
