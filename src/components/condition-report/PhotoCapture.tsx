import { useRef, useState } from "react";
import { Camera, Upload, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoCaptureProps {
  label: string;
  description: string;
  onPhotoCapture: (file: File) => void;
  capturedPhoto?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

const PhotoCapture = ({
  label,
  description,
  onPhotoCapture,
  capturedPhoto,
  required = true,
  icon,
}: PhotoCaptureProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(capturedPhoto || null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onPhotoCapture(file);
  };

  const handleRetake = () => {
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const triggerCapture = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          {icon}
          {label}
          {required && <span className="text-destructive">*</span>}
        </label>
        {preview && (
          <span className="text-xs text-green-500 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Capturé
          </span>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">{description}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <img
            src={preview}
            alt={label}
            className="w-full h-40 object-cover"
          />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleRetake}
              className="bg-background/80 backdrop-blur-sm"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reprendre
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerCapture}
          className={cn(
            "w-full h-40 rounded-xl border-2 border-dashed transition-all",
            "flex flex-col items-center justify-center gap-3",
            "hover:border-primary hover:bg-primary/5",
            required ? "border-muted-foreground/30" : "border-border"
          )}
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Prendre une photo</p>
            <p className="text-xs text-muted-foreground">ou glisser-déposer</p>
          </div>
        </button>
      )}
    </div>
  );
};

export default PhotoCapture;
