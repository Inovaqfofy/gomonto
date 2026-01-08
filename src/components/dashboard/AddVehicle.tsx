import { useState, useRef, useCallback } from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Car, 
  Camera, 
  CreditCard, 
  Upload, 
  X, 
  Loader2, 
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  GripVertical,
  Palette,
  Gauge,
  MapPin,
  Users,
  Fuel,
  Settings2
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import CountrySelect from "@/components/auth/CountrySelect";

// Type pour les pays UEMOA (destinations des véhicules)
type UemoaCountry = "cote_ivoire" | "senegal" | "mali" | "burkina_faso" | "niger" | "togo" | "benin" | "guinee_bissau";

interface AddVehicleProps {
  userId: string;
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

interface VehicleData {
  vin: string;
  brand: string;
  model: string;
  year: number;
  body_type: string;
  license_plate: string;
  mileage: string;
  color: string;
  seats: number;
  fuel_type: "essence" | "diesel" | "hybride" | "electrique";
  transmission: "manuelle" | "automatique";
  daily_price: number;
  description: string;
  features: string[];
  location_city: string;
  location_country: UemoaCountry;
  has_driver: boolean;
  insurance_expiry_date: string;
  technical_inspection_expiry_date: string;
}

interface VINResult {
  brand: string;
  model: string;
  year: number;
  body_type: string;
  fuel_type: string;
}

const initialData: VehicleData = {
  vin: "",
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  body_type: "",
  license_plate: "",
  mileage: "",
  color: "",
  seats: 5,
  fuel_type: "essence",
  transmission: "manuelle",
  daily_price: 30000,
  description: "",
  features: [],
  location_city: "",
  location_country: "cote_ivoire",
  has_driver: false,
  insurance_expiry_date: "",
  technical_inspection_expiry_date: "",
};

const featuresList = [
  "Climatisation",
  "GPS",
  "Bluetooth",
  "Caméra de recul",
  "Sièges cuir",
  "Toit ouvrant",
  "Régulateur de vitesse",
  "Vitres électriques",
  "Chauffeur disponible",
  "4x4",
  "Boîte auto",
  "USB/AUX"];

// Extended brands list sorted alphabetically (popular in West Africa)
const brandsList = [
  "Acura", "Alfa Romeo", "Audi", "BMW", "BYD", "Cadillac", "Changan", "Chevrolet",
  "Chrysler", "Citroën", "Dacia", "Dodge", "Dongfeng", "Fiat", "Ford", "GAC",
  "Geely", "GMC", "Great Wall", "Haval", "Hino", "Honda", "Hyundai", "Infiniti",
  "Isuzu", "Iveco", "JAC", "Jaguar", "Jeep", "Kia", "Land Rover", "Lexus",
  "Lincoln", "MAN", "Mazda", "Mercedes-Benz", "Mitsubishi", "Nissan", "Opel",
  "Peugeot", "Porsche", "RAM", "Renault", "Rover", "SEAT", "Škoda", "Ssangyong",
  "Subaru", "Suzuki", "Tata", "Toyota", "Volkswagen", "Volvo"
];

const colorsList = [
  "Blanc", "Noir", "Gris", "Argent", "Bleu", "Rouge", 
  "Vert", "Beige", "Marron", "Or", "Orange"
];

const bodyTypesList = [
  "Berline", "SUV", "4x4", "Pick-up", "Minivan", "Coupé", 
  "Break", "Monospace", "Utilitaire", "Cabriolet"
];

// Mapping English body types from VIN to French
const bodyTypeMapping: Record<string, string> = {
  "Sedan": "Berline",
  "Hatchback": "Berline",
  "Sport Utility Vehicle (SUV)": "SUV",
  "Sport Utility Vehicle": "SUV",
  "SUV": "SUV",
  "Pickup": "Pick-up",
  "Pickup Truck": "Pick-up",
  "Truck": "Pick-up",
  "Multipurpose Vehicle (MPV)": "Monospace",
  "MPV": "Monospace",
  "Minivan": "Minivan",
  "Van": "Minivan",
  "Wagon": "Break",
  "Station Wagon": "Break",
  "Convertible": "Cabriolet",
  "Coupe": "Coupé",
  "Crossover": "SUV",
  "Off-road": "4x4",
  "Bus": "Utilitaire",
  "Cargo Van": "Utilitaire",
};

const AddVehicle = ({ userId, onComplete }: AddVehicleProps) => {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<VehicleData>(initialData);
  
  // Photos state
  const [vehiclePhotos, setVehiclePhotos] = useState<File[]>([]);
  const [vehiclePhotoUrls, setVehiclePhotoUrls] = useState<string[]>([]);
  
  // Documents state
  const [insuranceDoc, setInsuranceDoc] = useState<File | null>(null);
  const [technicalDoc, setTechnicalDoc] = useState<File | null>(null);
  
  // VIN lookup state
  const [isVinLookup, setIsVinLookup] = useState(false);
  const [vinResult, setVinResult] = useState<VINResult | null>(null);
  const [vinError, setVinError] = useState<string | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [customBrand, setCustomBrand] = useState("");
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insuranceInputRef = useRef<HTMLInputElement>(null);
  const technicalInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { id: 1, title: "Identification", icon: Car, subtitle: "VIN & Infos" },
    { id: 2, title: "Photos", icon: Camera, subtitle: "Équipements" },
    { id: 3, title: "Tarification", icon: CreditCard, subtitle: "Disponibilité" }];

