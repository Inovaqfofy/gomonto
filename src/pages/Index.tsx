import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star, MapPin, Users, Fuel, CheckCircle } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/hooks/useAuth";
import { getVehiclePrimaryImage } from "@/lib/vehicleImages";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Advantages from "@/components/Advantages";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import BookingModal from "@/components/booking/BookingModal";
import SEOHead from "@/components/SEOHead";
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  daily_price: number;
  location_city: string;
  seats: number;
  fuel_type: string;
  status: string;
  is_verified: boolean;
  owner_id: string;
  photos?: { file_path: string; is_primary: boolean }[];
}

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      const { data } = await supabase
        .from("vehicles")
        .select(`
          *,
          vehicle_photos (file_path, is_primary)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);

      if (data) {
        setVehicles(data.map(v => ({ ...v, photos: v.vehicle_photos })));
      }
      setLoading(false);
    };

    fetchVehicles();
  }, []);

  const getVehicleImage = (vehicle: Vehicle) => {
    return getVehiclePrimaryImage(vehicle.photos);
  };

  const handleBookClick = (vehicle: Vehicle) => {
    // Check if user is trying to book their own vehicle
    if (user && user.id === vehicle.owner_id) {
      toast({
        title: t("common.error") || "Action impossible",
        description: t("booking.ownVehicleError") || "Vous ne pouvez pas réserver votre propre véhicule.",
        variant: "destructive",
      });
      return;
    }
    // Allow non-logged-in users to start booking
    setSelectedVehicle(vehicle);
  };

  const handleLoginRequired = () => {
    if (selectedVehicle) {
      // Store vehicle ID and redirect to auth with return URL
      navigate(`/auth?redirect=/vehicule/${selectedVehicle.id}&booking=true`);
    }
  };

  return (
    <div className="min-h-screen">
      <SEOHead 
        title="GoMonto - Location de Véhicules en Afrique de l'Ouest | Côte d'Ivoire, Sénégal, Mali"
        description="GoMonto, la plateforme N°1 de location de voitures en Afrique de l'Ouest. Louez SUV, 4x4, berlines avec ou sans chauffeur à Abidjan, Dakar, Bamako. Paiement Mobile Money sécurisé."
        path="/"
        keywords="location voiture Abidjan, location véhicule Dakar, location 4x4 Afrique, location SUV Côte d'Ivoire, location avec chauffeur Sénégal, GoMonto, UEMOA, location voiture pas cher Afrique"
      />
      <Navbar />
      <main>
        <Hero />
        <Advantages />
        
        {/* Featured Vehicles Section */}
        <section id="vehicles" className="py-20 md:py-32 relative">
          <div className="container mx-auto px-4">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
                  {t("hero.stats.vehicles")} <span className="gradient-text">{t("common.featured") || "en Vedette"}</span>
                </h2>
                <p className="text-muted-foreground">
                  {t("common.bestRated") || "Les mieux notés par notre communauté"}
                </p>
              </div>
              <Link to="/vehicules" className="text-primary font-medium hover:underline underline-offset-4">
                {t("common.seeAll")} →
              </Link>
            </div>

            {/* Vehicles Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t("vehicle.noVehicles") || "Aucun véhicule disponible pour le moment."}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {vehicles.map((vehicle) => {
                  const imageUrl = getVehicleImage(vehicle);

                  return (
                    <div
                      key={vehicle.id}
                      className="glass-card overflow-hidden hover-lift group cursor-pointer"
                    >
                      {/* Image */}
                      <div className="relative h-48 overflow-hidden bg-muted">
                        <img
                          src={imageUrl}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {vehicle.is_verified && (
                          <div className="absolute top-3 left-3 verified-badge">
                            <CheckCircle className="w-3 h-3" />
                            {t("vehicle.verified") || "Vérifié"}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg">
                            {vehicle.brand} {vehicle.model}
                          </h3>
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 fill-secondary text-secondary" />
                            <span className="font-medium">4.8</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                          <MapPin className="w-4 h-4" />
                          {vehicle.location_city}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {vehicle.seats} {t("vehicle.seats")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Fuel className="w-4 h-4" />
                            {vehicle.fuel_type}
                          </div>
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
                            onClick={() => handleBookClick(vehicle)}
                            className="btn-primary-glow px-4 py-2 rounded-full text-sm font-medium text-primary-foreground"
                          >
                            <span className="relative z-10">{t("booking.book")}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <MobileTabBar />

      {/* Booking Modal - Allow non-logged users */}
      {selectedVehicle && (
        <BookingModal
          vehicle={selectedVehicle}
          userId={user?.id}
          onClose={() => setSelectedVehicle(null)}
          onLoginRequired={handleLoginRequired}
          onSuccess={() => {
            toast({
              title: t("booking.confirmed"),
              description: t("booking.ownerNotified") || "Le loueur a été notifié de votre demande.",
            });
          }}
        />
      )}
    </div>
  );
};

export default Index;
