import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  CalendarCheck, Search, Eye, Car, User, Wallet,
  Calendar, Clock, MapPin
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Reservation {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number;
  daily_price: number;
  total_days: number;
  deposit_amount: number;
  connection_fee: number;
  payment_method: string;
  created_at: string;
  vehicles: {
    brand: string;
    model: string;
    location_city: string;
  };
  renter: {
    full_name: string;
    email: string;
  };
  owner: {
    full_name: string;
    email: string;
  };
}

const AdminReservationsManagement = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchReservations();
  }, [filterStatus]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("reservations")
        .select(`*, vehicles(brand, model, location_city)`)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReservations((data || []) as any);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      toast.error("Erreur lors du chargement des réservations");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservationId);

      if (error) throw error;
      toast.success("Réservation annulée");
      fetchReservations();
    } catch (error) {
      toast.error("Erreur lors de l'annulation");
    }
  };

  const filteredReservations = reservations.filter(res =>
    res.vehicles?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.vehicles?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.renter?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.owner?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "En attente", variant: "outline" },
      confirmed: { label: "Confirmée", variant: "default" },
      guaranteed: { label: "Garantie", variant: "default" },
      completed: { label: "Terminée", variant: "secondary" },
      cancelled: { label: "Annulée", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === "pending").length,
    confirmed: reservations.filter(r => ["confirmed", "guaranteed"].includes(r.status)).length,
    completed: reservations.filter(r => r.status === "completed").length,
    totalRevenue: reservations
      .filter(r => ["confirmed", "guaranteed", "completed"].includes(r.status))
      .reduce((sum, r) => sum + (r.connection_fee || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-6 h-6" />
            Gestion des Réservations
          </h1>
          <p className="text-muted-foreground">{reservations.length} réservations</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass-card border-glass-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-glass-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-glass-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.confirmed}</p>
            <p className="text-xs text-muted-foreground">Confirmées</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-glass-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Terminées</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-glass-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Revenus (FCFA)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card border-glass-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par véhicule, loueur ou locataire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="confirmed">Confirmées</SelectItem>
                <SelectItem value="guaranteed">Garanties</SelectItem>
                <SelectItem value="completed">Terminées</SelectItem>
                <SelectItem value="cancelled">Annulées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card className="glass-card border-glass-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Véhicule</TableHead>
                <TableHead>Locataire</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune réservation trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredReservations.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{res.vehicles?.brand} {res.vehicles?.model}</p>
                          <p className="text-xs text-muted-foreground">{res.vehicles?.location_city}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{res.renter?.full_name || "Inconnu"}</p>
                        <p className="text-xs text-muted-foreground">{res.renter?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{res.owner?.full_name || "Inconnu"}</p>
                        <p className="text-xs text-muted-foreground">{res.owner?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(res.start_date), "dd/MM/yyyy")}</p>
                        <p className="text-muted-foreground">→ {format(new Date(res.end_date), "dd/MM/yyyy")}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{res.total_price?.toLocaleString()} FCFA</p>
                      <p className="text-xs text-muted-foreground">{res.total_days} jours</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(res.status)}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReservation(res)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Détails Réservation</DialogTitle>
                          </DialogHeader>
                          {selectedReservation && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                  <Car className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-bold">
                                    {selectedReservation.vehicles?.brand} {selectedReservation.vehicles?.model}
                                  </h3>
                                  {getStatusBadge(selectedReservation.status)}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                                <div>
                                  <p className="text-sm text-muted-foreground">Locataire</p>
                                  <p className="font-medium">{selectedReservation.renter?.full_name}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Propriétaire</p>
                                  <p className="font-medium">{selectedReservation.owner?.full_name}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p>Du {format(new Date(selectedReservation.start_date), "dd/MM/yyyy")}</p>
                                    <p>Au {format(new Date(selectedReservation.end_date), "dd/MM/yyyy")}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span>{selectedReservation.total_days} jours</span>
                                </div>
                              </div>

                              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                  <Wallet className="w-4 h-4" />
                                  Détails financiers
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Prix/jour:</span>
                                    <span>{selectedReservation.daily_price?.toLocaleString()} FCFA</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total:</span>
                                    <span className="font-bold">{selectedReservation.total_price?.toLocaleString()} FCFA</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Caution:</span>
                                    <span>{selectedReservation.deposit_amount?.toLocaleString()} FCFA</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Commission:</span>
                                    <span className="text-primary">{selectedReservation.connection_fee?.toLocaleString()} FCFA</span>
                                  </div>
                                </div>
                              </div>

                              {selectedReservation.status === "pending" && (
                                <Button
                                  variant="destructive"
                                  onClick={() => handleCancelReservation(selectedReservation.id)}
                                  className="w-full"
                                >
                                  Annuler la réservation
                                </Button>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReservationsManagement;
