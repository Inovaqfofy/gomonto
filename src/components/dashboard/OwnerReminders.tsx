import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Plus, Trash2, Calendar, Car, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";

interface OwnerRemindersProps {
  ownerId: string;
}

interface Reminder {
  id: string;
  vehicle_id: string | null;
  reminder_type: string;
  title: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  priority: string;
  vehicleName?: string;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
}

const priorityColors = {
  low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-500 border-red-500/20",
};

const typeIcons = {
  maintenance: Car,
  insurance: AlertTriangle,
  technical_inspection: Clock,
  reservation: Calendar,
  document: AlertTriangle,
  custom: Bell,
};

const typeLabels = {
  maintenance: "Maintenance",
  insurance: "Assurance",
  technical_inspection: "Visite technique",
  reservation: "Réservation",
  document: "Document",
  custom: "Personnalisé",
};

const OwnerReminders = ({ ownerId }: OwnerRemindersProps) => {
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const [newReminder, setNewReminder] = useState({
    vehicle_id: "",
    reminder_type: "custom",
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
  });

  useEffect(() => {
    fetchData();
  }, [ownerId]);

  const fetchData = async () => {
    // Fetch vehicles
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("id, brand, model")
      .eq("owner_id", ownerId);

    if (vehicleData) {
      setVehicles(vehicleData);
    }

    // Fetch reminders
    const { data: reminderData } = await supabase
      .from("owner_reminders")
      .select("*")
      .eq("owner_id", ownerId)
      .order("due_date", { ascending: true });

    if (reminderData && vehicleData) {
      const enrichedReminders = reminderData.map((reminder) => {
        const vehicle = vehicleData.find((v) => v.id === reminder.vehicle_id);
        return {
          ...reminder,
          vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : null,
        };
      });
      setReminders(enrichedReminders);
    }

    setLoading(false);
  };

  const createReminder = async () => {
    if (!newReminder.title || !newReminder.due_date) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    const { error } = await supabase.from("owner_reminders").insert({
      owner_id: ownerId,
      vehicle_id: newReminder.vehicle_id || null,
      reminder_type: newReminder.reminder_type,
      title: newReminder.title,
      description: newReminder.description || null,
      due_date: newReminder.due_date,
      priority: newReminder.priority,
    });

    if (error) {
      toast.error("Erreur lors de la création du rappel");
    } else {
      toast.success("Rappel créé avec succès");
      setIsDialogOpen(false);
      setNewReminder({
        vehicle_id: "",
        reminder_type: "custom",
        title: "",
        description: "",
        due_date: "",
        priority: "medium",
      });
      fetchData();
    }
  };

  const toggleCompleted = async (reminder: Reminder) => {
    const { error } = await supabase
      .from("owner_reminders")
      .update({
        is_completed: !reminder.is_completed,
        completed_at: !reminder.is_completed ? new Date().toISOString() : null,
      })
      .eq("id", reminder.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      fetchData();
    }
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase
      .from("owner_reminders")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Rappel supprimé");
      fetchData();
    }
  };

  const filteredReminders = reminders.filter((r) => {
    if (filter === "pending") return !r.is_completed;
    if (filter === "completed") return r.is_completed;
    return true;
  });

  const getDueStatus = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return "overdue";
    if (isToday(date)) return "today";
    const days = differenceInDays(date, new Date());
    if (days <= 3) return "soon";
    return "upcoming";
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
            <Bell className="w-8 h-8 text-primary" />
            Rappels Automatiques
          </h1>
          <p className="text-muted-foreground">Ne manquez plus aucune échéance</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="completed">Terminés</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau rappel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un rappel</DialogTitle>
                <DialogDescription>
                  Configurez un rappel pour ne pas oublier vos échéances
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Titre *</label>
                  <Input
                    placeholder="Ex: Renouveler l'assurance"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Véhicule (optionnel)</label>
                  <Select
                    value={newReminder.vehicle_id}
                    onValueChange={(value) => setNewReminder({ ...newReminder, vehicle_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un véhicule" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.brand} {v.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Select
                      value={newReminder.reminder_type}
                      onValueChange={(value) => setNewReminder({ ...newReminder, reminder_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="insurance">Assurance</SelectItem>
                        <SelectItem value="technical_inspection">Visite technique</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="custom">Personnalisé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priorité</label>
                    <Select
                      value={newReminder.priority}
                      onValueChange={(value) => setNewReminder({ ...newReminder, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Basse</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="high">Haute</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Date d'échéance *</label>
                  <Input
                    type="date"
                    value={newReminder.due_date}
                    onChange={(e) => setNewReminder({ ...newReminder, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Détails supplémentaires..."
                    value={newReminder.description}
                    onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={createReminder}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <Card className="glass-card border-glass-border">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
            <p className="text-muted-foreground">
              {filter === "pending" ? "Aucun rappel en attente" : "Aucun rappel trouvé"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((reminder) => {
            const IconComponent = typeIcons[reminder.reminder_type as keyof typeof typeIcons] || Bell;
            const dueStatus = getDueStatus(reminder.due_date);

            return (
              <Card
                key={reminder.id}
                className={`glass-card border-glass-border ${reminder.is_completed ? "opacity-60" : ""}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={reminder.is_completed}
                      onCheckedChange={() => toggleCompleted(reminder)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <IconComponent className="w-4 h-4 text-muted-foreground" />
                        <h3 className={`font-semibold ${reminder.is_completed ? "line-through" : ""}`}>
                          {reminder.title}
                        </h3>
                        <Badge className={`${priorityColors[reminder.priority as keyof typeof priorityColors]} border text-xs`}>
                          {reminder.priority}
                        </Badge>
                        {dueStatus === "overdue" && !reminder.is_completed && (
                          <Badge variant="destructive" className="text-xs">En retard</Badge>
                        )}
                        {dueStatus === "today" && !reminder.is_completed && (
                          <Badge className="bg-orange-500 text-white text-xs">Aujourd'hui</Badge>
                        )}
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(reminder.due_date), "d MMMM yyyy", { locale: fr })}
                        </span>
                        {reminder.vehicleName && (
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            {reminder.vehicleName}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[reminder.reminder_type as keyof typeof typeLabels]}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteReminder(reminder.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OwnerReminders;
