import { useEffect, useRef, useState } from "react";
import { MapPin, Car } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface CountryStats {
  country: string;
  count: number;
  label: string;
  flag: string;
  lat: number;
  lng: number;
}

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; label: string; flag: string }> = {
  senegal: { lat: 14.4974, lng: -14.4524, label: "Sénégal", flag: "🇸🇳" },
  cote_ivoire: { lat: 7.5400, lng: -5.5471, label: "Côte d'Ivoire", flag: "🇨🇮" },
  mali: { lat: 17.5707, lng: -3.9962, label: "Mali", flag: "🇲🇱" },
  burkina_faso: { lat: 12.2383, lng: -1.5616, label: "Burkina Faso", flag: "🇧🇫" },
  niger: { lat: 17.6078, lng: 8.0817, label: "Niger", flag: "🇳🇪" },
  togo: { lat: 8.6195, lng: 0.8248, label: "Togo", flag: "🇹🇬" },
  benin: { lat: 9.3077, lng: 2.3158, label: "Bénin", flag: "🇧🇯" },
  guinee_bissau: { lat: 11.8037, lng: -15.1804, label: "Guinée-Bissau", flag: "🇬🇼" },
};

interface UEMOAMapProps {
  onCountrySelect: (country: string) => void;
  selectedCountry: string;
}

export const UEMOAMap = ({ onCountrySelect, selectedCountry }: UEMOAMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);

  // Fetch vehicle counts by country
  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("location_country")
        .eq("status", "active");

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((v) => {
          counts[v.location_country] = (counts[v.location_country] || 0) + 1;
        });

        const stats: CountryStats[] = Object.entries(COUNTRY_COORDS).map(([key, coords]) => ({
          country: key,
          count: counts[key] || 0,
          label: coords.label,
          flag: coords.flag,
          lat: coords.lat,
          lng: coords.lng,
        }));

        setCountryStats(stats);
      }
    };

    fetchStats();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Create map with OpenStreetMap tiles (100% free)
    map.current = L.map(mapContainer.current, {
      center: [12, -2],
      zoom: 4,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    // Use CartoDB dark tiles for a modern look (free, no API key)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add/update markers when stats change
  useEffect(() => {
    if (!map.current || countryStats.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each country
    countryStats.forEach((stat) => {
      const isSelected = selectedCountry === stat.country;
      
      // Create custom icon using divIcon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="relative cursor-pointer group">
            <div class="absolute -inset-2 ${isSelected ? 'bg-primary/40' : 'bg-primary/20'} rounded-full blur-lg group-hover:bg-primary/40 transition-all"></div>
            <div class="relative flex flex-col items-center">
              <div class="bg-card border-2 ${isSelected ? 'border-primary scale-110' : 'border-border'} rounded-full px-3 py-2 shadow-lg hover:scale-110 transition-transform">
                <span class="text-2xl">${stat.flag}</span>
                <span class="ml-1 font-bold text-foreground">${stat.count}</span>
              </div>
              <div class="mt-1 text-xs font-medium text-foreground bg-background/90 px-2 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap">
                ${stat.label}
              </div>
            </div>
          </div>
        `,
        iconSize: [80, 60],
        iconAnchor: [40, 30],
      });

      const marker = L.marker([stat.lat, stat.lng], { icon })
        .addTo(map.current!)
        .on('click', () => {
          onCountrySelect(stat.country);
          map.current?.flyTo([stat.lat, stat.lng], 6, { duration: 1.5 });
        });

      markersRef.current.push(marker);
    });
  }, [countryStats, selectedCountry, onCountrySelect]);

  const totalVehicles = countryStats.reduce((sum, s) => sum + s.count, 0);

  const handleResetView = () => {
    onCountrySelect("all");
    map.current?.flyTo([12, -2], 4, { duration: 1.5 });
  };

  const handleCountryClick = (stat: CountryStats) => {
    onCountrySelect(stat.country);
    map.current?.flyTo([stat.lat, stat.lng], 6, { duration: 1.5 });
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Carte UEMOA
            </h3>
            <p className="text-sm text-muted-foreground">
              {totalVehicles} véhicules disponibles dans 8 pays
            </p>
          </div>
          {selectedCountry !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetView}
            >
              Voir tous les pays
            </Button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-[400px]">
        <div ref={mapContainer} className="absolute inset-0" />
      </div>

      {/* Country Stats Grid */}
      <div className="p-4 border-t border-border">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {countryStats.map((stat) => (
            <button
              key={stat.country}
              onClick={() => handleCountryClick(stat)}
              className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                selectedCountry === stat.country
                  ? "bg-primary/20 border border-primary"
                  : "hover:bg-muted"
              }`}
            >
              <span className="text-xl">{stat.flag}</span>
              <span className="text-xs font-medium mt-1">{stat.count}</span>
              <Car className="w-3 h-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UEMOAMap;
