import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StarRating from "@/components/reviews/StarRating";
import BookingModal from "@/components/booking/BookingModal";
import StartConversationButton from "@/components/messaging/StartConversationButton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Phone, 
  Mail, 
  MapPin, 
  MessageCircle, 
  Car, 
  Shield, 
  Clock, 
  Fuel,
  Users,
  Plane,
  Wrench,
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  CalendarCheck
} from "lucide-react";
import { getVehicleImageUrl } from "@/lib/vehicleImages";

const OwnerStorefront = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Fetch storefront data
  const { data: storefront, isLoading: storefrontLoading } = useQuery({
    queryKey: ['owner-storefront', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owner_storefronts')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch owner profile
  const { data: ownerProfile } = useQuery({
    queryKey: ['owner-profile', storefront?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', storefront?.user_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!storefront?.user_id,
  });

  // Fetch owner's vehicles
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['owner-vehicles', storefront?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          vehicle_photos (id, file_path, is_primary)
        `)
        .eq('owner_id', storefront?.user_id)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!storefront?.user_id,
  });

  // Fetch reviews for owner's vehicles
  const { data: reviews = [] } = useQuery({
    queryKey: ['owner-reviews', storefront?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          vehicles!inner (owner_id)
        `)
        .eq('vehicles.owner_id', storefront?.user_id)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!storefront?.user_id,
  });

  // Calculate stats
  const avgRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 0;

  const businessName = storefront?.business_name || ownerProfile?.full_name || "Loueur";
  const displayName = businessName;

  if (storefrontLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!storefront) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Loueur non trouvé</h1>
          <p className="text-muted-foreground mb-6">
            Cette page vitrine n'existe pas ou a été supprimée.
          </p>
          <Link to="/vehicules">
            <Button>Voir tous les véhicules</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const countryNames: Record<string, string> = {
    senegal: "Sénégal",
    cote_ivoire: "Côte d'Ivoire",
    mali: "Mali",
    burkina_faso: "Burkina Faso",
    niger: "Niger",
    togo: "Togo",
    benin: "Bénin",
    guinee_bissau: "Guinée-Bissau"
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{displayName} - Location de véhicules | GoMonto</title>
        <meta name="description" content={storefront.tagline || `Louez des véhicules avec ${displayName} sur GoMonto`} />
      </Helmet>

      <Navbar />

      <main className="pb-16">
        {/* Hero Section */}
        <div className="relative">
          {/* Cover Image */}
          <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/10 relative overflow-hidden">
            {storefront.cover_image_url && (
              <img 
                src={storefront.cover_image_url} 
                alt={`${displayName} couverture`}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>

          {/* Profile Card */}
          <div className="container mx-auto px-4">
            <div className="relative -mt-16 md:-mt-20">
              <Card className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center">
                  {/* Logo/Avatar */}
                  <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
                    <AvatarImage 
                      src={storefront.logo_url || ownerProfile?.avatar_url || ''} 
                      alt={displayName} 
                    />
                    <AvatarFallback className="text-2xl md:text-3xl bg-primary text-primary-foreground">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h1 className="text-xl md:text-2xl font-bold">{displayName}</h1>
                      {/* Badges automatiques */}
                      {storefront.is_featured && (
                        <Badge className="bg-amber-500 text-white">⭐ Pro Vérifié</Badge>
                      )}
                      {reviews.length >= 10 && avgRating >= 4.5 && (
                        <Badge className="bg-primary text-primary-foreground">🏆 Super Host</Badge>
                      )}
                      {vehicles.length >= 10 && (
                        <Badge className="bg-green-600 text-white">🚗 Grande Flotte</Badge>
                      )}
                    </div>
                    
                    {storefront.tagline && (
                      <p className="text-muted-foreground mb-2">{storefront.tagline}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {avgRating > 0 && (
                        <div className="flex items-center gap-1">
                          <StarRating rating={avgRating} size="sm" />
                          <span>({reviews.length} avis)</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Car className="h-4 w-4" />
                        <span>{vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''}</span>
                      </div>
                      {storefront.years_in_business && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{storefront.years_in_business} ans d'expérience</span>
                        </div>
                      )}
                      {ownerProfile?.country && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{countryNames[ownerProfile.country] || ownerProfile.country}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Buttons */}
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {storefront.business_phone && (
                      <a href={`tel:${storefront.business_phone}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Phone className="h-4 w-4" />
                          <span className="hidden sm:inline">Appeler</span>
                        </Button>
                      </a>
                    )}
                    {storefront.whatsapp_number && (
                      <a 
                        href={`https://wa.me/${storefront.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="gap-2 text-green-600 border-green-600 hover:bg-green-50">
                          <MessageCircle className="h-4 w-4" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </Button>
                      </a>
                    )}
                    {storefront.business_email && (
                      <a href={`mailto:${storefront.business_email}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="hidden sm:inline">Email</span>
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
                    {/* Message Button */}
                    <StartConversationButton
                      targetUserId={storefront.user_id}
                      variant="outline"
                      size="sm"
                    />
                  </div>

        <div className="container mx-auto px-4 mt-6 space-y-6">
          {/* Services & Features */}
          <Card>
            <CardContent className="p-4 md:p-6">
              <h2 className="text-lg font-semibold mb-4">Services proposés</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ServiceItem 
                  icon={<Users className="h-5 w-5" />}
                  label="Avec chauffeur"
                  available={storefront.with_driver_available}
                  extra={storefront.driver_daily_rate ? `${storefront.driver_daily_rate.toLocaleString()} FCFA/jour` : undefined}
                />
                <ServiceItem 
                  icon={<Shield className="h-5 w-5" />}
                  label="Assurance incluse"
                  available={storefront.insurance_included}
                />
                <ServiceItem 
                  icon={<Wrench className="h-5 w-5" />}
                  label="Assistance 24h"
                  available={storefront.roadside_assistance}
                />
                <ServiceItem 
                  icon={<Plane className="h-5 w-5" />}
                  label="Livraison aéroport"
                  available={storefront.airport_delivery}
                />
                <ServiceItem 
                  icon={<Fuel className="h-5 w-5" />}
                  label="Km illimité"
                  available={storefront.unlimited_mileage}
                />
                <ServiceItem 
                  icon={<Clock className="h-5 w-5" />}
                  label={`Min. ${storefront.minimum_rental_days || 1} jour${(storefront.minimum_rental_days || 1) > 1 ? 's' : ''}`}
                  available={true}
                />
              </div>

              {storefront.payment_methods && storefront.payment_methods.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Moyens de paiement acceptés:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {storefront.payment_methods.map((method: string) => (
                      <Badge key={method} variant="secondary">{method}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {storefront.description && (
            <Card>
              <CardContent className="p-4 md:p-6">
                <h2 className="text-lg font-semibold mb-3">À propos</h2>
                <p className="text-muted-foreground whitespace-pre-line">{storefront.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Policies */}
          {(storefront.deposit_policy || storefront.cancellation_policy) && (
            <Card>
              <CardContent className="p-4 md:p-6">
                <h2 className="text-lg font-semibold mb-4">Conditions de location</h2>
                <div className="space-y-4">
                  {storefront.deposit_policy && (
                    <div>
                      <h3 className="font-medium text-sm mb-1">Politique de caution</h3>
                      <p className="text-sm text-muted-foreground">{storefront.deposit_policy}</p>
                    </div>
                  )}
                  {storefront.cancellation_policy && (
                    <div>
                      <h3 className="font-medium text-sm mb-1">Politique d'annulation</h3>
                      <p className="text-sm text-muted-foreground">{storefront.cancellation_policy}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vehicles */}
          <div>
            <h2 className="text-xl font-bold mb-4">Véhicules disponibles ({vehicles.length})</h2>
            {vehiclesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : vehicles.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Aucun véhicule disponible pour le moment.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((vehicle: any) => {
                  const primaryPhoto = vehicle.vehicle_photos?.find((p: any) => p.is_primary);
                  const imageSrc = primaryPhoto?.file_path 
                    ? getVehicleImageUrl(primaryPhoto.file_path) 
                    : '/placeholder.svg';
                  
                  const isOwnVehicle = user?.id === storefront.user_id;
                  
                  return (
                    <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                      <Link to={`/vehicule/${vehicle.id}`}>
                        <div className="aspect-video relative overflow-hidden">
                          <img 
                            src={imageSrc} 
                            alt={`${vehicle.brand} ${vehicle.model}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-primary text-primary-foreground">
                              {vehicle.daily_price.toLocaleString()} FCFA/j
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-semibold">{vehicle.brand} {vehicle.model}</h3>
                          <p className="text-sm text-muted-foreground">{vehicle.year} • {vehicle.transmission} • {vehicle.fuel_type}</p>
                        </CardContent>
                      </Link>
                      {!isOwnVehicle && (
                        <div className="px-3 pb-3">
                          <Button
                            className="w-full gap-2"
                            onClick={(e) => {
                              e.preventDefault();
                              if (!user) {
                                toast.error("Connectez-vous pour réserver");
                                return;
                              }
                              setSelectedVehicle(vehicle);
                              setIsBookingModalOpen(true);
                            }}
                          >
                            <CalendarCheck className="h-4 w-4" />
                            Réserver
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Avis clients</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((review: any) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Booking Modal */}
      {selectedVehicle && isBookingModalOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-auto rounded-2xl bg-background">
            <BookingModal
              vehicle={{
                id: selectedVehicle.id,
                brand: selectedVehicle.brand,
                model: selectedVehicle.model,
                daily_price: selectedVehicle.daily_price,
                location_city: selectedVehicle.location_city,
                owner_id: selectedVehicle.owner_id,
                seats: selectedVehicle.seats,
              }}
              userId={user.id}
              onClose={() => {
                setIsBookingModalOpen(false);
                setSelectedVehicle(null);
              }}
              onSuccess={() => {
                setIsBookingModalOpen(false);
                setSelectedVehicle(null);
                toast.success("Réservation effectuée avec succès!");
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Service item component
const ServiceItem = ({ 
  icon, 
  label, 
  available, 
  extra 
}: { 
  icon: React.ReactNode; 
  label: string; 
  available: boolean;
  extra?: string;
}) => (
  <div className={`flex items-center gap-2 p-3 rounded-lg ${available ? 'bg-green-50 dark:bg-green-950/30' : 'bg-muted'}`}>
    <div className={available ? 'text-green-600' : 'text-muted-foreground'}>
      {available ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
    </div>
    <div className="flex-1 min-w-0">
      <div className={`text-sm font-medium truncate ${available ? '' : 'text-muted-foreground'}`}>
        {label}
      </div>
      {extra && <div className="text-xs text-muted-foreground">{extra}</div>}
    </div>
  </div>
);

export default OwnerStorefront;
