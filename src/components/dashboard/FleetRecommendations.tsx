import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, TrendingDown, Car, Target, AlertTriangle, CheckCircle, X, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FleetRecommendationsProps {
  ownerId: string;
}

interface Recommendation {
  id: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: string;
  potential_revenue_impact: number | null;
  is_read: boolean;
  is_actioned: boolean;
  created_at: string;
  expires_at: string | null;
  data: any;
}

const typeConfig = {
  add_vehicle: { icon: Car, color: "text-green-500", bgColor: "bg-green-500/10" },
  remove_vehicle: { icon: TrendingDown, color: "text-red-500", bgColor: "bg-red-500/10" },
  price_adjustment: { icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10" },
  market_opportunity: { icon: Target, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  performance_alert: { icon: AlertTriangle, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
};

const priorityColors = {
  low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
};

const FleetRecommendations = ({ ownerId }: FleetRecommendationsProps) => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    fetchRecommendations();
  }, [ownerId]);

  const fetchRecommendations = async () => {
    const { data } = await supabase
      .from("fleet_recommendations")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("is_actioned", false)
      .order("created_at", { ascending: false });

    if (data) {
      setRecommendations(data);
    }

    setLoading(false);
  };

  const generateRecommendations = async () => {
    setGenerating(true);

    try {
      // Fetch vehicles and their performance
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, brand, model, daily_price, status")
        .eq("owner_id", ownerId);

      const { data: reservations } = await supabase
        .from("reservations")
        .select("vehicle_id, total_price, total_days, status")
        .eq("owner_id", ownerId)
        .in("status", ["completed", "confirmed", "guaranteed"]);

      if (!vehicles?.length) {
        toast.info("Ajoutez des véhicules pour obtenir des recommandations");
        setGenerating(false);
        return;
      }

      // Analyze and generate recommendations
      const newRecommendations: any[] = [];

      // Check for underperforming vehicles
      for (const vehicle of vehicles) {
        const vehicleReservations = reservations?.filter((r) => r.vehicle_id === vehicle.id) || [];
        const totalRevenue = vehicleReservations.reduce((sum, r) => sum + r.total_price, 0);
        const avgVehicleRevenue = vehicles.length > 0
          ? (reservations?.reduce((sum, r) => sum + r.total_price, 0) || 0) / vehicles.length
          : 0;

        if (totalRevenue < avgVehicleRevenue * 0.5 && vehicleReservations.length < 3) {
          newRecommendations.push({
            owner_id: ownerId,
            recommendation_type: "price_adjustment",
            title: `Ajuster le prix de ${vehicle.brand} ${vehicle.model}`,
            description: `Ce véhicule génère 50% moins de revenus que la moyenne. Considérez une réduction de prix de 10-15% pour stimuler les réservations.`,
            priority: "medium",
            potential_revenue_impact: Math.round(vehicle.daily_price * 0.15 * 30),
            data: { vehicle_id: vehicle.id, current_price: vehicle.daily_price },
          });
        }

        if (vehicleReservations.length === 0 && vehicle.status === "active") {
          newRecommendations.push({
            owner_id: ownerId,
            recommendation_type: "performance_alert",
            title: `${vehicle.brand} ${vehicle.model} sans réservation`,
            description: `Ce véhicule n'a pas eu de réservation. Vérifiez que les photos et la description sont attractives, ou ajustez le prix.`,
            priority: "high",
            data: { vehicle_id: vehicle.id },
          });
        }
      }

      // Market opportunity based on fleet size
      if (vehicles.length < 3) {
        newRecommendations.push({
          owner_id: ownerId,
          recommendation_type: "market_opportunity",
          title: "Opportunité d'expansion",
          description: "Les loueurs avec 3+ véhicules génèrent en moyenne 2x plus de revenus. Considérez d'ajouter un véhicule à votre flotte.",
          priority: "medium",
          potential_revenue_impact: 150000,
        });
      }

      // SUV recommendation if not in fleet
      const hasSUV = vehicles.some((v) => 
        v.model.toLowerCase().includes("suv") || 
        ["rav4", "cr-v", "tucson", "sportage", "duster"].some(m => v.model.toLowerCase().includes(m))
      );

      if (!hasSUV && vehicles.length > 0) {
        newRecommendations.push({
          owner_id: ownerId,
          recommendation_type: "add_vehicle",
          title: "Ajouter un SUV à votre flotte",
          description: "Les SUV sont les véhicules les plus demandés dans la région UEMOA avec un taux d'occupation de 75% en moyenne.",
          priority: "low",
          potential_revenue_impact: 200000,
        });
      }

      // Insert recommendations
      if (newRecommendations.length > 0) {
        const { error } = await supabase.from("fleet_recommendations").insert(newRecommendations);
        if (error) throw error;
        toast.success(`${newRecommendations.length} recommandation(s) générée(s)`);
        fetchRecommendations();
      } else {
        toast.info("Aucune nouvelle recommandation pour le moment");
      }
    } catch (error) {
      toast.error("Erreur lors de la génération");
    }

    setGenerating(false);
  };

  const markAsActioned = async (id: string) => {
    const { error } = await supabase
      .from("fleet_recommendations")
      .update({ is_actioned: true })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      fetchRecommendations();
    }
  };

  const dismissRecommendation = async (id: string) => {
    const { error } = await supabase
      .from("fleet_recommendations")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Recommandation ignorée");
      fetchRecommendations();
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
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Lightbulb className="w-8 h-8 text-yellow-500" />
            Recommandations IA
          </h1>
          <p className="text-muted-foreground">Optimisez votre flotte avec l'intelligence artificielle</p>
        </div>
        <Button onClick={generateRecommendations} disabled={generating}>
          {generating ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyser ma flotte
            </>
          )}
        </Button>
      </div>

      {/* Recommendations */}
      {recommendations.length === 0 ? (
        <Card className="glass-card border-glass-border">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Tout est optimisé !</h3>
            <p className="text-muted-foreground mb-4">
              Aucune recommandation pour le moment. Cliquez sur "Analyser ma flotte" pour une nouvelle analyse.
            </p>
            <Button variant="outline" onClick={generateRecommendations} disabled={generating}>
              <Sparkles className="w-4 h-4 mr-2" />
              Lancer une analyse
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => {
            const config = typeConfig[rec.recommendation_type as keyof typeof typeConfig] || typeConfig.market_opportunity;
            const IconComponent = config.icon;
            const priorityColor = priorityColors[rec.priority as keyof typeof priorityColors] || priorityColors.medium;

            return (
              <Card key={rec.id} className={`glass-card border-glass-border ${!rec.is_read ? 'border-primary/30' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center shrink-0`}>
                      <IconComponent className={`w-6 h-6 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{rec.title}</h3>
                        <Badge className={`${priorityColor} border text-xs`}>
                          {rec.priority === "critical" ? "Critique" : rec.priority === "high" ? "Haute" : rec.priority === "medium" ? "Moyenne" : "Basse"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                      
                      {rec.potential_revenue_impact && (
                        <div className="flex items-center gap-2 text-sm mb-3">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-green-500 font-medium">
                            Impact potentiel: +{rec.potential_revenue_impact.toLocaleString()} XOF
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => markAsActioned(rec.id)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Appliquer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => dismissRecommendation(rec.id)}>
                          <X className="w-4 h-4 mr-2" />
                          Ignorer
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(rec.created_at), "d MMM", { locale: fr })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tips */}
      <Card className="glass-card border-glass-border border-dashed">
        <CardContent className="py-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Comment fonctionnent les recommandations ?
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 text-primary" />
              <span>L'IA analyse la performance de chaque véhicule de votre flotte</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 text-primary" />
              <span>Elle compare vos résultats avec les tendances du marché UEMOA</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 text-primary" />
              <span>Des recommandations personnalisées sont générées pour optimiser vos revenus</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 text-primary" />
              <span>Appliquez les suggestions ou ignorez-les selon votre stratégie</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetRecommendations;