  const updateData = (field: keyof VehicleData, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFeature = (feature: string) => {
    setData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  // VIN Lookup using NHTSA API
  const lookupVIN = useCallback(async (vin: string) => {
    if (vin.length !== 17) return;
    
    setIsVinLookup(true);
    setVinError(null);
    setVinResult(null);

    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
      );
      const result = await response.json();

      if (result.Results) {
        const getValue = (variableId: number) => {
          const item = result.Results.find((r: { VariableId: number }) => r.VariableId === variableId);
          return item?.Value || "";
        };

        const brand = getValue(26); // Make
        const model = getValue(28); // Model
        const year = parseInt(getValue(29)) || new Date().getFullYear(); // Model Year
        const bodyType = getValue(5); // Body Class
        const fuelType = getValue(24); // Fuel Type Primary

        if (brand && model) {
          const fuelMapping: Record<string, VehicleData["fuel_type"]> = {
            "Gasoline": "essence",
            "Diesel": "diesel",
            "Electric": "electrique",
            "Hybrid": "hybride",
          };

          // Map body type from English to French
          const mappedBodyType = bodyTypeMapping[bodyType] || bodyTypeMapping[bodyType.split('/')[0]?.trim()] || "";

          const vinData: VINResult = {
            brand,
            model,
            year,
            body_type: bodyType,
            fuel_type: fuelType,
          };

          setVinResult(vinData);
          
          // Check if brand is in the list, if not set custom brand
          const brandInList = brandsList.includes(brand);
          if (!brandInList && brand) {
            setCustomBrand(brand);
          }
          
          setData(prev => ({
            ...prev,
            brand: brandInList ? brand : "Autre",
            model,
            year,
            body_type: mappedBodyType || prev.body_type,
            fuel_type: fuelMapping[fuelType] || prev.fuel_type,
          }));
          
          // If brand not in list, store it in customBrand for display
          if (!brandInList && brand) {
            updateData("brand", brand);
          }

          toast({
            title: "Véhicule identifié !",
            description: `${brand} ${model} (${year}) détecté avec succès.`,
          });
        } else {
          setVinError("VIN non reconnu. Veuillez saisir les informations manuellement.");
        }
      }
    } catch (error) {
      console.error("VIN lookup error:", error);
      setVinError("Erreur de connexion. Veuillez saisir les informations manuellement.");
    } finally {
      setIsVinLookup(false);
    }
  }, []);

  const handleVinChange = (value: string) => {
    const cleanVin = value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    updateData("vin", cleanVin);
    
    if (cleanVin.length === 17) {
      lookupVIN(cleanVin);
    } else {
      setVinResult(null);
      setVinError(null);
    }
  };

