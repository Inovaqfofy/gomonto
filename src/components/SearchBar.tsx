import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Calendar, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS, pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Countries with their cities
const UEMOA_DATA = [
  { 
    value: "senegal", 
    labelKey: "countries.senegal",
    flag: "🇸🇳",
    cities: ["Dakar", "Saint-Louis", "Thiès", "Kaolack", "Ziguinchor"]
  },
  { 
    value: "cote_ivoire", 
    labelKey: "countries.ivoryCoast",
    flag: "🇨🇮",
    cities: ["Abidjan", "Bouaké", "Yamoussoukro", "Korhogo", "San-Pédro"]
  },
  { 
    value: "mali", 
    labelKey: "countries.mali",
    flag: "🇲🇱",
    cities: ["Bamako", "Sikasso", "Ségou", "Mopti", "Kayes"]
  },
  { 
    value: "burkina_faso", 
    labelKey: "countries.burkinaFaso",
    flag: "🇧🇫",
    cities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora", "Ouahigouya"]
  },
  { 
    value: "niger", 
    labelKey: "countries.niger",
    flag: "🇳🇪",
    cities: ["Niamey", "Zinder", "Maradi", "Tahoua", "Agadez"]
  },
  { 
    value: "togo", 
    labelKey: "countries.togo",
    flag: "🇹🇬",
    cities: ["Lomé", "Sokodé", "Kara", "Kpalimé", "Atakpamé"]
  },
  { 
    value: "benin", 
    labelKey: "countries.benin",
    flag: "🇧🇯",
    cities: ["Cotonou", "Porto-Novo", "Parakou", "Abomey-Calavi", "Bohicon"]
  },
  { 
    value: "guinee_bissau", 
    labelKey: "countries.guineaBissau",
    flag: "🇬🇼",
    cities: ["Bissau", "Bafatá", "Gabú", "Bissorã", "Bolama"]
  }];

const getDateLocale = (lang: string) => {
  switch (lang) {
    case 'en': return enUS;
    case 'pt': return pt;
    default: return fr;
  }
};

