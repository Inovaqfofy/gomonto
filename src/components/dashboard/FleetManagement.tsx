import { useEffect, useState } from "react";
import { Plus, MapPin, Users, Fuel, Settings, Calendar, MoreVertical, CheckCircle, Clock, AlertTriangle, FileEdit, Lock, Wallet, Camera, TrendingUp, Navigation } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { getVehiclePrimaryImage } from "@/lib/vehicleImages";
import ComplianceBadge from "./ComplianceBadge";
import useWalletBalance from "@/hooks/useWalletBalance";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FleetManagementProps {
  userId: string;
  onOpenCalendar: (vehicleId: string) => void;
  onAddVehicle: () => void;
  onEditVehicle?: (vehicleId: string) => void;
  onVehicleSettings?: (vehicleId: string) => void;
  onDamageCheck?: (vehicleId: string) => void;
  onManageDrivers?: (vehicleId: string) => void;
  onConfigureGeofencing?: (vehicleId: string) => void;
  onDynamicPricing?: (vehicleId: string) => void;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  seats: number;
  fuel_type: string;
  daily_price: number;
  location_city: string;
  status: string;
  is_verified: boolean;
  compliance_suspended: boolean | null;
  insurance_expiry_date: string | null;
  technical_inspection_expiry_date: string | null;
  photos?: { file_path: string; is_primary: boolean }[];
}

