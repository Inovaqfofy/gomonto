import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StarRating from "@/components/reviews/StarRating";
import { 
  Car, 
  MapPin, 
  Shield, 
  Users,
  Plane,
  Award,
  Star,
  CheckCircle,
  Filter
} from "lucide-react";

interface OwnerWithStats {
  id: string;
  user_id: string;
  business_name: string | null;
  slug: string | null;
  tagline: string | null;
  logo_url: string | null;
  is_featured: boolean | null;
  with_driver_available: boolean | null;
  airport_delivery: boolean | null;
  insurance_included: boolean | null;
  years_in_business: number | null;
  vehicleCount: number;
  avgRating: number;
  reviewCount: number;
  country: string | null;
}

const UEMOA_COUNTRIES = [
  { value: "all", label: "Tous les pays" },
  { value: "senegal", label: "Sénégal" },
  { value: "cote_ivoire", label: "Côte d'Ivoire" },
  { value: "mali", label: "Mali" },
  { value: "burkina_faso", label: "Burkina Faso" },
  { value: "niger", label: "Niger" },
  { value: "togo", label: "Togo" },
  { value: "benin", label: "Bénin" },
  { value: "guinee_bissau", label: "Guinée-Bissau" }];

const Owners = () => {
  const [selectedCountry, setSelectedCountry] = useState("all");

  // Fetch all storefronts with stats
  const { data: owners = [], isLoading } = useQuery({
    queryKey: ['all-owners'],
    queryFn: async () => {
      // Fetch storefronts
      const { data: storefronts, error } = await supabase
        .from('owner_storefronts')
        .select('*')
        .not('slug', 'is', null)
        .order('is_featured', { ascending: false });
      
      if (error) throw error;
      if (!storefronts) return [];

      // For each storefront, get vehicle count, ratings, and country
      const ownersWithStats = await Promise.all(
        storefronts.map(async (storefront) => {
          // Get vehicle count
          const { count: vehicleCount } = await supabase
            .from('vehicles')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', storefront.user_id)
            .eq('status', 'active');

          // Get reviews
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating, vehicles!inner(owner_id)')
            .eq('vehicles.owner_id', storefront.user_id);

          // Get profile for country
          const { data: profile } = await supabase
            .from('profiles')
            .select('country')
            .eq('user_id', storefront.user_id)
            .single();

          const avgRating = reviews && reviews.length > 0
            ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
            : 0;

          return {
            ...storefront,
            vehicleCount: vehicleCount || 0,
            avgRating,
            reviewCount: reviews?.length || 0,
            country: profile?.country || null
          } as OwnerWithStats;
        })
      );

      // Sort by featured first, then by vehicle count
      return ownersWithStats.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return b.vehicleCount - a.vehicleCount;
      });
    },
  });

  // Filter owners by country
  const filteredOwners = selectedCountry === "all" 
    ? owners 
    : owners.filter(owner => owner.country === selectedCountry);

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
        <title>Loueurs de véhicules | GoMonto</title>
        <meta name="description" content="Découvrez les meilleurs loueurs de véhicules sur GoMonto. Trouvez des professionnels de confiance avec des flottes variées." />
      </Helmet>

      <Navbar />

      <main className="pt-24 pb-24 md:pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Nos loueurs partenaires
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Découvrez notre sélection de loueurs professionnels vérifiés. 
              Choisissez parmi les meilleures agences de location en Afrique de l'Ouest.
            </p>
          </div>

          {/* Country Filter */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrer par pays" />
                </SelectTrigger>
                <SelectContent>
                  {UEMOA_COUNTRIES.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
            <div className="text-center p-4 rounded-xl bg-primary/5">
              <p className="text-2xl font-bold text-primary">{filteredOwners.length}</p>
              <p className="text-xs text-muted-foreground">Loueurs</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary/5">
              <p className="text-2xl font-bold text-primary">
                {filteredOwners.reduce((acc, o) => acc + o.vehicleCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Véhicules</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary/5">
              <p className="text-2xl font-bold text-primary">
                {filteredOwners.filter(o => o.is_featured).length}
              </p>
              <p className="text-xs text-muted-foreground">Pros Vérifiés</p>
            </div>
          </div>

          {/* Owners Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-72 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredOwners.length === 0 ? (
            <div className="text-center py-16">
              <Car className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-xl font-medium mb-2">Aucun loueur disponible</p>
              <p className="text-muted-foreground">
                {selectedCountry !== "all" 
                  ? "Aucun loueur dans ce pays pour le moment."
                  : "Revenez bientôt pour découvrir nos partenaires."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOwners.map((owner) => (
                <Link key={owner.id} to={`/loueur/${owner.slug}`}>
                  <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 group border-border/50 hover:border-primary/30">
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                          <AvatarImage src={owner.logo_url || ''} alt={owner.business_name || ''} />
                          <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                            {owner.business_name?.charAt(0).toUpperCase() || 'L'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                              {owner.business_name || 'Loueur'}
                            </h3>
                            {owner.is_featured && (
                              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                          {owner.tagline && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {owner.tagline}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {owner.is_featured && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
                            <Award className="w-3 h-3 mr-1" />
                            Pro Vérifié
                          </Badge>
                        )}
                        {owner.reviewCount >= 10 && owner.avgRating >= 4.5 && (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Super Host
                          </Badge>
                        )}
                        {owner.vehicleCount >= 5 && (
                          <Badge variant="secondary">
                            <Car className="w-3 h-3 mr-1" />
                            Grande flotte
                          </Badge>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="font-semibold">{owner.vehicleCount}</p>
                          <p className="text-xs text-muted-foreground">Véhicules</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          {owner.avgRating > 0 ? (
                            <>
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-3 h-3 text-amber-500 fill-current" />
                                <span className="font-semibold">{owner.avgRating.toFixed(1)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{owner.reviewCount} avis</p>
                            </>
                          ) : (
                            <>
                              <p className="font-semibold text-muted-foreground">-</p>
                              <p className="text-xs text-muted-foreground">Pas d'avis</p>
                            </>
                          )}
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="font-semibold">{owner.years_in_business || '-'}</p>
                          <p className="text-xs text-muted-foreground">Ans exp.</p>
                        </div>
                      </div>

                      {/* Services */}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {owner.country && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {countryNames[owner.country] || owner.country}
                          </span>
                        )}
                        {owner.with_driver_available && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Chauffeur
                          </span>
                        )}
                        {owner.airport_delivery && (
                          <span className="flex items-center gap-1">
                            <Plane className="w-3 h-3" />
                            Aéroport
                          </span>
                        )}
                        {owner.insurance_included && (
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Assurance
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileTabBar />
    </div>
  );
};

export default Owners;
