import { Check, ChevronDown, Search } from "lucide-react";
import { useState, useMemo } from "react";

interface Country {
  code: string;
  name: string;
  flag: string;
  isUemoa?: boolean;
}

// Pays UEMOA (destinations véhicules - affichés en priorité)
const uemoaCountries: Country[] = [
  { code: "SN", name: "Sénégal", flag: "🇸🇳", isUemoa: true },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", isUemoa: true },
  { code: "ML", name: "Mali", flag: "🇲🇱", isUemoa: true },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", isUemoa: true },
  { code: "NE", name: "Niger", flag: "🇳🇪", isUemoa: true },
  { code: "TG", name: "Togo", flag: "🇹🇬", isUemoa: true },
  { code: "BJ", name: "Bénin", flag: "🇧🇯", isUemoa: true },
  { code: "GW", name: "Guinée-Bissau", flag: "🇬🇼", isUemoa: true }];

// Autres pays du monde (ordre alphabétique)
const worldCountries: Country[] = [
  { code: "ZA", name: "Afrique du Sud", flag: "🇿🇦" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "SA", name: "Arabie Saoudite", flag: "🇸🇦" },
  { code: "AR", name: "Argentine", flag: "🇦🇷" },
  { code: "AU", name: "Australie", flag: "🇦🇺" },
  { code: "AT", name: "Autriche", flag: "🇦🇹" },
  { code: "BE", name: "Belgique", flag: "🇧🇪" },
  { code: "BR", name: "Brésil", flag: "🇧🇷" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CN", name: "Chine", flag: "🇨🇳" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "CD", name: "RD Congo", flag: "🇨🇩" },
  { code: "KR", name: "Corée du Sud", flag: "🇰🇷" },
  { code: "EG", name: "Égypte", flag: "🇪🇬" },
  { code: "AE", name: "Émirats Arabes Unis", flag: "🇦🇪" },
  { code: "ES", name: "Espagne", flag: "🇪🇸" },
  { code: "US", name: "États-Unis", flag: "🇺🇸" },
  { code: "ET", name: "Éthiopie", flag: "🇪🇹" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GR", name: "Grèce", flag: "🇬🇷" },
  { code: "GN", name: "Guinée", flag: "🇬🇳" },
  { code: "IN", name: "Inde", flag: "🇮🇳" },
  { code: "ID", name: "Indonésie", flag: "🇮🇩" },
  { code: "IE", name: "Irlande", flag: "🇮🇪" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "JP", name: "Japon", flag: "🇯🇵" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "LB", name: "Liban", flag: "🇱🇧" },
  { code: "LR", name: "Libéria", flag: "🇱🇷" },
  { code: "LY", name: "Libye", flag: "🇱🇾" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MY", name: "Malaisie", flag: "🇲🇾" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
  { code: "MU", name: "Maurice", flag: "🇲🇺" },
  { code: "MR", name: "Mauritanie", flag: "🇲🇷" },
  { code: "MX", name: "Mexique", flag: "🇲🇽" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "NO", name: "Norvège", flag: "🇳🇴" },
  { code: "NZ", name: "Nouvelle-Zélande", flag: "🇳🇿" },
  { code: "NL", name: "Pays-Bas", flag: "🇳🇱" },
  { code: "PL", name: "Pologne", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧" },
  { code: "RU", name: "Russie", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "SG", name: "Singapour", flag: "🇸🇬" },
  { code: "SE", name: "Suède", flag: "🇸🇪" },
  { code: "CH", name: "Suisse", flag: "🇨🇭" },
  { code: "TZ", name: "Tanzanie", flag: "🇹🇿" },
  { code: "TH", name: "Thaïlande", flag: "🇹🇭" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳" },
  { code: "TR", name: "Turquie", flag: "🇹🇷" },
  { code: "UG", name: "Ouganda", flag: "🇺🇬" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" }];

const allCountries = [...uemoaCountries, ...worldCountries];

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
}

const CountrySelect = ({ value, onChange }: CountrySelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const selectedCountry = allCountries.find((c) => c.code === value);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return { uemoa: uemoaCountries, world: worldCountries };
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filterFn = (c: Country) => 
      c.name.toLowerCase().includes(query) || 
      c.code.toLowerCase().includes(query);
    
    return {
      uemoa: uemoaCountries.filter(filterFn),
      world: worldCountries.filter(filterFn),
    };
  }, [searchQuery]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <label className="block text-sm text-muted-foreground mb-2">
        Pays de résidence
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl glass border border-glass-border hover:border-primary/30 transition-colors text-left"
      >
        <span className="flex items-center gap-3">
          <span className="text-2xl">{selectedCountry?.flag || "🌍"}</span>
          <span className="font-medium">{selectedCountry?.name || "Sélectionner un pays"}</span>
        </span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 glass-card border border-glass-border overflow-hidden">
          {/* Barre de recherche */}
          <div className="p-2 border-b border-glass-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un pays..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-background/50 border border-glass-border text-sm focus:outline-none focus:border-primary/50"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* Pays UEMOA */}
            {filteredCountries.uemoa.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 sticky top-0">
                  🌍 Pays UEMOA (Destinations)
                </div>
                {filteredCountries.uemoa.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleSelect(country.code)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-primary/10 transition-colors ${
                      value === country.code ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-2xl">{country.flag}</span>
                      <span className="font-medium">{country.name}</span>
                    </span>
                    {value === country.code && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </>
            )}

            {/* Autres pays */}
            {filteredCountries.world.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 sticky top-0">
                  🌐 Autres pays
                </div>
                {filteredCountries.world.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleSelect(country.code)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-primary/10 transition-colors ${
                      value === country.code ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-2xl">{country.flag}</span>
                      <span className="font-medium">{country.name}</span>
                    </span>
                    {value === country.code && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </>
            )}

            {/* Aucun résultat */}
            {filteredCountries.uemoa.length === 0 && filteredCountries.world.length === 0 && (
              <div className="px-4 py-6 text-center text-muted-foreground">
                Aucun pays trouvé
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
