import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Camera, Upload, Loader2, AlertTriangle, Car, Wrench, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const formSchema = z.object({
  incident_type: z.enum(["accident", "breakdown", "theft", "other"]),
  description: z.string().min(10, "Décrivez l'incident en au moins 10 caractères"),
  location_address: z.string().optional(),
});

interface IncidentReportFormProps {
  reservationId: string;
  vehicleId: string;
  userId: string;
  onSuccess?: () => void;
}

const incidentTypes = [
  { value: "accident", label: "Accident", icon: <Car className="h-5 w-5" />, color: "text-red-500" },
  { value: "breakdown", label: "Panne", icon: <Wrench className="h-5 w-5" />, color: "text-orange-500" },
  { value: "theft", label: "Vol", icon: <ShieldAlert className="h-5 w-5" />, color: "text-purple-500" },
  { value: "other", label: "Autre", icon: <AlertTriangle className="h-5 w-5" />, color: "text-yellow-500" }];

const IncidentReportForm = ({ reservationId, vehicleId, userId, onSuccess }: IncidentReportFormProps) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      incident_type: "accident",
      description: "",
      location_address: "",
    },
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).slice(0, 5 - photos.length);
    setPhotos((prev) => [...prev, ...newPhotos]);

    newPhotos.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const getLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast({
        title: "Géolocalisation non supportée",
        description: "Votre navigateur ne supporte pas la géolocalisation",
        variant: "destructive",
      });
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });

        // Reverse geocoding with OpenStreetMap Nominatim
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          if (data.display_name) {
            form.setValue("location_address", data.display_name);
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          form.setValue("location_address", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }

        setIsLocating(false);
        toast({
          title: "Position détectée",
          description: "Votre position a été enregistrée",
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Erreur de localisation",
          description: "Impossible d'obtenir votre position",
          variant: "destructive",
        });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const uploadedPaths: string[] = [];

    for (const photo of photos) {
      const fileName = `${userId}/${reservationId}/${Date.now()}-${photo.name}`;
      const { error } = await supabase.storage
        .from("incident-photos")
        .upload(fileName, photo);

      if (!error) {
        uploadedPaths.push(fileName);
      }
    }

    return uploadedPaths;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      // Upload photos first
      const photoPaths = await uploadPhotos();

      // Create incident report
      const { error } = await supabase.from("incident_reports").insert({
        reservation_id: reservationId,
        vehicle_id: vehicleId,
        reporter_id: userId,
        incident_type: values.incident_type,
        description: values.description,
        location_address: values.location_address || null,
        location_lat: location?.lat || null,
        location_lng: location?.lng || null,
        photos: photoPaths,
      });

      if (error) throw error;

      toast({
        title: "Déclaration envoyée",
        description: "Votre déclaration de sinistre a été enregistrée. Notre équipe vous contactera rapidement.",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la déclaration. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Incident Type */}
        <FormField
          control={form.control}
          name="incident_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type d'incident</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 gap-3"
                >
                  {incidentTypes.map((type) => (
                    <Label
                      key={type.value}
                      htmlFor={type.value}
                      className={`
                        flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all
                        ${field.value === type.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                      `}
                    >
                      <RadioGroupItem value={type.value} id={type.value} />
                      <span className={type.color}>{type.icon}</span>
                      <span className="font-medium">{type.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description de l'incident</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Décrivez ce qui s'est passé, les circonstances, les dégâts constatés..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location */}
        <FormField
          control={form.control}
          name="location_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Localisation</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="Adresse de l'incident" {...field} />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  onClick={getLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {location && (
                <p className="text-xs text-muted-foreground">
                  GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Photo Upload */}
        <div className="space-y-3">
          <Label>Photos de l'incident (max 5)</Label>
          
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={preview}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removePhoto(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}

          {photos.length < 5 && (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Camera className="h-5 w-5" />
                    <Upload className="h-5 w-5" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Prendre une photo ou importer
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </CardContent>
            </Card>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            "Envoyer la déclaration"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default IncidentReportForm;
