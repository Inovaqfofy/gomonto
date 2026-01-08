import { useState } from "react";
import { Camera, Check, X, Upload, Car } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CheckinPhotosProps {
  reservationId: string;
  onComplete?: () => void;
}

type PhotoType = "front" | "back" | "left" | "right";

interface PhotoState {
  type: PhotoType;
  label: string;
  file?: File;
  preview?: string;
  uploaded: boolean;
  uploading: boolean;
}

const CheckinPhotos = ({ reservationId, onComplete }: CheckinPhotosProps) => {
  const [photos, setPhotos] = useState<PhotoState[]>([
    { type: "front", label: "Avant", uploaded: false, uploading: false },
    { type: "back", label: "Arrière", uploaded: false, uploading: false },
    { type: "left", label: "Côté gauche", uploaded: false, uploading: false },
    { type: "right", label: "Côté droit", uploaded: false, uploading: false }]);
  const [notes, setNotes] = useState("");

  const handleFileSelect = (type: PhotoType, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotos((prev) =>
        prev.map((p) =>
          p.type === type ? { ...p, file, preview: reader.result as string } : p
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (photo: PhotoState, userId: string) => {
    if (!photo.file) return;

    setPhotos((prev) =>
      prev.map((p) => (p.type === photo.type ? { ...p, uploading: true } : p))
    );

    const fileExt = photo.file.name.split(".").pop();
    const fileName = `${reservationId}_${photo.type}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("checkin-photos")
      .upload(filePath, photo.file, { upsert: true });

    if (uploadError) {
      toast.error(`Erreur upload ${photo.label}`);
      setPhotos((prev) =>
        prev.map((p) => (p.type === photo.type ? { ...p, uploading: false } : p))
      );
      return;
    }

    const { error: dbError } = await supabase.from("checkin_photos").insert({
      reservation_id: reservationId,
      photo_type: photo.type,
      file_path: filePath,
      file_name: fileName,
      notes: notes || null,
    });

    if (dbError) {
      toast.error(`Erreur sauvegarde ${photo.label}`);
    }

    setPhotos((prev) =>
      prev.map((p) =>
        p.type === photo.type ? { ...p, uploading: false, uploaded: true } : p
      )
    );
  };

  const uploadAllPhotos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    const photosToUpload = photos.filter((p) => p.file && !p.uploaded);
    
    for (const photo of photosToUpload) {
      await uploadPhoto(photo, user.id);
    }

    const allUploaded = photos.every((p) => p.uploaded || !p.file);
    if (allUploaded && photos.some((p) => p.uploaded)) {
      toast.success("Photos d'état des lieux enregistrées !");
      onComplete?.();
    }
  };

  const selectedCount = photos.filter((p) => p.file || p.uploaded).length;
  const uploadedCount = photos.filter((p) => p.uploaded).length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
          <Car className="w-8 h-8 text-primary-foreground" />
        </div>
        <h3 className="text-xl font-bold mb-2">État des lieux numérique</h3>
        <p className="text-muted-foreground text-sm">
          Prenez 4 photos du véhicule avant la remise des clés
        </p>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 gap-4">
        {photos.map((photo) => (
          <div key={photo.type} className="relative">
            <label
              className={cn(
                "block aspect-[4/3] rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden",
                photo.uploaded
                  ? "border-green-500 bg-green-500/10"
                  : photo.preview
                  ? "border-primary bg-primary/5"
                  : "border-glass-border hover:border-primary/50 bg-muted/30"
              )}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(photo.type, file);
                }}
                disabled={photo.uploading}
              />

              {photo.preview ? (
                <img
                  src={photo.preview}
                  alt={photo.label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="text-sm font-medium">{photo.label}</span>
                </div>
              )}

              {/* Status Overlay */}
              {photo.uploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {photo.uploaded && (
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
            </label>

            {/* Remove button */}
            {photo.preview && !photo.uploaded && (
              <button
                onClick={() =>
                  setPhotos((prev) =>
                    prev.map((p) =>
                      p.type === photo.type
                        ? { ...p, file: undefined, preview: undefined }
                        : p
                    )
                  )
                }
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Notes (optionnel)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Remarques sur l'état du véhicule..."
          className="w-full p-4 rounded-xl glass border border-glass-border focus:border-primary/50 focus:outline-none resize-none h-24 text-sm"
        />
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {selectedCount}/4 photos sélectionnées
        </span>
        <span className="text-green-400 font-medium">
          {uploadedCount} uploadée{uploadedCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Upload Button */}
      <button
        onClick={uploadAllPhotos}
        disabled={selectedCount === 0 || uploadedCount === selectedCount}
        className={cn(
          "w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
          selectedCount > 0 && uploadedCount < selectedCount
            ? "btn-primary-glow text-primary-foreground"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        <Upload className="w-5 h-5" />
        {uploadedCount === selectedCount && selectedCount > 0
          ? "Toutes les photos sont uploadées"
          : `Uploader ${selectedCount - uploadedCount} photo${
              selectedCount - uploadedCount !== 1 ? "s" : ""
            }`}
      </button>
    </div>
  );
};

export default CheckinPhotos;
