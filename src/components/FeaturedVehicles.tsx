import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, MapPin, Users, Fuel, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import LazyImage from "@/components/ui/lazy-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import vehicleSuv from "@/assets/vehicle-suv.jpg";
import vehicleSedan from "@/assets/vehicle-sedan.jpg";
import vehiclePickup from "@/assets/vehicle-pickup.jpg";
import vehicleMinivan from "@/assets/vehicle-minivan.jpg";

const FeaturedVehicles = () => {
  const { t } = useTranslation();
  const [selectedCountry, setSelectedCountry] = useState("all");

  const UEMOA_COUNTRIES = [
    { value: "all", labelKey: "countries.all", flag: "🌍" },
    { value: "senegal", labelKey: "countries.senegal", flag: "🇸🇳" },
    { value: "cote_ivoire", labelKey: "countries.cote_ivoire", flag: "🇨🇮" },
    { value: "mali", labelKey: "countries.mali", flag: "🇲🇱" },
    { value: "burkina_faso", labelKey: "countries.burkina_faso", flag: "🇧🇫" },
    { value: "niger", labelKey: "countries.niger", flag: "🇳🇪" },
    { value: "togo", labelKey: "countries.togo", flag: "🇹🇬" },
    { value: "benin", labelKey: "countries.benin", flag: "🇧🇯" },
    { value: "guinee_bissau", labelKey: "countries.guinee_bissau", flag: "🇬🇼" }];

  const vehicles = [
    {
      id: 1,
      name: "Toyota Land Cruiser",
      type: "SUV Premium",
      location: "Dakar, Sénégal",
      country: "senegal",
      price: 85000,
      currency: "FCFA",
      rating: 4.9,
      reviews: 124,
      seats: 7,
      fuel: "Diesel",
      image: vehicleSuv,
      verified: true,
    },
    {
      id: 2,
      name: "Mercedes Classe E",
      type: "Berline",
      location: "Abidjan, Côte d'Ivoire",
      country: "cote_ivoire",
      price: 65000,
      currency: "FCFA",
      rating: 4.8,
      reviews: 89,
      seats: 5,
      fuel: "Essence",
      image: vehicleSedan,
      verified: true,
    },
    {
      id: 3,
      name: "Ford Ranger",
      type: "Pick-up",
      location: "Ouagadougou, Burkina Faso",
      country: "burkina_faso",
      price: 55000,
      currency: "FCFA",
      rating: 4.7,
      reviews: 56,
      seats: 5,
      fuel: "Diesel",
      image: vehiclePickup,
      verified: true,
    },
    {
      id: 4,
      name: "Toyota HiAce",
      type: "Minivan",
      location: "Bamako, Mali",
      country: "mali",
      price: 75000,
      currency: "FCFA",
      rating: 4.8,
      reviews: 78,
      seats: 12,
      fuel: "Diesel",
      image: vehicleMinivan,
      verified: false,
    },
    {
      id: 5,
      name: "Peugeot 3008",
      type: "SUV Compact",
      location: "Cotonou, Bénin",
      country: "benin",
      price: 45000,
      currency: "FCFA",
      rating: 4.6,
      reviews: 34,
      seats: 5,
      fuel: "Essence",
      image: vehicleSuv,
      verified: true,
    },
    {
      id: 6,
      name: "Toyota Hilux",
      type: "Pick-up",
      location: "Lomé, Togo",
      country: "togo",
      price: 60000,
      currency: "FCFA",
      rating: 4.7,
      reviews: 45,
      seats: 5,
      fuel: "Diesel",
      image: vehiclePickup,
      verified: true,
    }];

  const filteredVehicles = selectedCountry === "all"
    ? vehicles
    : vehicles.filter(v => v.country === selectedCountry);

  const selectedCountryData = UEMOA_COUNTRIES.find(c => c.value === selectedCountry);

  return (
    <section id="vehicles" className="py-20 md:py-32 relative">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
              {t("featuredVehicles.title")} <span className="gradient-text">{t("featuredVehicles.titleHighlight")}</span>
            </h2>
            <p className="text-muted-foreground">
              {t("featuredVehicles.subtitle")}
            </p>
          </div>
          <Link 
            to="/vehicules"
            className="text-primary font-medium hover:underline underline-offset-4"
          >
            {t("featuredVehicles.seeAll")}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("featuredVehicles.filterByCountry")}</span>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-[200px] bg-card border-border">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span>{selectedCountryData?.flag}</span>
                    <span>{selectedCountryData ? t(selectedCountryData.labelKey) : ''}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {UEMOA_COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    <span className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{t(country.labelKey)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {UEMOA_COUNTRIES.slice(1, 5).map((country) => (
              <button
                key={country.value}
                onClick={() => setSelectedCountry(country.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCountry === country.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {country.flag} {t(country.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          {filteredVehicles.length} {t("featuredVehicles.vehiclesAvailable")}
          {selectedCountry !== "all" && selectedCountryData && ` ${t("vehicle.vehicleAvailableIn")} ${t(selectedCountryData.labelKey)}`}
        </p>

        {filteredVehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {t("featuredVehicles.noVehiclesInCountry")}
            </p>
            <button
              onClick={() => setSelectedCountry("all")}
              className="text-primary font-medium hover:underline"
            >
              {t("featuredVehicles.seeAllCountries")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVehicles.map((vehicle, index) => (
              <div
                key={vehicle.id}
                className="glass-card overflow-hidden hover-lift group cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative h-48 overflow-hidden">
                  <LazyImage
                    src={vehicle.image}
                    alt={vehicle.name}
                    className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                  />
                  {vehicle.verified && (
                    <div className="absolute top-3 left-3 verified-badge z-10">
                      <CheckCircle className="w-3 h-3" />
                      {t("vehicle.verified")}
                    </div>
                  )}
                  <div className="absolute top-3 right-3 glass px-2 py-1 rounded-full text-xs font-medium z-10">
                    {vehicle.type}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium z-10">
                    {UEMOA_COUNTRIES.find(c => c.value === vehicle.country)?.flag}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{vehicle.name}</h3>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-secondary text-secondary" />
                      <span className="font-medium">{vehicle.rating}</span>
                      <span className="text-muted-foreground">({vehicle.reviews})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4" />
                    {vehicle.location}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {vehicle.seats} {t("vehicle.seats")}
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel className="w-4 h-4" />
                      {vehicle.fuel}
                    </div>
                  </div>

                  <div className="flex items-end justify-between pt-4 border-t border-border">
                    <div>
                      <span className="text-2xl font-bold gradient-text">
                        {vehicle.price.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">
                        {vehicle.currency}{t("vehicle.perDay")}
                      </span>
                    </div>
                    <Link 
                      to="/vehicules"
                      className="btn-primary-glow px-4 py-2 rounded-full text-sm font-medium text-primary-foreground"
                    >
                      <span className="relative z-10">{t("booking.book")}</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedVehicles;