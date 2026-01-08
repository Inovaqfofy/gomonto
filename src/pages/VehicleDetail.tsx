import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Fuel, 
  Settings2, 
  Calendar, 
  Shield, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  Phone,
  Heart,
  Share2,
  CheckCircle,
  Store,
  Award
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { getAllVehicleImages } from "@/lib/vehicleImages";
import { formatCurrency, formatDailyPrice } from "@/lib/currency";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import BookingModal from "@/components/booking/BookingModal";
import ReviewsList from "@/components/reviews/ReviewsList";
import StartConversationButton from "@/components/messaging/StartConversationButton";
import { Button } from "@/components/ui/button";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  seats: number;
  fuel_type: string;
  transmission: string;
  daily_price: number;
  description: string | null;
  features: string[] | null;
  location_city: string;
  location_country: string;
  owner_id: string;
  is_verified: boolean | null;
}

interface VehiclePhoto {
  file_path: string;
  is_primary: boolean | null;
}

interface OwnerProfile {
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface OwnerStorefront {
  slug: string;
  business_name: string | null;
  is_featured: boolean | null;
}

const VehicleDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [ownerStorefront, setOwnerStorefront] = useState<OwnerStorefront | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchVehicle = async () => {
      if (!id) return;

      // Fetch vehicle details
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .single();

      if (vehicleError || !vehicleData) {
        console.error("Error fetching vehicle:", vehicleError);
        setIsLoading(false);
        return;
      }

      setVehicle(vehicleData as Vehicle);

      // Fetch photos
      const { data: photosData } = await supabase
        .from("vehicle_photos")
        .select("file_path, is_primary")
        .eq("vehicle_id", id)
        .order("is_primary", { ascending: false });

      if (photosData) {
        const photoUrls = getAllVehicleImages(photosData as VehiclePhoto[]);
        setPhotos(photoUrls);
      }

      // Fetch owner profile
      const { data: ownerData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, phone")
        .eq("user_id", vehicleData.owner_id)
        .single();

      if (ownerData) {
        setOwner(ownerData as OwnerProfile);
      }

      // Fetch owner storefront
      const { data: storefrontData } = await supabase
        .from("owner_storefronts")
        .select("slug, business_name, is_featured")
        .eq("user_id", vehicleData.owner_id)
        .single();

      if (storefrontData) {
        setOwnerStorefront(storefrontData as OwnerStorefront);
      }

      setIsLoading(false);
    };

    fetchVehicle();
  }, [id]);

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const getFuelLabel = (fuel: string) => {
    const labels: Record<string, string> = {
      essence: t('vehicle.petrol'),
      diesel: t('vehicle.diesel'),
      hybride: t('vehicle.hybrid'),
      electrique: t('vehicle.electric'),
    };
    return labels[fuel] || fuel;
  };

  const getTransmissionLabel = (trans: string) => {
    return trans === "automatique" ? t('vehicle.automatic') : t('vehicle.manual');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-muted-foreground">{t('vehicleDetail.vehicleNotFound')}</p>
        <Link to="/vehicules" className="text-primary hover:underline">
          {t('vehicleDetail.backToVehicles')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${vehicle.brand} ${vehicle.model} à louer à ${vehicle.location_city} | GoMonto`}</title>
        <meta
          name="description"
          content={`Louez cette ${vehicle.brand} ${vehicle.model} ${vehicle.year} à ${vehicle.location_city}. ${vehicle.seats} places, ${getFuelLabel(vehicle.fuel_type)}. À partir de ${formatDailyPrice(vehicle.daily_price)}.`}
        />
      </Helmet>

      <Navbar />

      <main className="min-h-screen pb-24 md:pb-0">
        {/* Back Button */}
        <div className="container mx-auto px-4 pt-24 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('vehicleDetail.back')}
          </button>
        </div>

        <div className="container mx-auto px-4 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Photos & Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Photo Gallery */}
              <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[16/10]">
                {photos.length > 0 ? (
                  <>
                    <img
                      src={photos[currentPhotoIndex]}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                    {photos.length > 1 && (
                      <>
                        <button
                          onClick={prevPhoto}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={nextPhoto}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {photos.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentPhotoIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-all ${
                                idx === currentPhotoIndex
                                  ? "bg-white w-6"
                                  : "bg-white/50 hover:bg-white/75"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    {t('vehicleDetail.noPhoto')}
                  </div>
                )}

                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors ${
                      isFavorite ? "bg-red-500 text-white" : "bg-white/90 text-muted-foreground hover:text-red-500"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Verified Badge */}
                {vehicle.is_verified && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    {t('vehicleDetail.verified')}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentPhotoIndex ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Vehicle Info */}
              <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1">
                      {vehicle.brand} {vehicle.model}
                    </h1>
                    <p className="text-muted-foreground">
                      {vehicle.year} • {vehicle.license_plate}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="font-semibold">4.8</span>
                    <span className="text-muted-foreground text-sm">(12 {t('vehicleDetail.reviews')})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground mb-6">
                  <MapPin className="w-4 h-4" />
                  <span>{vehicle.location_city}</span>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('vehicleDetail.seats')}</p>
                      <p className="font-medium">{vehicle.seats}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Fuel className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('vehicleDetail.fuel')}</p>
                      <p className="font-medium">{getFuelLabel(vehicle.fuel_type)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Settings2 className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('vehicleDetail.transmission')}</p>
                      <p className="font-medium">{getTransmissionLabel(vehicle.transmission)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('vehicleDetail.insurance')}</p>
                      <p className="font-medium">{t('vehicleDetail.included')}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {vehicle.description && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">{t('vehicleDetail.description')}</h3>
                    <p className="text-muted-foreground">{vehicle.description}</p>
                  </div>
                )}

                {/* Equipment */}
                {vehicle.features && vehicle.features.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">{t('vehicleDetail.equipment')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {vehicle.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reviews Section */}
              <div className="bg-card rounded-2xl p-6 border border-border">
                <ReviewsList vehicleId={vehicle.id} />
              </div>
            </div>

            {/* Right Column - Booking Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* Price Card */}
                <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-3xl font-bold gradient-text">
                      {formatCurrency(vehicle.daily_price, false)}
                    </span>
                    <span className="text-muted-foreground">FCFA / jour</span>
                  </div>

                  <Button
                    onClick={() => {
                      if (user && user.id === vehicle.owner_id) {
                        return;
                      }
                      setIsBookingOpen(true);
                    }}
                    disabled={user?.id === vehicle.owner_id}
                    className="w-full btn-primary-glow py-6 text-lg font-semibold mb-4"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    {t('vehicleDetail.bookNow')}
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 py-5">
                      <Phone className="w-4 h-4 mr-2" />
                      {t('vehicleDetail.call')}
                    </Button>
                    <StartConversationButton
                      targetUserId={vehicle.owner_id}
                      vehicleId={vehicle.id}
                      variant="outline"
                      className="flex-1 py-5"
                    >
                      {t('vehicleDetail.message')}
                    </StartConversationButton>
                  </div>

                  <p className="text-xs text-center text-muted-foreground mt-4">
                    {t('vehicleDetail.secureBooking')}
                  </p>
                </div>

                {/* Owner Card */}
                {owner && (
                  <div className="bg-card rounded-2xl p-6 border border-border">
                    <h3 className="font-semibold mb-4">{t('vehicleDetail.owner')}</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                        {owner.full_name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{ownerStorefront?.business_name || owner.full_name || t('vehicleDetail.owner')}</p>
                          {ownerStorefront?.is_featured && (
                            <Award className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="w-3 h-3 text-amber-500 fill-current" />
                          <span>4.9 • {t('vehicleDetail.memberSince')} 2024</span>
                        </div>
                      </div>
                    </div>
                    
                    {ownerStorefront?.slug && (
                      <Link 
                        to={`/loueur/${ownerStorefront.slug}`}
                        className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium text-sm"
                      >
                        <Store className="w-4 h-4" />
                        {t('vehicleDetail.seeAllVehicles')}
                      </Link>
                    )}
                  </div>
                )}

                {/* Safety Tips */}
                <div className="bg-muted/50 rounded-2xl p-4 border border-border">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm mb-1">Conseils de sécurité</p>
                      <p className="text-xs text-muted-foreground">
                        Vérifiez toujours l'identité du propriétaire et l'état du véhicule avant la remise des clés.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <MobileTabBar />

      {/* Booking Modal - Allow non-logged users */}
      {vehicle && isBookingOpen && (
        <BookingModal
          vehicle={{
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            daily_price: vehicle.daily_price,
            location_city: vehicle.location_city,
            owner_id: vehicle.owner_id,
            seats: vehicle.seats,
          }}
          userId={user?.id}
          onClose={() => setIsBookingOpen(false)}
          onLoginRequired={() => {
            setIsBookingOpen(false);
            navigate(`/auth?redirect=/vehicule/${id}&booking=true`);
          }}
          onSuccess={() => {
            setIsBookingOpen(false);
          }}
        />
      )}
    </>
  );
};

export default VehicleDetail;
