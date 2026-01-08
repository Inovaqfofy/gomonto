import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, X, Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DocumentUploadProps {
  userId: string;
  documentType: "drivers_license" | "id_card" | "passport" | "international_license" | "selfie" | "proof_of_address";
  label: string;
  description: string;
  onUploadComplete: (filePath: string) => void;
  existingFile?: string;
}

const DocumentUpload = ({
  userId,
  documentType,
  label,
  description,
  onUploadComplete,
  existingFile,
}: DocumentUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(existingFile || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Format non supporté",
        description: "Veuillez télécharger une image (JPG, PNG, WebP) ou un PDF.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 10 Mo.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setProgress(0);

    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${documentType}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Save document reference to database
      const { error: dbError } = await supabase
        .from("kyc_documents")
        .upsert({
          user_id: userId,
          document_type: documentType,
          file_path: filePath,
          file_name: file.name,
          status: "uploaded",
        }, { onConflict: "user_id,document_type" });

      if (dbError) throw dbError;

      clearInterval(progressInterval);
      setProgress(100);
      setUploadedFile(file.name);
      onUploadComplete(filePath);

      toast({
        title: "Document téléchargé",
        description: "Votre document a été envoyé avec succès.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erreur de téléchargement",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleRemove = async () => {
    if (!uploadedFile) return;

    try {
      await supabase.storage
        .from("kyc-documents")
        .remove([`${userId}/${documentType}.*`]);

      await supabase
        .from("kyc_documents")
        .delete()
        .eq("user_id", userId)
        .eq("document_type", documentType);

      setUploadedFile(null);
      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé.",
      });
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <div className="glass-card p-4 border border-glass-border">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          uploadedFile 
            ? "bg-green-500/20 text-green-400" 
            : "bg-primary/10 text-primary"
        }`}>
          {uploadedFile ? (
            <CheckCircle className="w-6 h-6" />
          ) : (
            <FileText className="w-6 h-6" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold mb-1">{label}</h4>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>

          {isUploading ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Téléchargement en cours...
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          ) : uploadedFile ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-400 truncate max-w-[200px]">
                ✓ {uploadedFile}
              </span>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all text-sm"
            >
              <Upload className="w-4 h-4" />
              Choisir un fichier
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;
