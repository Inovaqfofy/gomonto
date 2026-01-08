import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Calendar, Plus, Edit, Trash2, Award, CreditCard,
  TrendingUp, MapPin
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LocalEvent {
  id: string;
  name: string;
  description: string;
  event_type: string;
  country: string;
  city: string;
  start_date: string;
  end_date: string;
  demand_multiplier: number;
}

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus_credits: number;
  is_popular: boolean;
  is_active: boolean;
}

interface OwnerBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  color: string;
  is_active: boolean;
}

const AdminContentManagement = () => {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [badges, setBadges] = useState<OwnerBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventDialog, setEventDialog] = useState(false);
  const [packDialog, setPackDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LocalEvent | null>(null);
  const [editingPack, setEditingPack] = useState<CreditPack | null>(null);
  
  const [newEvent, setNewEvent] = useState({
    name: "",
    description: "",
    event_type: "holiday",
    country: "senegal",
    city: "",
    start_date: "",
    end_date: "",
    demand_multiplier: 1.2,
  });

  const [newPack, setNewPack] = useState({
    name: "",
    credits: 10,
    price: 5000,
    bonus_credits: 0,
    is_popular: false,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, packsRes, badgesRes] = await Promise.all([
        supabase.from("local_events").select("*").order("start_date", { ascending: false }),
        supabase.from("credit_packs").select("*").order("credits"),
        supabase.from("owner_badges").select("*").order("criteria_value")]);

      if (eventsRes.data) setEvents(eventsRes.data);
      if (packsRes.data) setCreditPacks(packsRes.data);
      if (badgesRes.data) setBadges(badgesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvent = async () => {
    try {
      if (editingEvent) {
        const { error } = await supabase
          .from("local_events")
          .update(newEvent)
          .eq("id", editingEvent.id);
        if (error) throw error;
        toast.success("Événement mis à jour");
      } else {
        const { error } = await supabase
          .from("local_events")
          .insert(newEvent);
        if (error) throw error;
        toast.success("Événement créé");
      }
      setEventDialog(false);
      setEditingEvent(null);
      setNewEvent({
        name: "",
        description: "",
        event_type: "holiday",
        country: "senegal",
        city: "",
        start_date: "",
        end_date: "",
        demand_multiplier: 1.2,
      });
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await supabase.from("local_events").delete().eq("id", id);
      if (error) throw error;
      toast.success("Événement supprimé");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSavePack = async () => {
    try {
      if (editingPack) {
        const { error } = await supabase
          .from("credit_packs")
          .update(newPack)
          .eq("id", editingPack.id);
        if (error) throw error;
        toast.success("Pack mis à jour");
      } else {
        const { error } = await supabase
          .from("credit_packs")
          .insert(newPack);
        if (error) throw error;
        toast.success("Pack créé");
      }
      setPackDialog(false);
      setEditingPack(null);
      setNewPack({
        name: "",
        credits: 10,
        price: 5000,
        bonus_credits: 0,
        is_popular: false,
        is_active: true,
      });
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleTogglePack = async (pack: CreditPack) => {
    try {
      const { error } = await supabase
        .from("credit_packs")
        .update({ is_active: !pack.is_active })
        .eq("id", pack.id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const openEditEvent = (event: LocalEvent) => {
    setEditingEvent(event);
    setNewEvent({
      name: event.name,
      description: event.description || "",
      event_type: event.event_type,
      country: event.country,
      city: event.city || "",
      start_date: event.start_date,
      end_date: event.end_date,
      demand_multiplier: event.demand_multiplier,
    });
    setEventDialog(true);
  };

  const openEditPack = (pack: CreditPack) => {
    setEditingPack(pack);
    setNewPack({
      name: pack.name,
      credits: pack.credits,
      price: pack.price,
      bonus_credits: pack.bonus_credits || 0,
      is_popular: pack.is_popular || false,
      is_active: pack.is_active,
    });
    setPackDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestion du Contenu</h1>
        <p className="text-muted-foreground">Gérez les événements, packs de crédits et badges</p>
      </div>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Événements
          </TabsTrigger>
          <TabsTrigger value="packs" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Packs Crédits
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Badges
          </TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">{events.length} événements</p>
            <Button onClick={() => { setEditingEvent(null); setEventDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un événement
            </Button>
          </div>

          <Card className="glass-card border-glass-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Multiplicateur</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{event.event_type}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {event.city ? `${event.city}, ` : ""}{event.country.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(event.start_date), "dd/MM")} - {format(new Date(event.end_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/10 text-primary">x{event.demand_multiplier}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditEvent(event)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteEvent(event.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit Packs Tab */}
        <TabsContent value="packs" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">{creditPacks.length} packs</p>
            <Button onClick={() => { setEditingPack(null); setPackDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un pack
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {creditPacks.map((pack) => (
              <Card key={pack.id} className={`glass-card border-glass-border ${!pack.is_active && "opacity-50"}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{pack.name}</h3>
                      {pack.is_popular && <Badge className="bg-primary/10 text-primary mt-1">Populaire</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditPack(pack)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold">{pack.credits} <span className="text-sm font-normal text-muted-foreground">crédits</span></p>
                    {pack.bonus_credits > 0 && (
                      <p className="text-sm text-green-500">+{pack.bonus_credits} bonus</p>
                    )}
                    <p className="text-xl">{pack.price.toLocaleString()} FCFA</p>
                  </div>
                  <Button
                    variant={pack.is_active ? "outline" : "default"}
                    className="w-full mt-4"
                    onClick={() => handleTogglePack(pack)}
                  >
                    {pack.is_active ? "Désactiver" : "Activer"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-4">
          <p className="text-muted-foreground">{badges.length} badges système</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <Card key={badge.id} className="glass-card border-glass-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-${badge.color || "primary"}/10 flex items-center justify-center text-2xl`}>
                      {badge.icon}
                    </div>
                    <div>
                      <h4 className="font-bold">{badge.name}</h4>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Critère: {badge.criteria_type} ≥ {badge.criteria_value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Event Dialog */}
      <Dialog open={eventDialog} onOpenChange={setEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nom de l'événement"
              value={newEvent.name}
              onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
            />
            <Textarea
              placeholder="Description"
              value={newEvent.description}
              onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent({...newEvent, event_type: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">Fête religieuse</SelectItem>
                  <SelectItem value="festival">Festival</SelectItem>
                  <SelectItem value="sport">Événement sportif</SelectItem>
                  <SelectItem value="conference">Conférence</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newEvent.country} onValueChange={(v) => setNewEvent({...newEvent, country: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pays" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="senegal">Sénégal</SelectItem>
                  <SelectItem value="cote_ivoire">Côte d'Ivoire</SelectItem>
                  <SelectItem value="mali">Mali</SelectItem>
                  <SelectItem value="burkina_faso">Burkina Faso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Ville (optionnel)"
              value={newEvent.city}
              onChange={(e) => setNewEvent({...newEvent, city: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Date début</label>
                <Input
                  type="date"
                  value={newEvent.start_date}
                  onChange={(e) => setNewEvent({...newEvent, start_date: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Date fin</label>
                <Input
                  type="date"
                  value={newEvent.end_date}
                  onChange={(e) => setNewEvent({...newEvent, end_date: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Multiplicateur de demande</label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="3"
                value={newEvent.demand_multiplier}
                onChange={(e) => setNewEvent({...newEvent, demand_multiplier: parseFloat(e.target.value)})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialog(false)}>Annuler</Button>
            <Button onClick={handleSaveEvent}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pack Dialog */}
      <Dialog open={packDialog} onOpenChange={setPackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPack ? "Modifier le pack" : "Nouveau pack"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nom du pack"
              value={newPack.name}
              onChange={(e) => setNewPack({...newPack, name: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Crédits</label>
                <Input
                  type="number"
                  value={newPack.credits}
                  onChange={(e) => setNewPack({...newPack, credits: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Bonus</label>
                <Input
                  type="number"
                  value={newPack.bonus_credits}
                  onChange={(e) => setNewPack({...newPack, bonus_credits: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Prix (FCFA)</label>
              <Input
                type="number"
                value={newPack.price}
                onChange={(e) => setNewPack({...newPack, price: parseInt(e.target.value)})}
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newPack.is_popular}
                  onChange={(e) => setNewPack({...newPack, is_popular: e.target.checked})}
                />
                <span className="text-sm">Pack populaire</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newPack.is_active}
                  onChange={(e) => setNewPack({...newPack, is_active: e.target.checked})}
                />
                <span className="text-sm">Actif</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackDialog(false)}>Annuler</Button>
            <Button onClick={handleSavePack}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContentManagement;