const SearchBar = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  
  // State
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  // Dropdowns visibility
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Get cities for selected country
  const selectedCountryData = UEMOA_DATA.find(c => c.value === selectedCountry);
  const availableCities = selectedCountryData?.cities || [];

  // Format display text
  const getLocationDisplay = () => {
    if (selectedCity && selectedCountryData) {
      return `${selectedCity}, ${t(selectedCountryData.labelKey)}`;
    }
    if (selectedCountryData) {
      return t(selectedCountryData.labelKey);
    }
    return "";
  };

  const getDateDisplay = () => {
    if (startDate && endDate) {
      return `${format(startDate, "d MMM", { locale: dateLocale })} - ${format(endDate, "d MMM yyyy", { locale: dateLocale })}`;
    }
    if (startDate) {
      return `${t("search.startingFrom")} ${format(startDate, "d MMM yyyy", { locale: dateLocale })}`;
    }
    return "";
  };

  // Handle search
  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (selectedCountry) {
      params.set("country", selectedCountry);
    }
    if (selectedCity) {
      params.set("city", selectedCity);
    }
    if (startDate) {
      params.set("start", format(startDate, "yyyy-MM-dd"));
    }
    if (endDate) {
      params.set("end", format(endDate, "yyyy-MM-dd"));
    }

    navigate(`/vehicules?${params.toString()}`);
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(undefined);
    } else if (date && date > startDate) {
      setEndDate(date);
      setShowDatePicker(false);
    } else if (date && date <= startDate) {
      setStartDate(date);
      setEndDate(undefined);
    }
  };

  return (
    <div className="search-bar-premium p-2 md:p-3">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0">
        {/* Location Section */}
        <div className="relative flex-1 md:border-r border-border">
          <div 
            className="flex items-center gap-3 px-4 py-3 cursor-pointer group"
            onClick={() => {
              setShowCountryDropdown(!showCountryDropdown);
              setShowCityDropdown(false);
              setShowDatePicker(false);
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("search.city")}</p>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-medium truncate",
                  getLocationDisplay() ? "text-foreground" : "text-muted-foreground"
                )}>
                  {getLocationDisplay() || t("search.wherePickup")}
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
                  showCountryDropdown && "rotate-180"
                )} />
              </div>
            </div>
          </div>
          
          {/* Country Dropdown */}
          {showCountryDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-card rounded-2xl shadow-soft-xl border border-border z-50 animate-fade-in max-h-80 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-2">
                {t("search.selectCountry")}
              </p>
              <div className="space-y-1">
                {UEMOA_DATA.map((country) => (
                  <button
                    key={country.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCountry(country.value);
                      setSelectedCity("");
                      setShowCountryDropdown(false);
                      setShowCityDropdown(true);
                    }}
                    className={cn(
                      "w-full px-3 py-2.5 text-left rounded-xl flex items-center gap-3 transition-colors",
                      selectedCountry === country.value 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted"
                    )}
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="font-medium">{t(country.labelKey)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {country.cities.length} {t("search.cities")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* City Dropdown */}
          {showCityDropdown && selectedCountryData && (
            <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-card rounded-2xl shadow-soft-xl border border-border z-50 animate-fade-in">
              <div className="flex items-center justify-between mb-2 px-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("search.citiesIn")} {t(selectedCountryData.labelKey)}
                </p>
                <button
                  onClick={() => {
                    setShowCityDropdown(false);
                    setShowCountryDropdown(true);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {t("search.changeCountry")}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {availableCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setSelectedCity(city);
                      setShowCityDropdown(false);
                    }}
                    className={cn(
                      "px-3 py-2.5 text-left rounded-xl text-sm font-medium transition-colors",
                      selectedCity === city 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted"
                    )}
                  >
                    {city}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowCityDropdown(false)}
                className="w-full mt-2 px-3 py-2 text-center rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                {t("search.allCitiesIn")} {t(selectedCountryData.labelKey)}
              </button>
            </div>
          )}
        </div>

        {/* Dates Section */}
        <div className="flex-1 md:border-r border-border">
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <div 
                className="flex items-center gap-3 px-4 py-3 cursor-pointer group"
                onClick={() => {
                  setShowCountryDropdown(false);
                  setShowCityDropdown(false);
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                  <Calendar className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("search.dates")}</p>
                  <p className={cn(
                    "font-medium",
                    getDateDisplay() ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {getDateDisplay() || t("search.selectDates")}
                  </p>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  showDatePicker && "rotate-180"
                )} />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{t("search.start")}</p>
                    <p className="font-medium">
                      {startDate ? format(startDate, "d MMM yyyy", { locale: dateLocale }) : "—"}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{t("search.end")}</p>
                    <p className="font-medium">
                      {endDate ? format(endDate, "d MMM yyyy", { locale: dateLocale }) : "—"}
                    </p>
                  </div>
                </div>
                <CalendarComponent
                  mode="single"
                  selected={endDate || startDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  modifiers={{
                    start: startDate ? [startDate] : [],
                    end: endDate ? [endDate] : [],
                    range: startDate && endDate ? {
                      from: startDate,
                      to: endDate
                    } : undefined
                  }}
                  modifiersStyles={{
                    start: { 
                      backgroundColor: "hsl(var(--primary))", 
                      color: "hsl(var(--primary-foreground))",
                      borderRadius: "9999px"
                    },
                    end: { 
                      backgroundColor: "hsl(var(--primary))", 
                      color: "hsl(var(--primary-foreground))",
                      borderRadius: "9999px"
                    },
                    range: {
                      backgroundColor: "hsl(var(--primary) / 0.1)"
                    }
                  }}
                />
                {startDate && !endDate && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {t("search.selectEndDate")}
                  </p>
                )}
                {startDate && endDate && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        setStartDate(undefined);
                        setEndDate(undefined);
                      }}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      {t("search.reset")}
                    </button>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {t("search.confirm")}
                    </button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Search Button */}
        <div className="px-2">
          <button 
            onClick={handleSearch}
            className="w-full md:w-auto btn-primary-glow px-8 py-4 rounded-xl text-primary-foreground font-bold flex items-center justify-center gap-2 touch-target"
          >
            <Search className="w-5 h-5" />
            <span className="relative z-10">{t("search.search")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
