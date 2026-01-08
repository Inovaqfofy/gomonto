import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, Camera, AlertTriangle, CheckCircle, Loader2, ArrowLeftRight, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface DamageComparisonProps {
  reservationId: string;
  vehicleId: string;
}

interface DetectedDamage {
  location: string;
  severity: "minor" | "moderate" | "severe";
  description: string;
  confidence: number;
}

interface ComparisonResult {
  overallScore: number;
  newDamages: DetectedDamage[];
  summary: string;
}

const DamageComparison = ({ reservationId, vehicleId }: DamageComparisonProps) => {
  const [departurePhotos, setDeparturePhotos] = useState<string[]>([]);
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [selectedView, setSelectedView] = useState<"departure" | "return">("departure");

  const photoPositions = [
    { key: "front", label: "Avant" },
    { key: "back", label: "Arrière" },
    { key: "left", label: "Côté gauche" },
    { key: "right", label: "Côté droit" }];

  const handlePhotoUpload = (type: "departure" | "return", index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === "departure") {
        setDeparturePhotos((prev) => {
          const newPhotos = [...prev];
          newPhotos[index] = base64;
          return newPhotos;
        });
      } else {
        setReturnPhotos((prev) => {
          const newPhotos = [...prev];
          newPhotos[index] = base64;
          return newPhotos;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const analysisMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-damage-detection", {
        body: {
          reservationId,
          vehicleId,
          departurePhotos,
          returnPhotos,
        },
      });

      if (error) throw error;
      return data as ComparisonResult;
    },
    onSuccess: (data) => {
      setComparisonResult(data);
      toast({
        title: "Analyse terminée",
        description: data.newDamages.length > 0 
          ? `${data.newDamages.length} nouveau(x) dommage(s) détecté(s)`
          : "Aucun nouveau dommage détecté",
      });
    },
    onError: (error) => {
      console.error("Analysis error:", error);
      toast({
        title: "Erreur d'analyse",
        description: "L'analyse IA a échoué. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "minor": return "bg-yellow-100 text-yellow-800";
      case "moderate": return "bg-orange-100 text-orange-800";
      case "severe": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "minor": return "Mineur";
      case "moderate": return "Modéré";
      case "severe": return "Grave";
      default: return severity;
    }
  };

  const canAnalyze = departurePhotos.filter(Boolean).length >= 4 && returnPhotos.filter(Boolean).length >= 4;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-full">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              IA Vision
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Zap className="h-3 w-3 mr-1" />
                IA
              </Badge>
            </CardTitle>
            <CardDescription>
              Comparaison automatique départ/retour pour détecter les dommages
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as "departure" | "return")}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="departure" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Départ ({departurePhotos.filter(Boolean).length}/4)
            </TabsTrigger>
            <TabsTrigger value="return" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Retour ({returnPhotos.filter(Boolean).length}/4)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="departure" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              {photoPositions.map((pos, index) => (
                <div key={pos.key} className="space-y-2">
                  <label className="text-sm font-medium">{pos.label}</label>
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                    {departurePhotos[index] ? (
                      <img
                        src={departurePhotos[index]}
                        alt={pos.label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">Ajouter</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handlePhotoUpload("departure", index)}
                        />
                      </label>
                    )}
                    {departurePhotos[index] && (
                      <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <span className="text-white text-sm">Remplacer</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handlePhotoUpload("departure", index)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="return" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              {photoPositions.map((pos, index) => (
                <div key={pos.key} className="space-y-2">
                  <label className="text-sm font-medium">{pos.label}</label>
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                    {returnPhotos[index] ? (
                      <img
                        src={returnPhotos[index]}
                        alt={pos.label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">Ajouter</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handlePhotoUpload("return", index)}
                        />
                      </label>
                    )}
                    {returnPhotos[index] && (
                      <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <span className="text-white text-sm">Remplacer</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handlePhotoUpload("return", index)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Button
          className="w-full"
          size="lg"
          disabled={!canAnalyze || analysisMutation.isPending}
          onClick={() => analysisMutation.mutate()}
        >
          {analysisMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Comparer avec l'IA
            </>
          )}
        </Button>

        {comparisonResult && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Résultat de l'analyse</h4>
              <Badge className={comparisonResult.newDamages.length === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {comparisonResult.newDamages.length === 0 ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    RAS
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {comparisonResult.newDamages.length} dommage(s)
                  </>
                )}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Score de conformité</span>
                <span className="font-medium">{comparisonResult.overallScore}%</span>
              </div>
              <Progress value={comparisonResult.overallScore} className="h-2" />
            </div>

            <p className="text-sm text-muted-foreground">{comparisonResult.summary}</p>

            {comparisonResult.newDamages.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-medium">Dommages détectés :</h5>
                {comparisonResult.newDamages.map((damage, index) => (
                  <div key={index} className="bg-muted/50 p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{damage.location}</span>
                      <Badge className={getSeverityColor(damage.severity)}>
                        {getSeverityLabel(damage.severity)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{damage.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Confiance IA :</span>
                      <Progress value={damage.confidence} className="h-1 flex-1" />
                      <span>{damage.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DamageComparison;
