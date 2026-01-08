import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Trash2, RefreshCw, ExternalLink, Copy, AlertCircle, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CalendarSyncProps {
  ownerId: string;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
}

interface CalendarSync {
  id: string;
  vehicle_id: string;
  calendar_name: string;
  ical_url: string;
  sync_direction: string;
  last_synced_at: string | null;
  sync_interval_hours: number;
  is_active: boolean;
  error_message: string | null;
  created_at: string;
}

const CalendarSync = ({ ownerId }: CalendarSyncProps) => {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [syncs, setSyncs] = useState<CalendarSync[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [newSync, setNewSync] = useState({
    vehicle_id: '',
    calendar_name: '',
    ical_url: '',
    sync_direction: 'import',
    sync_interval_hours: 6,
  });

  useEffect(() => {
    fetchData();
  }, [ownerId]);

  const fetchData = async () => {
    const [vehiclesRes, syncsRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select('id, brand, model')
        .eq('owner_id', ownerId),
      supabase
        .from('external_calendar_syncs')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })]);

    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (syncsRes.data) setSyncs(syncsRes.data);
    setLoading(false);
  };

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule inconnu';
  };

  const createSync = async () => {
    if (!newSync.vehicle_id || !newSync.calendar_name || !newSync.ical_url) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    // Validate URL format
    try {
      new URL(newSync.ical_url);
    } catch {
      toast.error("URL du calendrier invalide");
      return;
    }

    const { error } = await supabase.from('external_calendar_syncs').insert({
      owner_id: ownerId,
      ...newSync,
    });

    if (error) {
      toast.error("Erreur lors de la création de la synchronisation");
    } else {
      toast.success("Synchronisation créée avec succès");
      setIsAddDialogOpen(false);
      setNewSync({
        vehicle_id: '',
        calendar_name: '',
        ical_url: '',
        sync_direction: 'import',
        sync_interval_hours: 6,
      });
      fetchData();
    }
  };

  const toggleSyncStatus = async (sync: CalendarSync) => {
    const { error } = await supabase
      .from('external_calendar_syncs')
      .update({ is_active: !sync.is_active })
      .eq('id', sync.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      fetchData();
    }
  };

  const deleteSync = async (syncId: string) => {
    const { error } = await supabase
      .from('external_calendar_syncs')
      .delete()
      .eq('id', syncId);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Synchronisation supprimée");
      fetchData();
    }
  };

  const triggerSync = async (sync: CalendarSync) => {
    setSyncing(prev => new Set(prev).add(sync.id));
    
    try {
      // Call the ical-sync edge function
      const { error } = await supabase.functions.invoke('ical-sync', {
        body: { sync_id: sync.id },
      });

      if (error) throw error;
      
      toast.success("Synchronisation lancée");
      
      // Update last_synced_at
      await supabase
        .from('external_calendar_syncs')
        .update({ last_synced_at: new Date().toISOString(), error_message: null })
        .eq('id', sync.id);
      
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la synchronisation");
      await supabase
        .from('external_calendar_syncs')
        .update({ error_message: 'Échec de la synchronisation' })
        .eq('id', sync.id);
    } finally {
      setSyncing(prev => {
        const newSet = new Set(prev);
        newSet.delete(sync.id);
        return newSet;
      });
    }
  };

  const getExportUrl = (vehicleId: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ical-sync/export/${vehicleId}`;
  };

  const copyExportUrl = (vehicleId: string) => {
    navigator.clipboard.writeText(getExportUrl(vehicleId));
    toast.success("Lien iCal copié dans le presse-papier");
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
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Synchronisation Calendrier
          </h2>
          <p className="text-muted-foreground">Synchronisez vos calendriers avec Airbnb, Booking, etc.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un calendrier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle synchronisation</DialogTitle>
              <DialogDescription>
                Importez un calendrier iCal pour bloquer automatiquement les disponibilités
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Véhicule *</label>
                <Select
                  value={newSync.vehicle_id}
                  onValueChange={(value) => setNewSync({ ...newSync, vehicle_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un véhicule" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.brand} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Nom du calendrier *</label>
                <Input
                  value={newSync.calendar_name}
                  onChange={(e) => setNewSync({ ...newSync, calendar_name: e.target.value })}
                  placeholder="Ex: Airbnb, Booking.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL du calendrier iCal *</label>
                <Input
                  value={newSync.ical_url}
                  onChange={(e) => setNewSync({ ...newSync, ical_url: e.target.value })}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Copiez l'URL du calendrier depuis votre autre plateforme
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Fréquence de synchronisation</label>
                <Select
                  value={newSync.sync_interval_hours.toString()}
                  onValueChange={(value) => setNewSync({ ...newSync, sync_interval_hours: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Toutes les heures</SelectItem>
                    <SelectItem value="6">Toutes les 6 heures</SelectItem>
                    <SelectItem value="12">Toutes les 12 heures</SelectItem>
                    <SelectItem value="24">Une fois par jour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={createSync}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Export Section */}
      <Card className="glass-card border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Exporter vers d'autres plateformes
          </CardTitle>
          <CardDescription>
            Utilisez ces liens iCal pour synchroniser vos réservations GoMonto vers d'autres plateformes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="font-medium">{vehicle.brand} {vehicle.model}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyExportUrl(vehicle.id)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le lien iCal
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Syncs List */}
      {syncs.length === 0 ? (
        <Card className="glass-card border-glass-border">
          <CardContent className="py-12 text-center">
            <Link2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Aucune synchronisation</h3>
            <p className="text-muted-foreground mb-4">
              Importez vos calendriers depuis Airbnb, Booking, ou d'autres plateformes
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un calendrier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {syncs.map((sync) => (
            <Card key={sync.id} className="glass-card border-glass-border">
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{sync.calendar_name}</h3>
                      <Badge variant={sync.is_active ? "default" : "secondary"}>
                        {sync.is_active ? "Actif" : "Inactif"}
                      </Badge>
                      {sync.error_message && (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Erreur
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {getVehicleName(sync.vehicle_id)}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span>Sync: toutes les {sync.sync_interval_hours}h</span>
                      {sync.last_synced_at && (
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-green-500" />
                          Dernière sync: {format(new Date(sync.last_synced_at), "d MMM yyyy HH:mm", { locale: fr })}
                        </span>
                      )}
                    </div>

                    {sync.error_message && (
                      <p className="text-xs text-destructive mt-2">{sync.error_message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerSync(sync)}
                      disabled={syncing.has(sync.id)}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncing.has(sync.id) ? 'animate-spin' : ''}`} />
                      Sync
                    </Button>
                    <Switch
                      checked={sync.is_active}
                      onCheckedChange={() => toggleSyncStatus(sync)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteSync(sync.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarSync;
