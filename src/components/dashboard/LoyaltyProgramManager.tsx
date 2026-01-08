import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Trophy, Star, Users, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface LoyaltyProgramManagerProps {
  ownerId: string;
}

interface LoyaltyProgram {
  id: string;
  name: string;
  points_per_day: number;
  points_per_xof: number;
  is_active: boolean;
}

interface LoyaltyTier {
  id: string;
  name: string;
  min_points: number;
  discount_percentage: number;
  benefits: string[];
  color: string;
}

interface RenterPoints {
  id: string;
  renter_id: string;
  total_points: number;
  lifetime_points: number;
  renterName?: string;
  renterEmail?: string;
  currentTier?: string;
}

const defaultTiers = [
  { name: "Bronze", min_points: 0, discount_percentage: 5, benefits: ["5% de réduction"], color: "amber-600" },
  { name: "Argent", min_points: 100, discount_percentage: 10, benefits: ["10% de réduction", "Annulation flexible"], color: "gray-400" },
  { name: "Or", min_points: 500, discount_percentage: 15, benefits: ["15% de réduction", "Annulation flexible", "Véhicule de remplacement"], color: "yellow-500" },
  { name: "Platine", min_points: 1000, discount_percentage: 20, benefits: ["20% de réduction", "Tous les avantages Or", "Service VIP"], color: "purple-500" }];

