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
  Car, Search, Eye, Ban, CheckCircle, AlertTriangle,
  MapPin, Calendar, Fuel, Users, Shield
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  status: string;
  daily_price: number;
  location_city: string;
  location_country: string;
  fuel_type: string;
  seats: number;
  insurance_expiry_date: string;
  technical_inspection_expiry_date: string;
  created_at: string;
  owner_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AdminVehiclesManagement = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCompliance, setFilterCompliance] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, [filterStatus, filterCountry]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("vehicles")
        .select(`*`)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus as any);
      }
      if (filterCountry !== "all") {
        query = query.eq("location_country", filterCountry as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      setVehicles((data || []) as any);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Erreur lors du chargement des véhicules");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVehicle = async (vehicleId: string) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ status: "active" })
        .eq("id", vehicleId);

      if (error) throw error;
      toast.success("Véhicule approuvé");
      fetchVehicles();
    } catch (error) {
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleSuspendVehicle = async (vehicleId: string) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ status: "inactive" })
        .eq("id", vehicleId);

      if (error) throw error;
      toast.success("Véhicule suspendu");
      fetchVehicles();
    } catch (error) {
      toast.error("Erreur lors de la suspension");
    }
  };

  const isCompliant = (vehicle: Vehicle) => {
    const today = new Date();
    const insuranceDate = vehicle.insurance_expiry_date ? new Date(vehicle.insurance_expiry_date) : null;
    const technicalDate = vehicle.technical_inspection_expiry_date ? new Date(vehicle.technical_inspection_expiry_date) : null;
    
    if (!insuranceDate || !technicalDate) return "missing";
    if (insuranceDate < today || technicalDate < today) return "expired";
    
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 15);
    if (insuranceDate < warningDate || technicalDate < warningDate) return "warning";
    
    return "valid";
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterCompliance === "all") return matchesSearch;
    return matchesSearch && isCompliant(vehicle) === filterCompliance;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Actif", variant: "default" },
      pending: { label: "En attente", variant: "secondary" },
      inactive: { label: "Inactif", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getComplianceBadge = (vehicle: Vehicle) => {
    const status = isCompliant(vehicle);
    const config: Record<string, { label: string; color: string; icon: any }> = {
      valid: { label: "Conforme", color: "bg-green-500/10 text-green-500", icon: CheckCircle },
      warning: { label: "Expire bientôt", color: "bg-amber-500/10 text-amber-500", icon: AlertTriangle },
      expired: { label: "Expiré", color: "bg-red-500/10 text-red-500", icon: Ban },
      missing: { label: "Documents manquants", color: "bg-gray-500/10 text-gray-500", icon: AlertTriangle },
    };
    const { label, color, icon: Icon } = config[status];
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Car className="w-6 h-6" />
            Gestion des Véhicules
          </h1>
          <p className="text-muted-foreground">{vehicles.length} véhicules enregistrés</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card border-glass-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par marque, modèle ou propriétaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCompliance} onValueChange={setFilterCompliance}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Conformité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="valid">Conforme</SelectItem>
                <SelectItem value="warning">Expire bientôt</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
                <SelectItem value="missing">Manquant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Pays" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous pays</SelectItem>
                <SelectItem value="senegal">Sénégal</SelectItem>
                <SelectItem value="cote_ivoire">Côte d'Ivoire</SelectItem>
                <SelectItem value="mali">Mali</SelectItem>
                <SelectItem value="burkina_faso">Burkina Faso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card className="glass-card border-glass-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Véhicule</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Prix/Jour</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Conformité</TableHead>
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
              ) : filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun véhicule trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vehicle.brand} {vehicle.model}</p>
                        <p className="text-sm text-muted-foreground">{vehicle.year}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vehicle.profiles?.full_name || "Inconnu"}</p>
                        <p className="text-xs text-muted-foreground">{vehicle.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3" />
                        {vehicle.location_city}, {vehicle.location_country?.replace("_", " ")}
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.daily_price?.toLocaleString()} FCFA</TableCell>
                    <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                    <TableCell>{getComplianceBadge(vehicle)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedVehicle(vehicle)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Détails Véhicule</DialogTitle>
                            </DialogHeader>
                            {selectedVehicle && (
                              <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Car className="w-8 h-8 text-primary" />
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-lg">
                                      {selectedVehicle.brand} {selectedVehicle.model}
                                    </h3>
                                    <p className="text-muted-foreground">{selectedVehicle.year}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Fuel className="w-4 h-4 text-muted-foreground" />
                                    <span className="capitalize">{selectedVehicle.fuel_type}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span>{selectedVehicle.seats} places</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <span>{selectedVehicle.location_city}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>{format(new Date(selectedVehicle.created_at), "dd/MM/yyyy")}</span>
                                  </div>
                                </div>

                                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                                  <h4 className="font-medium flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Documents
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Assurance</p>
                                      <p className={selectedVehicle.insurance_expiry_date && new Date(selectedVehicle.insurance_expiry_date) < new Date() ? "text-red-500" : ""}>
                                        {selectedVehicle.insurance_expiry_date 
                                          ? format(new Date(selectedVehicle.insurance_expiry_date), "dd/MM/yyyy")
                                          : "Non renseigné"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Contrôle technique</p>
                                      <p className={selectedVehicle.technical_inspection_expiry_date && new Date(selectedVehicle.technical_inspection_expiry_date) < new Date() ? "text-red-500" : ""}>
                                        {selectedVehicle.technical_inspection_expiry_date 
                                          ? format(new Date(selectedVehicle.technical_inspection_expiry_date), "dd/MM/yyyy")
                                          : "Non renseigné"}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2 pt-4">
                                  {selectedVehicle.status === "pending" && (
                                    <Button
                                      onClick={() => handleApproveVehicle(selectedVehicle.id)}
                                      className="flex-1"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Approuver
                                    </Button>
                                  )}
                                  {selectedVehicle.status === "active" && (
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleSuspendVehicle(selectedVehicle.id)}
                                      className="flex-1"
                                    >
                                      <Ban className="w-4 h-4 mr-2" />
                                      Suspendre
                                    </Button>
                                  )}
                                  {selectedVehicle.status === "inactive" && (
                                    <Button
                                      onClick={() => handleApproveVehicle(selectedVehicle.id)}
                                      className="flex-1"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Réactiver
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        {vehicle.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApproveVehicle(vehicle.id)}
                            className="text-green-500 hover:text-green-600"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
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

export default AdminVehiclesManagement;
