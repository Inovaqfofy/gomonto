import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus, Trash2, User, Calendar, Shield, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RenterBlacklistProps {
  ownerId: string;
}

interface BlacklistEntry {
  id: string;
  renter_id: string;
  reason: string;
  incident_date: string | null;
  severity: string;
  is_global: boolean;
  created_at: string;
  expires_at: string | null;
  renterName?: string;
  renterEmail?: string;
}

const severityColors = {
  warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  blocked: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  banned: "bg-red-500/10 text-red-500 border-red-500/20",
};

const severityLabels = {
  warning: "Avertissement",
  blocked: "Bloqué",
  banned: "Banni",
};

const RenterBlacklist = ({ ownerId }: RenterBlacklistProps) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newEntry, setNewEntry] = useState({
    renter_email: "",
    reason: "",
    severity: "warning",
    incident_date: "",
  });

  useEffect(() => {
    fetchBlacklist();
  }, [ownerId]);

  const fetchBlacklist = async () => {
    // Fetch owner's blacklist
    const { data: blacklist } = await supabase
      .from("renter_blacklist")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (blacklist) {
      // Fetch renter details for each entry
      const enrichedEntries = await Promise.all(
        blacklist.map(async (entry) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", entry.renter_id)
            .single();

          return {
            ...entry,
            renterName: profile?.full_name || "Utilisateur inconnu",
            renterEmail: profile?.email || "",
          };
        })
      );
      setEntries(enrichedEntries);
    }

    setLoading(false);
  };

  const addToBlacklist = async () => {
    if (!newEntry.renter_email || !newEntry.reason) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    // Find renter by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", newEntry.renter_email)
      .single();

    if (!profile) {
      toast.error("Aucun locataire trouvé avec cet email");
      return;
    }

    const { error } = await supabase.from("renter_blacklist").insert({
      owner_id: ownerId,
      renter_id: profile.user_id,
      reason: newEntry.reason,
      severity: newEntry.severity,
      incident_date: newEntry.incident_date || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Ce locataire est déjà dans votre liste noire");
      } else {
        toast.error("Erreur lors de l'ajout");
      }
    } else {
      toast.success("Locataire ajouté à la liste noire");
      setIsDialogOpen(false);
      setNewEntry({ renter_email: "", reason: "", severity: "warning", incident_date: "" });
      fetchBlacklist();
    }
  };

  const removeFromBlacklist = async (entryId: string) => {
    const { error } = await supabase
      .from("renter_blacklist")
      .delete()
      .eq("id", entryId);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Locataire retiré de la liste noire");
      fetchBlacklist();
    }
  };

  const filteredEntries = entries.filter(
    (entry) =>
      entry.renterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.renterEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            Liste Noire
          </h1>
          <p className="text-muted-foreground">Gérez les locataires problématiques</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter à la liste noire</DialogTitle>
              <DialogDescription>
                Bloquez un locataire pour l'empêcher de réserver vos véhicules
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Email du locataire *</label>
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={newEntry.renter_email}
                  onChange={(e) => setNewEntry({ ...newEntry, renter_email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Motif *</label>
                <Textarea
                  placeholder="Décrivez la raison du blocage..."
                  value={newEntry.reason}
                  onChange={(e) => setNewEntry({ ...newEntry, reason: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sévérité</label>
                <Select
                  value={newEntry.severity}
                  onValueChange={(value) => setNewEntry({ ...newEntry, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">Avertissement</SelectItem>
                    <SelectItem value="blocked">Bloqué</SelectItem>
                    <SelectItem value="banned">Banni définitivement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date de l'incident</label>
                <Input
                  type="date"
                  value={newEntry.incident_date}
                  onChange={(e) => setNewEntry({ ...newEntry, incident_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={addToBlacklist}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un locataire..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Entries */}
      {filteredEntries.length === 0 ? (
        <Card className="glass-card border-glass-border">
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
            <p className="text-muted-foreground">
              Aucun locataire dans votre liste noire
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="glass-card border-glass-border">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{entry.renterName}</h3>
                        <Badge className={`${severityColors[entry.severity as keyof typeof severityColors]} border text-xs`}>
                          {severityLabels[entry.severity as keyof typeof severityLabels]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {entry.renterEmail}
                      </p>
                      <p className="text-sm">{entry.reason}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Ajouté le {format(new Date(entry.created_at), "d MMM yyyy", { locale: fr })}
                        </span>
                        {entry.incident_date && (
                          <span>
                            Incident: {format(new Date(entry.incident_date), "d MMM yyyy", { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromBlacklist(entry.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RenterBlacklist;