  // Photo handling with drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processPhotoFiles(files);
  };

  const processPhotoFiles = (files: File[]) => {
    if (vehiclePhotos.length + files.length > 8) {
      toast({
        title: "Limite atteinte",
        description: "Vous pouvez télécharger jusqu'à 8 photos.",
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter(
      (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024
    );

    setVehiclePhotos((prev) => [...prev, ...validFiles]);
    validFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setVehiclePhotoUrls((prev) => [...prev, url]);
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processPhotoFiles(files);
  };

  const removePhoto = (index: number) => {
    setVehiclePhotos((prev) => prev.filter((_, i) => i !== index));
    setVehiclePhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocumentSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "insurance" | "technical"
  ) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 10 * 1024 * 1024) {
      if (type === "insurance") {
        setInsuranceDoc(file);
      } else {
        setTechnicalDoc(file);
      }
    }
  };

  // Validation
  const isStep1Valid = () => {
    return (
      data.brand.trim() !== "" &&
      data.model.trim() !== "" &&
      data.license_plate.trim() !== "" &&
      data.location_city.trim() !== "" &&
      data.year >= 1990 &&
      data.year <= new Date().getFullYear() + 1
    );
  };

  const isStep2Valid = () => {
    return (
      vehiclePhotos.length >= 1 &&
      data.insurance_expiry_date !== "" &&
      data.technical_inspection_expiry_date !== "" &&
      insuranceDoc !== null &&
      technicalDoc !== null
    );
  };

  const handleStep1Submit = async () => {
    if (!isStep1Valid()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: vehicle, error } = await supabase
        .from("vehicles")
        .insert({
          owner_id: userId,
          brand: data.brand,
          model: data.model,
          year: data.year,
          license_plate: data.license_plate,
          seats: data.seats,
          fuel_type: data.fuel_type,
          transmission: data.transmission,
          daily_price: data.daily_price,
          description: data.description,
          features: data.features,
          location_city: data.location_city,
          location_country: data.location_country,
        })
        .select()
        .single();

      if (error) throw error;

      setVehicleId(vehicle.id);
      setStep(2);
      toast({
        title: "Véhicule créé",
        description: "Ajoutez maintenant des photos de votre véhicule.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le véhicule.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!isStep2Valid()) {
      toast({
        title: "Photos requises",
        description: "Ajoutez au moins une photo de votre véhicule.",
        variant: "destructive",
      });
      return;
    }

    if (!vehicleId) return;

    setIsSubmitting(true);

    try {
      // Upload vehicle photos
      for (let i = 0; i < vehiclePhotos.length; i++) {
        const file = vehiclePhotos[i];
        const ext = file.name.split(".").pop();
        const filePath = `${userId}/${vehicleId}/${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("vehicle-photos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        await supabase.from("vehicle_photos").insert({
          vehicle_id: vehicleId,
          file_path: filePath,
          file_name: file.name,
          is_primary: i === 0,
        });
      }

      // Upload documents and save expiry dates
      let insurancePath = "";
      let technicalPath = "";

      if (insuranceDoc) {
        const ext = insuranceDoc.name.split(".").pop();
        insurancePath = `${userId}/${vehicleId}/insurance.${ext}`;
        await supabase.storage.from("kyc-documents").upload(insurancePath, insuranceDoc);
      }

      if (technicalDoc) {
        const ext = technicalDoc.name.split(".").pop();
        technicalPath = `${userId}/${vehicleId}/technical.${ext}`;
        await supabase.storage.from("kyc-documents").upload(technicalPath, technicalDoc);
      }

      // Update vehicle with document paths and expiry dates
      await supabase
        .from("vehicles")
        .update({
          insurance_expiry_date: data.insurance_expiry_date,
          technical_inspection_expiry_date: data.technical_inspection_expiry_date,
          insurance_document_path: insurancePath,
          technical_document_path: technicalPath,
        })
        .eq("id", vehicleId);

      setStep(3);
      toast({
        title: "Photos ajoutées",
        description: "Configurez maintenant la tarification.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger les photos.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    toast({
      title: "Véhicule ajouté !",
      description: "Votre véhicule est en attente de vérification.",
    });
    onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 pb-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Ajouter un véhicule</h1>
        <p className="text-muted-foreground">Complétez les 3 étapes pour publier votre véhicule</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between max-w-xl mx-auto">
        {steps.map((s, index) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                  step >= s.id
                    ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {step > s.id ? <Check className="w-6 h-6" /> : <s.icon className="w-6 h-6" />}
              </div>
              <span className={`text-sm mt-2 font-medium ${step >= s.id ? "text-foreground" : "text-muted-foreground"}`}>
                {s.title}
              </span>
              <span className="text-xs text-muted-foreground">{s.subtitle}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-1 flex-1 mx-3 rounded-full ${step > s.id ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form Container */}
      <div className="bg-card rounded-3xl p-6 md:p-8 shadow-xl border border-border relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

        <div className="relative">
          {/* Step 1: Identification */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-2">Identification du véhicule</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Entrez le numéro de châssis (VIN) pour une détection automatique ou remplissez manuellement.
              </p>

              {/* VIN Input or Manual Entry Toggle */}
              {!isManualEntry ? (
                <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Search className="w-5 h-5 text-primary" />
                      <label className="font-medium">Numéro de Châssis (VIN)</label>
                      <span className="text-xs text-muted-foreground">(17 caractères)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsManualEntry(true)}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Saisir manuellement →
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={data.vin}
                      onChange={(e) => handleVinChange(e.target.value)}
                      placeholder="Ex: 1HGBH41JXMN109186"
                      maxLength={17}
                      className="w-full px-4 py-4 rounded-xl bg-card border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-lg tracking-wider uppercase"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{data.vin.length}/17</span>
                      {isVinLookup && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                      {vinResult && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {vinError && <AlertCircle className="w-5 h-5 text-amber-500" />}
                    </div>
                  </div>

                  {vinResult && (
                    <div className="mt-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
                        <CheckCircle className="w-4 h-4" />
                        Détails du véhicule récupérés avec succès !
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-300">
                        {vinResult.brand} {vinResult.model} ({vinResult.year})
                        {vinResult.body_type && ` - ${vinResult.body_type}`}
                      </p>
                    </div>
                  )}

                  {vinError && (
                    <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {vinError}
                      </div>
                    </div>
                  )}
                  
                  <p className="mt-4 text-xs text-muted-foreground text-center">
                    Le VIN permet de pré-remplir automatiquement les informations du véhicule
                  </p>
                </div>
              ) : (
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="w-5 h-5 text-primary" />
                      <span className="font-medium text-primary">Mode saisie manuelle</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsManualEntry(false)}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      ← Utiliser le VIN
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Remplissez les informations ci-dessous manuellement
                  </p>
                </div>
              )}

              {/* Manual Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Car className="w-4 h-4" />
                    Marque *
                  </label>
                  {/* Show custom brand input if VIN returned unknown brand or user selected "Autre" */}
                  {(customBrand && !brandsList.includes(data.brand)) || data.brand === "Autre" ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={customBrand || data.brand === "Autre" ? customBrand : data.brand}
                        onChange={(e) => {
                          setCustomBrand(e.target.value);
                          updateData("brand", e.target.value);
                        }}
                        placeholder="Saisir la marque"
                        className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCustomBrand("");
                          updateData("brand", "");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        ← Choisir dans la liste
                      </button>
                    </div>
                  ) : (
                    <select
                      value={data.brand}
                      onChange={(e) => {
                        if (e.target.value === "Autre") {
                          setCustomBrand("");
                        }
                        updateData("brand", e.target.value);
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Sélectionner une marque</option>
                      {brandsList.map((brand) => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                      <option value="Autre">Autre marque...</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Settings2 className="w-4 h-4" />
                    Modèle *
                  </label>
                  <input
                    type="text"
                    value={data.model}
                    onChange={(e) => updateData("model", e.target.value)}
                    placeholder="Ex: Land Cruiser"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Année *</label>
                  <input
                    type="number"
                    value={data.year}
                    onChange={(e) => updateData("year", parseInt(e.target.value))}
                    min={1990}
                    max={2030}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Immatriculation *</label>
                  <input
                    type="text"
                    value={data.license_plate}
                    onChange={(e) => updateData("license_plate", e.target.value.toUpperCase())}
                    placeholder="DK-1234-AB"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Gauge className="w-4 h-4" />
                    Kilométrage
                  </label>
                  <input
                    type="text"
                    value={data.mileage}
                    onChange={(e) => updateData("mileage", e.target.value)}
                    placeholder="85 000 km"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Palette className="w-4 h-4" />
                    Couleur
                  </label>
                  <select
                    value={data.color}
                    onChange={(e) => updateData("color", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none appearance-none"
                  >
                    <option value="">Couleur</option>
                    {colorsList.map((color) => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Users className="w-4 h-4" />
                    Places
                  </label>
                  <input
                    type="number"
                    value={data.seats}
                    onChange={(e) => updateData("seats", parseInt(e.target.value))}
                    min={1}
                    max={20}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Carrosserie</label>
                  <select
                    value={data.body_type}
                    onChange={(e) => updateData("body_type", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none appearance-none"
                  >
                    <option value="">Type</option>
                    {bodyTypesList.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Fuel className="w-4 h-4" />
                    Carburant
                  </label>
                  <select
                    value={data.fuel_type}
                    onChange={(e) => updateData("fuel_type", e.target.value as VehicleData["fuel_type"])}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none appearance-none"
                  >
                    <option value="essence">Essence</option>
                    <option value="diesel">Diesel</option>
                    <option value="hybride">Hybride</option>
                    <option value="electrique">Électrique</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Transmission</label>
                  <select
                    value={data.transmission}
                    onChange={(e) => updateData("transmission", e.target.value as VehicleData["transmission"])}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none appearance-none"
                  >
                    <option value="manuelle">Manuelle</option>
                    <option value="automatique">Automatique</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CountrySelect
                  value={data.location_country}
                  onChange={(v) => updateData("location_country", v)}
                />
                <div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4" />
                    Ville de stationnement *
                  </label>
                  <input
                    type="text"
                    value={data.location_city}
                    onChange={(e) => updateData("location_city", e.target.value)}
                    placeholder="Abidjan"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleStep1Submit}
                disabled={isSubmitting || !isStep1Valid()}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  isStep1Valid()
                    ? "btn-primary-glow text-primary-foreground"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="relative z-10">Continuer</span>
                    <ArrowRight className="w-5 h-5 relative z-10" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Photos & Equipment */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-2">Photos & Équipements</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Ajoutez des photos attractives et sélectionnez les équipements disponibles.
              </p>

              {/* Photo Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-2xl p-8 border-2 border-dashed transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
                
                <div className="relative text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-medium mb-2">Glissez-déposez vos photos ici</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    ou cliquez pour sélectionner (max 8 photos, 5MB chacune)
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                  >
                    Parcourir
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {/* Photo Preview Grid */}
              {vehiclePhotoUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {vehiclePhotoUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-xl overflow-hidden border border-border group"
                    >
                      <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {index === 0 && (
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          Principale
                        </div>
                      )}
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Documents & Expiry Dates */}
              <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Documents obligatoires & Dates d'expiration
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ces documents sont privés et nécessaires pour la conformité. Les dates d'expiration permettent de vous alerter avant échéance.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Insurance */}
                  <div className="space-y-3">
                    <div
                      onClick={() => insuranceInputRef.current?.click()}
                      className={`p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                        insuranceDoc ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          insuranceDoc ? "bg-green-100 dark:bg-green-800" : "bg-muted"
                        }`}>
                          <FileText className={`w-6 h-6 ${insuranceDoc ? "text-green-600" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Attestation d'assurance *</p>
                          <p className="text-xs text-muted-foreground">
                            {insuranceDoc ? insuranceDoc.name : "PDF ou Image"}
                          </p>
                        </div>
                        {insuranceDoc && <Check className="w-5 h-5 text-green-500" />}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Date d'expiration *</label>
                      <input
                        type="date"
                        value={data.insurance_expiry_date}
                        onChange={(e) => updateData("insurance_expiry_date", e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    ref={insuranceInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentSelect(e, "insurance")}
                    className="hidden"
                  />

                  {/* Technical Inspection */}
                  <div className="space-y-3">
                    <div
                      onClick={() => technicalInputRef.current?.click()}
                      className={`p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                        technicalDoc ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          technicalDoc ? "bg-green-100 dark:bg-green-800" : "bg-muted"
                        }`}>
                          <FileText className={`w-6 h-6 ${technicalDoc ? "text-green-600" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Visite technique *</p>
                          <p className="text-xs text-muted-foreground">
                            {technicalDoc ? technicalDoc.name : "PDF ou Image"}
                          </p>
                        </div>
                        {technicalDoc && <Check className="w-5 h-5 text-green-500" />}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">Date d'expiration *</label>
                      <input
                        type="date"
                        value={data.technical_inspection_expiry_date}
                        onChange={(e) => updateData("technical_inspection_expiry_date", e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  <input
                    ref={technicalInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentSelect(e, "technical")}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Features Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Équipements & Options</label>
                <div className="flex flex-wrap gap-2">
                  {featuresList.map((feature) => (
                    <button
                      key={feature}
                      type="button"
                      onClick={() => toggleFeature(feature)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        data.features.includes(feature)
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {data.features.includes(feature) && <Check className="w-3 h-3 inline mr-1" />}
                      {feature}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Description (optionnel)</label>
                <textarea
                  value={data.description}
                  onChange={(e) => updateData("description", e.target.value)}
                  rows={3}
                  placeholder="Décrivez votre véhicule (état, particularités, conditions de location...)"
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl font-medium bg-muted text-muted-foreground hover:bg-muted/80 flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Retour
                </button>
                <button
                  onClick={handleStep2Submit}
                  disabled={isSubmitting || !isStep2Valid()}
                  className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                    isStep2Valid()
                      ? "btn-primary-glow text-primary-foreground"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span className="relative z-10">Continuer</span>
                      <ArrowRight className="w-5 h-5 relative z-10" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Pricing & Availability */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-2">Tarification & Disponibilité</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Définissez votre prix journalier et confirmez la mise en ligne.
              </p>

              {/* Price Setting */}
              <div className="bg-muted/50 rounded-2xl p-6 border border-border">
                <label className="flex items-center gap-2 font-medium mb-4">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Prix de location journalier (FCFA)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={data.daily_price}
                    onChange={(e) => updateData("daily_price", parseInt(e.target.value) || 0)}
                    min={5000}
                    step={1000}
                    className="w-full px-6 py-4 rounded-xl bg-card border border-border focus:border-primary focus:outline-none text-2xl font-bold text-center"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    FCFA / jour
                  </span>
                </div>
                <div className="flex justify-between mt-4 text-sm text-muted-foreground">
                  <button
                    onClick={() => updateData("daily_price", 15000)}
                    className="px-3 py-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    15 000
                  </button>
                  <button
                    onClick={() => updateData("daily_price", 25000)}
                    className="px-3 py-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    25 000
                  </button>
                  <button
                    onClick={() => updateData("daily_price", 40000)}
                    className="px-3 py-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    40 000
                  </button>
                  <button
                    onClick={() => updateData("daily_price", 60000)}
                    className="px-3 py-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    60 000
                  </button>
                  <button
                    onClick={() => updateData("daily_price", 100000)}
                    className="px-3 py-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    100 000
                  </button>
                </div>
              </div>

              {/* Availability Info */}
              <div className="bg-card p-6 rounded-xl border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium">Véhicule disponible 24/7</p>
                    <p className="text-sm text-muted-foreground">
                      Gérez les indisponibilités depuis le calendrier après la création
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-primary/5 p-6 rounded-xl border border-primary/20">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5 text-primary" />
                  Récapitulatif
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Véhicule</span>
                    <p className="font-medium">{data.brand} {data.model} ({data.year})</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Immatriculation</span>
                    <p className="font-medium">{data.license_plate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Localisation</span>
                    <p className="font-medium">{data.location_city}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Prix journalier</span>
                    <p className="font-bold text-primary">{data.daily_price.toLocaleString()} FCFA</p>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-muted/50 p-6 rounded-xl border border-border">
                <h4 className="font-medium mb-3">📋 Prochaines étapes</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    Votre véhicule sera examiné par notre équipe
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    Vous recevrez une notification une fois validé
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    Les locataires pourront alors le réserver
                  </li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl font-medium bg-muted text-muted-foreground hover:bg-muted/80 flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Retour
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Publier le véhicule</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddVehicle;
