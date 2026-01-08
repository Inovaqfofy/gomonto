import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, Star, Clock, Car } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RenterReliabilityScoreProps {
  renterId: string;
  showDetails?: boolean;
}

interface ReliabilityData {
  score: number;
  total_rentals: number;
  completed_rentals: number;
  cancelled_rentals: number;
  late_returns: number;
  damage_incidents: number;
  average_rating: number;
  payment_reliability: number;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
};

const getScoreBadge = (score: number) => {
  if (score >= 80) return { label: "Excellent", color: "bg-green-500/10 text-green-500 border-green-500/20" };
  if (score >= 60) return { label: "Bon", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };
  if (score >= 40) return { label: "Moyen", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" };
  return { label: "À risque", color: "bg-red-500/10 text-red-500 border-red-500/20" };
};

const RenterReliabilityScore = ({ renterId, showDetails = true }: RenterReliabilityScoreProps) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReliabilityData | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      // First try to get existing score
      const { data: existingScore } = await supabase
        .from("renter_reliability_scores")
        .select("*")
        .eq("renter_id", renterId)
        .single();

      if (existingScore) {
        setData(existingScore);
      } else {
        // Calculate score if not exists - call database function
        const { data: result } = await supabase.rpc("calculate_renter_reliability_score", {
          p_renter_id: renterId,
        });

        if (result) {
          const { data: newScore } = await supabase
            .from("renter_reliability_scores")
            .select("*")
            .eq("renter_id", renterId)
            .single();
          setData(newScore);
        }
      }
      setLoading(false);
    };

    fetchScore();
  }, [renterId]);

  if (loading) {
    return (
      <div className="animate-pulse h-24 bg-muted rounded-xl" />
    );
  }

  if (!data) {
    return (
      <Card className="glass-card border-glass-border">
        <CardContent className="py-6 text-center text-muted-foreground">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nouveau locataire - pas encore de score</p>
        </CardContent>
      </Card>
    );
  }

  const badge = getScoreBadge(data.score);
  const completionRate = data.total_rentals > 0 
    ? (data.completed_rentals / data.total_rentals) * 100 
    : 0;

  if (!showDetails) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 ${getScoreColor(data.score)}`}>
              <Shield className="w-4 h-4" />
              <span className="font-bold">{data.score}</span>
            </div>
            <Badge className={`${badge.color} border text-xs`}>
              {badge.label}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Score de fiabilité basé sur {data.total_rentals} locations</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Card className="glass-card border-glass-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Score de Fiabilité
            </CardTitle>
            <CardDescription>Évaluation automatique basée sur l'historique</CardDescription>
          </div>
          <Badge className={`${badge.color} border text-lg px-3 py-1`}>
            {badge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Gauge */}
        <div className="flex items-center justify-center">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(data.score / 100) * 440} 440`}
                strokeLinecap="round"
                className={getScoreColor(data.score)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getScoreColor(data.score)}`}>
                {data.score}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Car className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{data.total_rentals}</p>
            <p className="text-xs text-muted-foreground">Locations</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{completionRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Complétées</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Star className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold">
              {data.average_rating > 0 ? Number(data.average_rating).toFixed(1) : "-"}
            </p>
            <p className="text-xs text-muted-foreground">Note moyenne</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{(Number(data.payment_reliability) * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Fiabilité paiement</p>
          </div>
        </div>

        {/* Factors */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Facteurs de calcul</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Locations complétées</span>
              </div>
              <span className="font-medium">{data.completed_rentals}</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>

          {data.cancelled_rentals > 0 && (
            <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-orange-500/10">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-orange-500" />
                <span>Annulations</span>
              </div>
              <span className="font-medium text-orange-500">-{data.cancelled_rentals * 5} pts</span>
            </div>
          )}

          {data.damage_incidents > 0 && (
            <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-red-500/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>Incidents signalés</span>
              </div>
              <span className="font-medium text-red-500">-{data.damage_incidents * 10} pts</span>
            </div>
          )}

          {data.late_returns > 0 && (
            <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-yellow-500/10">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span>Retours en retard</span>
              </div>
              <span className="font-medium text-yellow-500">{data.late_returns}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RenterReliabilityScore;