const LoyaltyProgramManager = ({ ownerId }: LoyaltyProgramManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [renterPoints, setRenterPoints] = useState<RenterPoints[]>([]);

  useEffect(() => {
    fetchProgram();
  }, [ownerId]);

  const fetchProgram = async () => {
    // Fetch or create program
    let { data: programData } = await supabase
      .from("loyalty_programs")
      .select("*")
      .eq("owner_id", ownerId)
      .single();

    if (!programData) {
      // Create default program
      const { data: newProgram } = await supabase
        .from("loyalty_programs")
        .insert({
          owner_id: ownerId,
          name: "Programme Fidélité",
          points_per_day: 10,
          points_per_xof: 100,
        })
        .select()
        .single();
      programData = newProgram;

      // Create default tiers
      if (newProgram) {
        for (const tier of defaultTiers) {
          await supabase.from("loyalty_tiers").insert({
            program_id: newProgram.id,
            name: tier.name,
            min_points: tier.min_points,
            discount_percentage: tier.discount_percentage,
            benefits: tier.benefits,
            color: tier.color,
          });
        }
      }
    }

    if (programData) {
      setProgram(programData);

      // Fetch tiers
      const { data: tierData } = await supabase
        .from("loyalty_tiers")
        .select("*")
        .eq("program_id", programData.id)
        .order("min_points", { ascending: true });

      if (tierData) {
        setTiers(tierData);
      }

      // Fetch renter points
      const { data: pointsData } = await supabase
        .from("renter_loyalty_points")
        .select("*")
        .eq("owner_id", ownerId)
        .order("total_points", { ascending: false });

      if (pointsData) {
        const enrichedPoints = await Promise.all(
          pointsData.map(async (point) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("user_id", point.renter_id)
              .single();

            const tier = tierData?.filter((t) => t.min_points <= point.total_points).pop();

            return {
              ...point,
              renterName: profile?.full_name || "Utilisateur",
              renterEmail: profile?.email || "",
              currentTier: tier?.name || "Bronze",
            };
          })
        );
        setRenterPoints(enrichedPoints);
      }
    }

    setLoading(false);
  };

  const saveProgram = async () => {
    if (!program) return;

    setSaving(true);
    const { error } = await supabase
      .from("loyalty_programs")
      .update({
        name: program.name,
        points_per_day: program.points_per_day,
        points_per_xof: program.points_per_xof,
        is_active: program.is_active,
      })
      .eq("id", program.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Programme mis à jour");
    }
    setSaving(false);
  };

  const saveTier = async (tier: LoyaltyTier) => {
    const { error } = await supabase
      .from("loyalty_tiers")
      .update({
        name: tier.name,
        min_points: tier.min_points,
        discount_percentage: tier.discount_percentage,
        benefits: tier.benefits,
      })
      .eq("id", tier.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour du palier");
    } else {
      toast.success("Palier mis à jour");
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
            <Gift className="w-8 h-8 text-primary" />
            Programme Fidélité
          </h1>
          <p className="text-muted-foreground">Récompensez vos clients réguliers</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Programme actif</span>
            <Switch
              checked={program?.is_active || false}
              onCheckedChange={(checked) => setProgram((p) => p ? { ...p, is_active: checked } : null)}
            />
          </div>
          <Button onClick={saveProgram} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="glass">
          <TabsTrigger value="settings">Configuration</TabsTrigger>
          <TabsTrigger value="tiers">Paliers</TabsTrigger>
          <TabsTrigger value="members">Membres ({renterPoints.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle>Configuration du programme</CardTitle>
              <CardDescription>Définissez comment les points sont gagnés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium">Nom du programme</label>
                <Input
                  value={program?.name || ""}
                  onChange={(e) => setProgram((p) => p ? { ...p, name: e.target.value } : null)}
                  placeholder="Programme Fidélité"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Points par jour de location</label>
                  <Input
                    type="number"
                    value={program?.points_per_day || 10}
                    onChange={(e) => setProgram((p) => p ? { ...p, points_per_day: parseInt(e.target.value) } : null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nombre de points gagnés pour chaque jour de location
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Points par XOF dépensé</label>
                  <Input
                    type="number"
                    value={program?.points_per_xof || 100}
                    onChange={(e) => setProgram((p) => p ? { ...p, points_per_xof: parseInt(e.target.value) } : null)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    1 point gagné tous les X XOF dépensés
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <h4 className="font-medium mb-2">💡 Exemple de gains</h4>
                <p className="text-sm text-muted-foreground">
                  Pour une location de 5 jours à 25,000 XOF/jour :
                  <br />
                  • Points par jours : {(program?.points_per_day || 10) * 5} points
                  <br />
                  • Points par montant : {Math.floor(125000 / (program?.points_per_xof || 100))} points
                  <br />
                  • <strong>Total : {((program?.points_per_day || 10) * 5) + Math.floor(125000 / (program?.points_per_xof || 100))} points</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers">
          <div className="grid gap-4">
            {tiers.map((tier, index) => (
              <Card key={tier.id} className="glass-card border-glass-border">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-${tier.color}/20 flex items-center justify-center`}>
                        <Trophy className={`w-5 h-5 text-${tier.color}`} />
                      </div>
                      <div>
                        <Input
                          value={tier.name}
                          onChange={(e) => {
                            const newTiers = [...tiers];
                            newTiers[index].name = e.target.value;
                            setTiers(newTiers);
                          }}
                          className="font-semibold h-8 w-32"
                        />
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => saveTier(tier)}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Points minimum</label>
                      <Input
                        type="number"
                        value={tier.min_points}
                        onChange={(e) => {
                          const newTiers = [...tiers];
                          newTiers[index].min_points = parseInt(e.target.value);
                          setTiers(newTiers);
                        }}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Réduction (%)</label>
                      <Input
                        type="number"
                        value={tier.discount_percentage}
                        onChange={(e) => {
                          const newTiers = [...tiers];
                          newTiers[index].discount_percentage = parseInt(e.target.value);
                          setTiers(newTiers);
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-xs text-muted-foreground">Avantages</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tier.benefits?.map((benefit, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members">
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle>Membres du programme</CardTitle>
              <CardDescription>Vos clients fidèles et leurs points</CardDescription>
            </CardHeader>
            <CardContent>
              {renterPoints.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun membre pour le moment</p>
                  <p className="text-sm">Les clients gagnent des points après leur première location</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium">Client</th>
                        <th className="text-right py-3 px-4 font-medium">Points actuels</th>
                        <th className="text-right py-3 px-4 font-medium">Points totaux</th>
                        <th className="text-right py-3 px-4 font-medium">Palier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renterPoints.map((rp) => (
                        <tr key={rp.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{rp.renterName}</p>
                              <p className="text-sm text-muted-foreground">{rp.renterEmail}</p>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4 font-medium">{rp.total_points}</td>
                          <td className="text-right py-3 px-4 text-muted-foreground">{rp.lifetime_points}</td>
                          <td className="text-right py-3 px-4">
                            <Badge variant="secondary">{rp.currentTier}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoyaltyProgramManager;