const FleetManagement = ({ userId, onOpenCalendar, onAddVehicle, onEditVehicle, onVehicleSettings, onDamageCheck, onManageDrivers, onConfigureGeofencing, onDynamicPricing }: FleetManagementProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { balance, isReadOnly, canPublish, loading: walletLoading } = useWalletBalance(userId);

  useEffect(() => {
    const fetchVehicles = async () => {
      const { data } = await supabase
        .from("vehicles")
        .select(`
          *,
          vehicle_photos (file_path, is_primary)
        `)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false }) as { data: (Vehicle & { vehicle_photos: { file_path: string; is_primary: boolean }[] })[] | null };

      if (data) {
        setVehicles(data.map(v => ({ ...v, photos: v.vehicle_photos })));
      }
      setLoading(false);
    };

    fetchVehicles();
  }, [userId]);

  const getStatusConfig = (status: string, complianceSuspended: boolean | null) => {
    if (complianceSuspended) {
      return { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Suspendu" };
    }
    switch (status) {
      case "active":
        return { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", label: "Actif" };
      case "pending":
        return { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "En attente" };
      case "maintenance":
        return { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", label: "Maintenance" };
      default:
        return { icon: Clock, color: "text-muted-foreground", bg: "bg-muted", label: "Inactif" };
    }
  };

  const getVehicleImage = (vehicle: Vehicle) => {
    return getVehiclePrimaryImage(vehicle.photos);
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
      {/* Read-Only Warning */}
      {isReadOnly && !walletLoading && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <Lock className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Mode Lecture Seule
          </AlertTitle>
          <AlertDescription className="text-sm">
            Votre solde de crédits est épuisé. Vos véhicules sont masqués des recherches publiques.
            Rechargez votre wallet pour réactiver vos annonces et accéder aux outils de gestion.
          </AlertDescription>
        </Alert>
      )}

      {/* Low Balance Warning */}
      {!isReadOnly && balance > 0 && balance < 10 && !walletLoading && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Wallet className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-500">Solde faible</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            Il vous reste <strong className="text-amber-500">{balance} crédits</strong>. Pensez à recharger votre wallet.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Ma Flotte</h1>
          <p className="text-muted-foreground">{vehicles.length} véhicule{vehicles.length !== 1 ? "s" : ""} enregistré{vehicles.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={onAddVehicle}
          disabled={isReadOnly || !canPublish}
          className="btn-primary-glow px-5 py-3 rounded-xl font-semibold text-primary-foreground flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={!canPublish ? "Solde insuffisant pour publier" : ""}
        >
          <Plus className="w-5 h-5" />
          <span className="relative z-10">Ajouter un véhicule</span>
        </button>
      </div>

      {/* Vehicles Grid */}
      {vehicles.length === 0 ? (
        <div className="glass-card p-12 border border-glass-border text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucun véhicule</h3>
          <p className="text-muted-foreground mb-6">Commencez par ajouter votre premier véhicule à louer</p>
          <button
            onClick={onAddVehicle}
            className="btn-primary-glow px-6 py-3 rounded-xl font-semibold text-primary-foreground"
          >
            <span className="relative z-10">Ajouter un véhicule</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => {
            const statusConfig = getStatusConfig(vehicle.status, vehicle.compliance_suspended);
            const imageUrl = getVehicleImage(vehicle);

            return (
              <div
                key={vehicle.id}
                className={`glass-card overflow-hidden border hover-lift group relative ${
                  vehicle.compliance_suspended ? "border-destructive/30" : isReadOnly ? "border-muted opacity-60" : "border-glass-border"
                }`}
              >
                {/* Read-Only Overlay */}
                {isReadOnly && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="text-center p-4">
                      <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground font-medium">Véhicule masqué</p>
                    </div>
                  </div>
                )}

                {/* Image */}
                <div className="relative h-48 bg-muted">
                  <img
                    src={imageUrl}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Status Badge */}
                  <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusConfig.bg}`}>
                    <statusConfig.icon className={`w-4 h-4 ${statusConfig.color}`} />
                    <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                  </div>

                  {/* Compliance Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <ComplianceBadge
                      insuranceExpiryDate={vehicle.insurance_expiry_date}
                      technicalExpiryDate={vehicle.technical_inspection_expiry_date}
                      size="md"
                    />
                    {vehicle.is_verified && (
                      <div className="verified-badge">
                        <CheckCircle className="w-3 h-3" />
                        Vérifié
                      </div>
                    )}
                  </div>
                </div>

                {/* Suspension Warning */}
                {vehicle.compliance_suspended && (
                  <div className="bg-destructive/10 px-4 py-2 border-b border-destructive/20">
                    <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Véhicule suspendu - Documents expirés
                    </p>
                  </div>
                )}

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {vehicle.brand} {vehicle.model}
                      </h3>
                      <p className="text-sm text-muted-foreground">{vehicle.year} • {vehicle.license_plate}</p>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors" disabled={isReadOnly}>
                      <MoreVertical className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {vehicle.location_city}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {vehicle.seats}
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel className="w-4 h-4" />
                      {vehicle.fuel_type}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <span className="text-xl font-bold gradient-text">
                        {vehicle.daily_price.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">FCFA/jour</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      <button
                        onClick={() => !isReadOnly && onOpenCalendar(vehicle.id)}
                        disabled={isReadOnly}
                        className="p-2 rounded-lg glass border border-glass-border hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Calendrier"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => !isReadOnly && onDamageCheck?.(vehicle.id)}
                        disabled={isReadOnly}
                        className="p-2 rounded-lg glass border border-glass-border hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="État des lieux IA"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => !isReadOnly && onManageDrivers?.(vehicle.id)}
                        disabled={isReadOnly}
                        className="p-2 rounded-lg glass border border-glass-border hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Chauffeurs"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => !isReadOnly && onConfigureGeofencing?.(vehicle.id)}
                        disabled={isReadOnly}
                        className="p-2 rounded-lg glass border border-glass-border hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Geofencing"
                      >
                        <Navigation className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => !isReadOnly && onDynamicPricing?.(vehicle.id)}
                        disabled={isReadOnly}
                        className="p-2 rounded-lg glass border border-glass-border hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Prix Dynamique"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => !isReadOnly && onEditVehicle?.(vehicle.id)}
                        disabled={isReadOnly}
                        className="p-2 rounded-lg glass border border-glass-border hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Modifier documents"
                      >
                        <FileEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => !isReadOnly && onVehicleSettings?.(vehicle.id)}
                        disabled={isReadOnly}
                        className="p-2 rounded-lg glass border border-glass-border hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Paramètres"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FleetManagement;
