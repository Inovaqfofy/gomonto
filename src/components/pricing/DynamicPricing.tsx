import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, Calendar, Loader2, Check, X, RefreshCw, Sparkles, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { format, addDays, isWithinInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface DynamicPricingProps {
  vehicleId: string;
  currentPrice: number;
  country: string;
}

interface LocalEvent {
  id: string;
  name: string;
  event_type: string;
  country: string;
  city: string | null;
  start_date: string;
  end_date: string;
  demand_multiplier: number;
  description: string | null;
}

interface PricingSuggestion {
  id: string;
  vehicle_id: string;
  suggested_price: number;
  current_price: number;
  reason: string;
  factors: any;
  valid_from: string;
  valid_to: string;
  is_applied: boolean;
}

const eventTypeLabels: Record<string, { label: string; emoji: string }> = {
  holiday: { label: "Vacances", emoji: "🏖️" },
  festival: { label: "Festival", emoji: "🎉" },
  conference: { label: "Conférence", emoji: "🎤" },
  sport: { label: "Sport", emoji: "⚽" },
  religious: { label: "Religieux", emoji: "🕌" },
  other: { label: "Autre", emoji: "📅" },
};

const DynamicPricing = ({ vehicleId, currentPrice, country }: DynamicPricingProps) => {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: upcomingEvents } = useQuery({
    queryKey: ["local-events", country],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const futureDate = format(addDays(new Date(), 90), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("local_events")
        .select("*")
        .eq("country", country)
        .gte("end_date", today)
        .lte("start_date", futureDate)
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data as LocalEvent[];
    },
  });

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["pricing-suggestions", vehicleId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("pricing_suggestions")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .gte("valid_to", today)
        .order("valid_from", { ascending: true });

      if (error) throw error;
      return data as PricingSuggestion[];
    },
  });

  const generateSuggestionsMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);

      // Simple pricing algorithm based on events
      const newSuggestions: Omit<PricingSuggestion, "id">[] = [];

      if (upcomingEvents) {
        for (const event of upcomingEvents) {
          const suggestedPrice = Math.round(currentPrice * event.demand_multiplier);
          const priceChange = ((suggestedPrice - currentPrice) / currentPrice) * 100;

          newSuggestions.push({
            vehicle_id: vehicleId,
            suggested_price: suggestedPrice,
            current_price: currentPrice,
            reason: `${event.name} - Augmentation de ${priceChange.toFixed(0)}% recommandée`,
            factors: {
              event_name: event.name,
              event_type: event.event_type,
              multiplier: event.demand_multiplier,
            },
            valid_from: event.start_date,
            valid_to: event.end_date,
            is_applied: false,
          });
        }
      }

      // Insert suggestions
      if (newSuggestions.length > 0) {
        const { error } = await supabase
          .from("pricing_suggestions")
          .upsert(newSuggestions, { onConflict: "vehicle_id,valid_from" });

        if (error) throw error;
      }

      return newSuggestions;
    },
    onSuccess: () => {
      toast({
        title: "Suggestions générées",
        description: "Les recommandations de prix ont été mises à jour.",
      });
      queryClient.invalidateQueries({ queryKey: ["pricing-suggestions"] });
      setIsGenerating(false);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de générer les suggestions.",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const applySuggestionMutation = useMutation({
    mutationFn: async (suggestion: PricingSuggestion) => {
      // Update vehicle price
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ daily_price: suggestion.suggested_price })
        .eq("id", vehicleId);

      if (vehicleError) throw vehicleError;

      // Mark suggestion as applied
      const { error } = await supabase
        .from("pricing_suggestions")
        .update({ is_applied: true })
        .eq("id", suggestion.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Prix mis à jour",
        description: "Le tarif journalier a été modifié.",
      });
      queryClient.invalidateQueries({ queryKey: ["pricing-suggestions"] });
    },
  });

  const getDemandLevel = (multiplier: number) => {
    if (multiplier >= 1.7) return { label: "Très forte", color: "bg-red-500", value: 100 };
    if (multiplier >= 1.4) return { label: "Forte", color: "bg-orange-500", value: 75 };
    if (multiplier >= 1.2) return { label: "Modérée", color: "bg-yellow-500", value: 50 };
    return { label: "Normale", color: "bg-green-500", value: 25 };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Prix Dynamique
                  <Badge variant="secondary" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Smart
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Suggestions basées sur les événements locaux et la demande
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateSuggestionsMutation.mutate()}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prix actuel</p>
                <p className="text-2xl font-bold">{currentPrice.toLocaleString()} FCFA<span className="text-sm font-normal text-muted-foreground">/jour</span></p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.filter(s => !s.is_applied).map((suggestion) => {
                const priceDiff = suggestion.suggested_price - suggestion.current_price;
                const priceDiffPercent = ((priceDiff / suggestion.current_price) * 100).toFixed(0);
                const isIncrease = priceDiff > 0;

                return (
                  <div
                    key={suggestion.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{suggestion.reason}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(suggestion.valid_from), "d MMM", { locale: fr })} - {format(parseISO(suggestion.valid_to), "d MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <Badge className={isIncrease ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {isIncrease ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                        {priceDiffPercent}%
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Prix suggéré</p>
                        <p className="text-xl font-bold text-primary">
                          {suggestion.suggested_price.toLocaleString()} FCFA
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => applySuggestionMutation.mutate(suggestion)}
                        disabled={applySuggestionMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Appliquer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune suggestion pour le moment</p>
              <p className="text-sm">Cliquez sur "Actualiser" pour générer des recommandations</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Événements à venir</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 5).map((event) => {
                const demandLevel = getDemandLevel(event.demand_multiplier);
                const typeInfo = eventTypeLabels[event.event_type] || eventTypeLabels.other;

                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="text-2xl">{typeInfo.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(event.start_date), "d MMM", { locale: fr })} - {format(parseISO(event.end_date), "d MMM", { locale: fr })}
                        {event.city && ` • ${event.city}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={`${demandLevel.color} text-white`}>
                        {demandLevel.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        x{event.demand_multiplier}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun événement à venir</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DynamicPricing;
