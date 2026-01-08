import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star, MapPin, Users, Fuel, CheckCircle, Filter, Gauge } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/hooks/useAuth";
import { getVehiclePrimaryImage } from "@/lib/vehicleImages";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import BookingModal from "@/components/booking/BookingModal";
import LazyImage from "@/components/ui/lazy-image";
import VehicleFilters from "@/components/vehicles/VehicleFilters";
import UEMOAMap from "@/components/vehicles/UEMOAMap";
import NoDepositBadge from "@/components/trust/NoDepositBadge";
import SelfDriveBadge from "@/components/trust/SelfDriveBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Helmet } from "react-helmet-async";

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
  self_drive_allowed?: boolean;
  guarantee_eligible?: boolean;
  photos?: { file_path: string; is_primary: boolean }[];
}

const UEMOA_COUNTRIES: Record<string, { labelKey: string; flag: string }> = {
  senegal: { labelKey: "countries.senegal", flag: "🇸🇳" },
  cote_ivoire: { labelKey: "countries.cote_ivoire", flag: "🇨🇮" },
  mali: { labelKey: "countries.mali", flag: "🇲🇱" },
  burkina_faso: { labelKey: "countries.burkina_faso", flag: "🇧🇫" },
  niger: { labelKey: "countries.niger", flag: "🇳🇪" },
  togo: { labelKey: "countries.togo", flag: "🇹🇬" },
  benin: { labelKey: "countries.benin", flag: "🇧🇯" },
  guinee_bissau: { labelKey: "countries.guinee_bissau", flag: "🇬🇼" },
};

