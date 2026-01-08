import { Search, SlidersHorizontal, X, Car, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const UEMOA_COUNTRIES = [
  { value: "all", label: "Tous les pays", flag: "🌍" },
  { value: "senegal", label: "Sénégal", flag: "🇸🇳" },
  { value: "cote_ivoire", label: "Côte d'Ivoire", flag: "🇨🇮" },
  { value: "mali", label: "Mali", flag: "🇲🇱" },
  { value: "burkina_faso", label: "Burkina Faso", flag: "🇧🇫" },
  { value: "niger", label: "Niger", flag: "🇳🇪" },
  { value: "togo", label: "Togo", flag: "🇹🇬" },
  { value: "benin", label: "Bénin", flag: "🇧🇯" },
  { value: "guinee_bissau", label: "Guinée-Bissau", flag: "🇬🇼" }];

const FUEL_TYPES = [
  { value: "all", label: "Tous carburants" },
  { value: "essence", label: "Essence" },
  { value: "diesel", label: "Diesel" },
  { value: "hybride", label: "Hybride" },
  { value: "electrique", label: "Électrique" }];

const TRANSMISSION_TYPES = [
  { value: "all", label: "Toutes transmissions" },
  { value: "manuelle", label: "Manuelle" },
  { value: "automatique", label: "Automatique" }];

const VEHICLE_TYPES = [
  { value: "all", label: "Tous types" },
  { value: "suv", label: "SUV" },
  { value: "berline", label: "Berline" },
  { value: "pickup", label: "Pick-up" },
  { value: "minivan", label: "Minivan" },
  { value: "compact", label: "Compact" }];

interface VehicleFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedCountry: string;
  setSelectedCountry: (value: string) => void;
  priceSort: "asc" | "desc" | "none";
  setPriceSort: (value: "asc" | "desc" | "none") => void;
  fuelType: string;
  setFuelType: (value: string) => void;
  transmission: string;
  setTransmission: (value: string) => void;
  vehicleType: string;
  setVehicleType: (value: string) => void;
  priceRange: [number, number];
  setPriceRange: (value: [number, number]) => void;
  seatsMin: number;
  setSeatsMin: (value: number) => void;
  selfDriveOnly: boolean;
  setSelfDriveOnly: (value: boolean) => void;
  noDepositOnly: boolean;
  setNoDepositOnly: (value: boolean) => void;
  onResetFilters: () => void;
  activeFiltersCount: number;
}

