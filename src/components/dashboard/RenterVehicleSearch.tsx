import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, Users, Fuel, CheckCircle, Search, Filter, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/hooks/useAuth";
import { getVehiclePrimaryImage } from "@/lib/vehicleImages";
import BookingModal from "@/components/booking/BookingModal";
import LazyImage from "@/components/ui/lazy-image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { RenterDashboardView } from "@/pages/Dashboard";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  daily_price: number;
  location_city: string;
  location_country: string;
  seats: number;
  fuel_type: string;
  transmission: string;
  status: string;
  is_verified: boolean;
  owner_id: string;
  photos?: { file_path: string; is_primary: boolean }[];
}

interface RenterVehicleSearchProps {
  userId: string;
  onNavigate: (view: RenterDashboardView) => void;
}

const countries = [
  { value: "all", label: "Tous les pays" },
  { value: "senegal", label: "Sénégal" },
  { value: "cote_ivoire", label: "Côte d'Ivoire" },
  { value: "mali", label: "Mali" },
  { value: "burkina_faso", label: "Burkina Faso" },
  { value: "niger", label: "Niger" },
  { value: "togo", label: "Togo" },
  { value: "benin", label: "Bénin" },
  { value: "guinee_bissau", label: "Guinée-Bissau" }];

const RenterVehicleSearch = ({ userId, onNavigate }: RenterVehicleSearchProps) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [priceSort, setPriceSort] = useState<"asc" | "desc" | "none">("none");

  useEffect(() => {
    const fetchVehicles = async () => {
      let query = supabase
        .from("vehicles")
        .select(`
          *,
          vehicle_photos (file_path, is_primary)
        `)
        .eq("status", "active");

      if (selectedCountry !== "all") {
        query = query.eq("location_country", selectedCountry as "senegal" | "cote_ivoire" | "mali" | "burkina_faso" | "niger" | "togo" | "benin" | "guinee_bissau");
      }

      if (priceSort !== "none") {
        query = query.order("daily_price", { ascending: priceSort === "asc" });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data } = await query;

      if (data) {
        let filtered = data.map(v => ({ ...v, photos: v.vehicle_photos }));
        
        if (searchQuery) {
          const search = searchQuery.toLowerCase();
          filtered = filtered.filter(v => 
            v.brand.toLowerCase().includes(search) ||
            v.model.toLowerCase().includes(search) ||
            v.location_city.toLowerCase().includes(search)
          );
        }
        
        setVehicles(filtered);
      }
      setLoading(false);
    };

    fetchVehicles();
  }, [selectedCountry, priceSort, searchQuery]);

  const getVehicleImage = (vehicle: Vehicle) => {
    return getVehiclePrimaryImage(vehicle.photos);
  };

  const handleBookClick = (e: React.MouseEvent, vehicle: Vehicle) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error("Connectez-vous pour réserver ce véhicule.");
      return;
    }
    if (user.id === vehicle.owner_id) {
      toast.error("Vous ne pouvez pas réserver votre propre véhicule.");
      return;
    }
    setSelectedVehicle(vehicle);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigate("renter-overview")}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Trouvez votre <span className="gradient-text">véhicule</span>
          </h1>
          <p className="text-muted-foreground">
            Parcourez les véhicules disponibles dans toute l'Afrique de l'Ouest
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 border border-glass-border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher par marque, modèle ou ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-full md:w-48 bg-background/50">
              <SelectValue placeholder="Pays" />
            </SelectTrigger>
            <SelectContent>
              {countries.map(country => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priceSort} onValueChange={(v) => setPriceSort(v as typeof priceSort)}>
            <SelectTrigger className="w-full md:w-48 bg-background/50">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Trier par prix" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Plus récents</SelectItem>
              <SelectItem value="asc">Prix croissant</SelectItem>
              <SelectItem value="desc">Prix décroissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div>
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">{vehicles.length}</span> véhicule{vehicles.length !== 1 ? 's' : ''} disponible{vehicles.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Vehicles Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-glass-border">
          <Filter className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucun véhicule trouvé</h3>
          <p className="text-muted-foreground mb-4">
            Essayez de modifier vos critères de recherche.
          </p>
          <Button variant="outline" onClick={() => {
            setSearchQuery("");
            setSelectedCountry("all");
            setPriceSort("none");
          }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => {
            const imageUrl = getVehicleImage(vehicle);

            return (
              <Link
                to={`/vehicule/${vehicle.id}`}
                key={vehicle.id}
                className="glass-card overflow-hidden hover-lift group block border border-glass-border"
              >
                {/* Image */}
                <div className="relative h-40 overflow-hidden bg-muted">
                  <LazyImage
                    src={imageUrl}
                    alt={`${vehicle.brand} ${vehicle.model} à louer à ${vehicle.location_city}`}
                    className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                  />
                  {vehicle.is_verified && (
                    <div className="absolute top-3 left-3 verified-badge z-10">
                      <CheckCircle className="w-3 h-3" />
                      Vérifié
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="font-semibold">
                      {vehicle.brand} {vehicle.model}
                    </h2>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-secondary text-secondary" />
                      <span className="font-medium">4.8</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4" />
                    {vehicle.location_city}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {vehicle.seats}
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel className="w-4 h-4" />
                      {vehicle.fuel_type}
                    </div>
                  </div>

                  <div className="flex items-end justify-between pt-3 border-t border-border">
                    <div>
                      <span className="text-xl font-bold gradient-text">
                        {vehicle.daily_price.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        XOF/jour
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleBookClick(e, vehicle)}
                      className="btn-primary-glow px-3 py-1.5 rounded-full text-xs font-medium text-primary-foreground"
                    >
                      <span className="relative z-10">Réserver</span>
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Booking Modal */}
      {selectedVehicle && user && (
        <BookingModal
          vehicle={selectedVehicle}
          userId={user.id}
          onClose={() => setSelectedVehicle(null)}
          onSuccess={() => {
            toast.success("Réservation effectuée ! Le loueur a été notifié.");
            setSelectedVehicle(null);
            onNavigate("renter-reservations");
          }}
        />
      )}
    </div>
  );
};

export default RenterVehicleSearch;