const Vehicles = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  
  const urlCountry = searchParams.get("country") || "all";
  const urlCity = searchParams.get("city") || "";
  
  const [searchQuery, setSearchQuery] = useState(urlCity);
  const [selectedCountry, setSelectedCountry] = useState(urlCountry);
  const [priceSort, setPriceSort] = useState<"asc" | "desc" | "none">("none");
  const [fuelType, setFuelType] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [vehicleType, setVehicleType] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000]);
  const [seatsMin, setSeatsMin] = useState(2);
  const [selfDriveOnly, setSelfDriveOnly] = useState(false);
  const [noDepositOnly, setNoDepositOnly] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const activeFiltersCount = [
    fuelType !== "all",
    transmission !== "all",
    vehicleType !== "all",
    seatsMin > 2,
    priceRange[0] > 0 || priceRange[1] < 200000,
    selfDriveOnly,
    noDepositOnly].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCountry("all");
    setPriceSort("none");
    setFuelType("all");
    setTransmission("all");
    setVehicleType("all");
    setPriceRange([0, 200000]);
    setSeatsMin(2);
    setSelfDriveOnly(false);
    setNoDepositOnly(false);
  };

  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      
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

      if (fuelType !== "all") {
        query = query.eq("fuel_type", fuelType as "essence" | "diesel" | "hybride" | "electrique");
      }

      if (transmission !== "all") {
        query = query.eq("transmission", transmission as "manuelle" | "automatique");
      }

      query = query.gte("daily_price", priceRange[0]).lte("daily_price", priceRange[1]);
      query = query.gte("seats", seatsMin);

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
  }, [selectedCountry, priceSort, searchQuery, fuelType, transmission, vehicleType, priceRange, seatsMin]);

  const getVehicleImage = (vehicle: Vehicle) => {
    return getVehiclePrimaryImage(vehicle.photos);
  };

  const handleBookClick = (e: React.MouseEvent, vehicle: Vehicle) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if user is trying to book their own vehicle
    if (user && user.id === vehicle.owner_id) {
      toast({
        title: t("booking.ownVehicleError"),
        description: t("booking.ownVehicleErrorDesc"),
        variant: "destructive",
      });
      return;
    }
    // Allow non-logged-in users to start booking
    setSelectedVehicle(vehicle);
  };

  const handleLoginRequired = () => {
    if (selectedVehicle) {
      navigate(`/auth?redirect=/vehicule/${selectedVehicle.id}&booking=true`);
    }
  };

  return (
    <>
      <Helmet>
        <title>Location de Véhicules en Afrique de l'Ouest | SUV, 4x4, Berlines | GoMonto</title>
        <meta name="description" content="Trouvez et louez le véhicule idéal en Côte d'Ivoire, Sénégal, Mali, Burkina Faso. SUV, 4x4, berlines, pickups avec ou sans chauffeur. Réservation en ligne, paiement Mobile Money." />
        <meta name="keywords" content="location voiture Abidjan, location SUV Dakar, location 4x4 Mali, louer véhicule Burkina Faso, location avec chauffeur Afrique, GoMonto véhicules" />
        <link rel="canonical" href="https://gomonto.com/vehicules" />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        
        <main className="pt-24 pb-32 md:pb-16">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                {t("vehicle.findIdeal")} <span className="gradient-text">{t("vehicle.idealHighlight")}</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                {t("vehicle.catalogDesc")}
              </p>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant={showMap ? "default" : "outline"}
                  onClick={() => setShowMap(!showMap)}
                  className="gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  {showMap ? t("vehicle.hideMap") : t("vehicle.showMap")}
                </Button>
              </div>
              
              {showMap && (
                <UEMOAMap
                  selectedCountry={selectedCountry}
                  onCountrySelect={setSelectedCountry}
                />
              )}
            </div>

            <VehicleFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCountry={selectedCountry}
              setSelectedCountry={setSelectedCountry}
              priceSort={priceSort}
              setPriceSort={setPriceSort}
              fuelType={fuelType}
              setFuelType={setFuelType}
              transmission={transmission}
              setTransmission={setTransmission}
              vehicleType={vehicleType}
              setVehicleType={setVehicleType}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              seatsMin={seatsMin}
              setSeatsMin={setSeatsMin}
              selfDriveOnly={selfDriveOnly}
              setSelfDriveOnly={setSelfDriveOnly}
              noDepositOnly={noDepositOnly}
              setNoDepositOnly={setNoDepositOnly}
              onResetFilters={resetFilters}
              activeFiltersCount={activeFiltersCount}
            />

            <div className="my-6 flex items-center justify-between">
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{vehicles.length}</span> {t("vehicle.vehiclesAvailable")}
                {selectedCountry !== "all" && UEMOA_COUNTRIES[selectedCountry] && (
                  <span> {t("vehicle.vehicleAvailableIn")} {UEMOA_COUNTRIES[selectedCountry]?.flag} {t(UEMOA_COUNTRIES[selectedCountry]?.labelKey)}</span>
                )}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-16 glass-card rounded-2xl">
                <Filter className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t("vehicle.noVehicles")}</h3>
                <p className="text-muted-foreground mb-4">
                  {t("vehicle.noVehiclesDesc")}
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  {t("vehicle.clearFilters")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {vehicles.map((vehicle) => {
                  const imageUrl = getVehicleImage(vehicle);
                  const countryData = UEMOA_COUNTRIES[vehicle.location_country];

                  return (
                    <Link
                      to={`/vehicule/${vehicle.id}`}
                      key={vehicle.id}
                      className="glass-card overflow-hidden hover-lift group block"
                    >
                      <div className="relative h-48 overflow-hidden bg-muted">
                        <LazyImage
                          src={imageUrl}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                        />
                        {vehicle.is_verified && (
                          <div className="absolute top-3 left-3 verified-badge z-10">
                            <CheckCircle className="w-3 h-3" />
                            {t("vehicle.verified")}
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium z-10 flex items-center gap-1">
                          <span>{countryData?.flag}</span>
                          <span className="hidden sm:inline">{countryData ? t(countryData.labelKey) : ''}</span>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <h2 className="font-semibold text-lg">
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

                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <Badge variant="outline" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {vehicle.seats} {t("vehicle.seats")}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Fuel className="w-3 h-3 mr-1" />
                            {vehicle.fuel_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Gauge className="w-3 h-3 mr-1" />
                            {vehicle.transmission}
                          </Badge>
                          {vehicle.guarantee_eligible !== false && (
                            <NoDepositBadge variant="small" />
                          )}
                          {vehicle.self_drive_allowed && (
                            <SelfDriveBadge />
                          )}
                        </div>

                        <div className="flex items-end justify-between pt-4 border-t border-border">
                          <div>
                            <span className="text-2xl font-bold gradient-text">
                              {vehicle.daily_price.toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground ml-1">
                              {t("common.currency")}{t("vehicle.perDay")}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleBookClick(e, vehicle)}
                            className="btn-primary-glow px-4 py-2 rounded-full text-sm font-medium text-primary-foreground"
                          >
                            <span className="relative z-10">{t("booking.book")}</span>
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <Footer />
        <MobileTabBar />

        {selectedVehicle && (
          <BookingModal
            vehicle={selectedVehicle}
            userId={user?.id}
            onClose={() => setSelectedVehicle(null)}
            onLoginRequired={handleLoginRequired}
            onSuccess={() => {
              toast({
                title: t("booking.reservationSuccess"),
                description: t("booking.ownerNotified"),
              });
            }}
          />
        )}
      </div>
    </>
  );
};

export default Vehicles;