import { useState } from "react";
import { 
  Car, 
  ArrowLeft, 
  ArrowRight, 
  Camera, 
  Fuel, 
  Gauge, 
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Send
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import PhotoCapture from "./PhotoCapture";
import SignaturePad from "./SignaturePad";

interface VehicleConditionReportProps {
  reservationId: string;
  vehicleId: string;
  vehicleName: string;
  reportType: "departure" | "return";
  userRole: "owner" | "renter";
  onComplete: () => void;
  onCancel: () => void;
}

type Step = "photos" | "condition" | "signatures" | "complete";

interface PhotoData {
  front?: File;
  back?: File;
  leftSide?: File;
  rightSide?: File;
  dashboard?: File;
  fuelGauge?: File;
}

interface ConditionData {
  fuelLevel: number;
  mileage: string;
  exteriorCondition: string;
  interiorCondition: string;
  notes: string;
}

const REQUIRED_PHOTOS = [
  { key: "front", label: "Avant du véhicule", description: "Photo de face, incluant la plaque d'immatriculation" },
  { key: "back", label: "Arrière du véhicule", description: "Photo arrière avec les feux et la plaque" },
  { key: "leftSide", label: "Côté gauche", description: "Vue complète du flanc gauche" },
  { key: "rightSide", label: "Côté droit", description: "Vue complète du flanc droit" },
  { key: "dashboard", label: "Tableau de bord", description: "Compteur kilométrique visible" },
  { key: "fuelGauge", label: "Jauge de carburant", description: "Niveau de carburant clairement visible" }] as const;

const VehicleConditionReport = ({
  reservationId,
  vehicleId,
  vehicleName,
  reportType,
  userRole,
  onComplete,
  onCancel,
}: VehicleConditionReportProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("photos");
  const [photos, setPhotos] = useState<PhotoData>({});
  const [condition, setCondition] = useState<ConditionData>({
    fuelLevel: 50,
    mileage: "",
    exteriorCondition: "good",
    interiorCondition: "good",
    notes: "",
  });
  const [ownerSignature, setOwnerSignature] = useState<string | null>(null);
  const [renterSignature, setRenterSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  const handlePhotoCapture = (key: keyof PhotoData, file: File) => {
    setPhotos(prev => ({ ...prev, [key]: file }));
  };

  const areAllPhotosComplete = () => {
    return REQUIRED_PHOTOS.every(photo => photos[photo.key as keyof PhotoData]);
  };

  const uploadPhoto = async (file: File, photoType: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${reservationId}/${reportType}/${photoType}_${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("condition-reports")
      .upload(fileName, file);

    if (error) throw error;
    return fileName;
  };

  const handleNextStep = async () => {
    if (currentStep === "photos") {
      if (!areAllPhotosComplete()) {
        toast({
          title: "Photos manquantes",
          description: "Veuillez prendre toutes les photos obligatoires.",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep("condition");
    } else if (currentStep === "condition") {
      if (!condition.mileage) {
        toast({
          title: "Kilométrage requis",
          description: "Veuillez entrer le kilométrage actuel.",
          variant: "destructive",
        });
        return;
      }

      // Save draft with photos
      setIsSubmitting(true);
      try {
        const uploadedPhotos: Record<string, string> = {};
        
        for (const photo of REQUIRED_PHOTOS) {
          const file = photos[photo.key as keyof PhotoData];
          if (file) {
            uploadedPhotos[photo.key] = await uploadPhoto(file, photo.key);
          }
        }

        const { data, error } = await supabase
          .from("vehicle_condition_reports")
          .insert({
            reservation_id: reservationId,
            vehicle_id: vehicleId,
            report_type: reportType,
            photo_front: uploadedPhotos.front,
            photo_back: uploadedPhotos.back,
            photo_left_side: uploadedPhotos.leftSide,
            photo_right_side: uploadedPhotos.rightSide,
            photo_dashboard: uploadedPhotos.dashboard,
            photo_fuel_gauge: uploadedPhotos.fuelGauge,
            fuel_level: condition.fuelLevel,
            mileage: parseInt(condition.mileage),
            exterior_condition: condition.exteriorCondition,
            interior_condition: condition.interiorCondition,
            notes: condition.notes,
            status: "pending_signatures",
          })
          .select("id")
          .single();

        if (error) throw error;
        setReportId(data.id);
        setCurrentStep("signatures");
      } catch (error) {
        console.error("Error saving report:", error);
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder le rapport.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSignatureComplete = async (signature: string, role: "owner" | "renter") => {
    if (role === "owner") {
      setOwnerSignature(signature);
    } else {
      setRenterSignature(signature);
    }
  };

  const handleFinalSubmit = async () => {
    if (!ownerSignature || !renterSignature || !reportId) {
      toast({
        title: "Signatures requises",
        description: "Les deux parties doivent signer le rapport.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update report with signatures
      const { error: updateError } = await supabase
        .from("vehicle_condition_reports")
        .update({
          owner_signature: ownerSignature,
          renter_signature: renterSignature,
          owner_signed_at: new Date().toISOString(),
          renter_signed_at: new Date().toISOString(),
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (updateError) throw updateError;

      // Trigger email generation
      const { error: emailError } = await supabase.functions.invoke("generate-condition-report", {
        body: { reportId },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        // Don't fail the whole process for email issues
      }

      setCurrentStep("complete");
      toast({
        title: "État des lieux terminé",
        description: "Le certificat a été envoyé aux deux parties par email.",
      });
    } catch (error) {
      console.error("Error completing report:", error);
      toast({
        title: "Erreur",
        description: "Impossible de finaliser le rapport.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPhotosStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Photos du véhicule</h2>
        <p className="text-muted-foreground">
          Prenez les 6 photos obligatoires pour documenter l'état du véhicule
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REQUIRED_PHOTOS.map((photo) => (
          <PhotoCapture
            key={photo.key}
            label={photo.label}
            description={photo.description}
            onPhotoCapture={(file) => handlePhotoCapture(photo.key as keyof PhotoData, file)}
            capturedPhoto={photos[photo.key as keyof PhotoData] ? URL.createObjectURL(photos[photo.key as keyof PhotoData]!) : undefined}
            required
          />
        ))}
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          Les photos servent de preuve en cas de litige. Assurez-vous qu'elles sont claires et montrent tout dommage existant.
        </p>
      </div>
    </div>
  );

  const renderConditionStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Gauge className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">État du véhicule</h2>
        <p className="text-muted-foreground">
          Renseignez les informations sur l'état actuel du véhicule
        </p>
      </div>

      {/* Fuel Level */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Fuel className="w-4 h-4" />
          Niveau de carburant: {condition.fuelLevel}%
        </Label>
        <Slider
          value={[condition.fuelLevel]}
          onValueChange={([value]) => setCondition(prev => ({ ...prev, fuelLevel: value }))}
          max={100}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Vide</span>
          <span>1/4</span>
          <span>1/2</span>
          <span>3/4</span>
          <span>Plein</span>
        </div>
      </div>

      {/* Mileage */}
      <div className="space-y-2">
        <Label htmlFor="mileage" className="flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          Kilométrage actuel *
        </Label>
        <Input
          id="mileage"
          type="number"
          placeholder="Ex: 45000"
          value={condition.mileage}
          onChange={(e) => setCondition(prev => ({ ...prev, mileage: e.target.value }))}
        />
      </div>

      {/* Exterior Condition */}
      <div className="space-y-3">
        <Label>État extérieur</Label>
        <RadioGroup
          value={condition.exteriorCondition}
          onValueChange={(value) => setCondition(prev => ({ ...prev, exteriorCondition: value }))}
          className="grid grid-cols-2 gap-2"
        >
          {[
            { value: "excellent", label: "Excellent" },
            { value: "good", label: "Bon" },
            { value: "fair", label: "Acceptable" },
            { value: "poor", label: "Mauvais" }].map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`ext-${option.value}`} />
              <Label htmlFor={`ext-${option.value}`} className="cursor-pointer">{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Interior Condition */}
      <div className="space-y-3">
        <Label>État intérieur</Label>
        <RadioGroup
          value={condition.interiorCondition}
          onValueChange={(value) => setCondition(prev => ({ ...prev, interiorCondition: value }))}
          className="grid grid-cols-2 gap-2"
        >
          {[
            { value: "excellent", label: "Excellent" },
            { value: "good", label: "Bon" },
            { value: "fair", label: "Acceptable" },
            { value: "poor", label: "Mauvais" }].map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`int-${option.value}`} />
              <Label htmlFor={`int-${option.value}`} className="cursor-pointer">{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Remarques et dommages existants</Label>
        <Textarea
          id="notes"
          placeholder="Décrivez tout dommage visible ou remarque importante..."
          value={condition.notes}
          onChange={(e) => setCondition(prev => ({ ...prev, notes: e.target.value }))}
          rows={4}
        />
      </div>
    </div>
  );

  const renderSignaturesStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <FileCheck className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Signatures</h2>
        <p className="text-muted-foreground">
          Les deux parties doivent signer pour valider l'état des lieux
        </p>
      </div>

      <div className="space-y-6">
        <div className={`p-4 rounded-xl border ${ownerSignature ? "border-green-500 bg-green-500/5" : "border-border"}`}>
          {ownerSignature ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Signature du loueur
                </span>
              </div>
              <img src={ownerSignature} alt="Signature loueur" className="h-20 border rounded-lg" />
            </div>
          ) : (
            <SignaturePad
              label="Signature du loueur (propriétaire)"
              onSignatureComplete={(sig) => handleSignatureComplete(sig, "owner")}
              disabled={userRole === "renter"}
            />
          )}
        </div>

        <div className={`p-4 rounded-xl border ${renterSignature ? "border-green-500 bg-green-500/5" : "border-border"}`}>
          {renterSignature ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Signature du locataire
                </span>
              </div>
              <img src={renterSignature} alt="Signature locataire" className="h-20 border rounded-lg" />
            </div>
          ) : (
            <SignaturePad
              label="Signature du locataire"
              onSignatureComplete={(sig) => handleSignatureComplete(sig, "renter")}
              disabled={userRole === "owner"}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <FileCheck className="w-5 h-5 text-primary flex-shrink-0" />
        <p className="text-sm">
          En signant, vous confirmez que l'état du véhicule correspond aux photos et informations fournies.
        </p>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold mb-2">État des lieux terminé !</h2>
      <p className="text-muted-foreground mb-6">
        Le certificat d'état du véhicule a été généré et envoyé par email aux deux parties.
      </p>
      <Button onClick={onComplete} className="btn-primary-glow">
        Terminer
      </Button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{vehicleName}</h1>
              <p className="text-sm text-muted-foreground">
                État des lieux - {reportType === "departure" ? "Départ" : "Retour"}
              </p>
            </div>
          </div>
          {currentStep !== "complete" && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Annuler
            </Button>
          )}
        </div>

        {/* Progress */}
        {currentStep !== "complete" && (
          <div className="flex items-center gap-2 mb-8">
            {(["photos", "condition", "signatures"] as Step[]).map((step, index) => (
              <div key={step} className="flex-1 flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep === step
                      ? "bg-primary text-primary-foreground"
                      : index < ["photos", "condition", "signatures"].indexOf(currentStep)
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < ["photos", "condition", "signatures"].indexOf(currentStep) ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 2 && <div className="flex-1 h-1 bg-muted rounded-full" />}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="bg-card rounded-2xl border border-border p-6">
          {currentStep === "photos" && renderPhotosStep()}
          {currentStep === "condition" && renderConditionStep()}
          {currentStep === "signatures" && renderSignaturesStep()}
          {currentStep === "complete" && renderCompleteStep()}
        </div>

        {/* Navigation */}
        {currentStep !== "complete" && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => {
                if (currentStep === "photos") onCancel();
                else if (currentStep === "condition") setCurrentStep("photos");
                else if (currentStep === "signatures") setCurrentStep("condition");
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>

            {currentStep === "signatures" ? (
              <Button
                onClick={handleFinalSubmit}
                disabled={!ownerSignature || !renterSignature || isSubmitting}
                className="btn-primary-glow"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Finaliser
              </Button>
            ) : (
              <Button onClick={handleNextStep} disabled={isSubmitting} className="btn-primary-glow">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <>
                    Suivant
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleConditionReport;