export const VehicleFilters = ({
  searchQuery,
  setSearchQuery,
  selectedCountry,
  setSelectedCountry,
  priceSort,
  setPriceSort,
  fuelType,
  setFuelType,
  transmission,
  setTransmission,
  vehicleType,
  setVehicleType,
  priceRange,
  setPriceRange,
  seatsMin,
  setSeatsMin,
  selfDriveOnly,
  setSelfDriveOnly,
  noDepositOnly,
  setNoDepositOnly,
  onResetFilters,
  activeFiltersCount,
}: VehicleFiltersProps) => {
  const { t } = useTranslation();
  const selectedCountryData = UEMOA_COUNTRIES.find(c => c.value === selectedCountry);

  return (
    <div className="space-y-4">
      {/* Main Filters Row */}
      <div className="glass-card rounded-2xl p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          
          {/* Country Filter with Flag */}
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-full md:w-52 bg-background/50">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>{selectedCountryData?.flag}</span>
                  <span>{selectedCountryData?.label}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {UEMOA_COUNTRIES.map(country => (
                <SelectItem key={country.value} value={country.value}>
                  <span className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Price Sort */}
          <Select value={priceSort} onValueChange={(v) => setPriceSort(v as typeof priceSort)}>
            <SelectTrigger className="w-full md:w-48 bg-background/50">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t('filters.sortByPrice')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('filters.mostRecent')}</SelectItem>
              <SelectItem value="asc">{t('filters.priceAsc')}</SelectItem>
              <SelectItem value="desc">{t('filters.priceDesc')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Advanced Filters Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {t('filters.advancedFilters')}
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full max-w-[400px] sm:max-w-[540px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t('filters.advancedFilters')}</SheetTitle>
                <SheetDescription>
                  {t('filters.refineSearch')}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Vehicle Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('filters.vehicleType')}</label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fuel Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('filters.fuel')}</label>
                  <Select value={fuelType} onValueChange={setFuelType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map(fuel => (
                        <SelectItem key={fuel.value} value={fuel.value}>
                          {fuel.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Transmission */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('filters.transmission')}</label>
                  <Select value={transmission} onValueChange={setTransmission}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSMISSION_TYPES.map(trans => (
                        <SelectItem key={trans.value} value={trans.value}>
                          {trans.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('filters.priceRange')}: {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} FCFA
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    min={0}
                    max={200000}
                    step={5000}
                    className="mt-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0 FCFA</span>
                    <span>200 000 FCFA</span>
                  </div>
                </div>

                {/* Minimum Seats */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('filters.minSeats')}: {seatsMin}+
                  </label>
                  <Slider
                    value={[seatsMin]}
                    onValueChange={(value) => setSeatsMin(value[0])}
                    min={2}
                    max={12}
                    step={1}
                    className="mt-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>2 {t('filters.seats')}</span>
                    <span>12 {t('filters.seats')}</span>
                  </div>
                </div>

                {/* Self-Drive Filter (Badge Liberté) */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Car className="w-5 h-5 text-blue-400" />
                      <div>
                        <Label className="font-medium">{t('filters.selfDrive', 'Badge Liberté')}</Label>
                        <p className="text-xs text-muted-foreground">{t('filters.selfDriveDesc', 'Conduite autonome autorisée')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={selfDriveOnly}
                      onCheckedChange={setSelfDriveOnly}
                    />
                  </div>
                </div>

                {/* No Deposit Filter (Garantie GoMonto) */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <div>
                        <Label className="font-medium">{t('filters.noDeposit', 'Sans caution')}</Label>
                        <p className="text-xs text-muted-foreground">{t('filters.noDepositDesc', 'Éligible Garantie GoMonto')}</p>
                      </div>
                    </div>
                    <Switch
                      checked={noDepositOnly}
                      onCheckedChange={setNoDepositOnly}
                    />
                  </div>
                </div>

                {/* Reset Button */}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={onResetFilters}
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('filters.resetAll')}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Country Quick Pills - horizontally scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
        {UEMOA_COUNTRIES.map((country) => (
          <button
            key={country.value}
            onClick={() => setSelectedCountry(country.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              selectedCountry === country.value
                ? "bg-primary text-primary-foreground shadow-glow-primary"
                : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {country.flag} <span className="hidden sm:inline">{country.label}</span>
          </button>
        ))}
      </div>

      {/* Active Filters Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('filters.activeFilters')}:</span>
          {fuelType !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {FUEL_TYPES.find(f => f.value === fuelType)?.label}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setFuelType("all")} />
            </Badge>
          )}
          {transmission !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {TRANSMISSION_TYPES.find(t => t.value === transmission)?.label}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setTransmission("all")} />
            </Badge>
          )}
          {vehicleType !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {VEHICLE_TYPES.find(v => v.value === vehicleType)?.label}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setVehicleType("all")} />
            </Badge>
          )}
          {seatsMin > 2 && (
            <Badge variant="secondary" className="gap-1">
              {seatsMin}+ {t('filters.seats')}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSeatsMin(2)} />
            </Badge>
          )}
          {(priceRange[0] > 0 || priceRange[1] < 200000) && (
            <Badge variant="secondary" className="gap-1">
              {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} FCFA
              <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceRange([0, 200000])} />
            </Badge>
          )}
          {selfDriveOnly && (
            <Badge variant="secondary" className="gap-1 bg-blue-500/20 text-blue-400">
              <Car className="w-3 h-3" />
              {t('filters.selfDrive', 'Badge Liberté')}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelfDriveOnly(false)} />
            </Badge>
          )}
          {noDepositOnly && (
            <Badge variant="secondary" className="gap-1 bg-emerald-500/20 text-emerald-400">
              <Shield className="w-3 h-3" />
              {t('filters.noDeposit', 'Sans caution')}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setNoDepositOnly(false)} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleFilters;
