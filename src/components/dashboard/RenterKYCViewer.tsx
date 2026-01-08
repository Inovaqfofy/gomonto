import { useState, useEffect } from "react";
import { FileText, CheckCircle, AlertTriangle, Clock, ZoomIn, X, Shield, ExternalLink } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KYCDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  status: string;
  expiry_date: string | null;
  document_country: string | null;
  signed_url: string | null;
  expires_at: string | null;
}

interface RenterKYCViewerProps {
  renterId: string;
  reservationId: string;
  renterName?: string;
  onVerificationComplete?: () => void;
}

const RenterKYCViewer = ({ 
  renterId, 
  reservationId, 
  renterName,
  onVerificationComplete 
}: RenterKYCViewerProps) => {
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    fetchKYCDocuments();
  }, [renterId, reservationId]);

  const fetchKYCDocuments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("kyc-document-access", {
        body: { renter_id: renterId, reservation_id: reservationId }
      });

      if (error) {
        console.error("Error fetching KYC documents:", error);
        toast.error("Impossible de charger les documents KYC");
        return;
      }

      if (data.success) {
        setDocuments(data.documents || []);
        setAccessExpiresAt(data.access_expires_at);
      } else {
        toast.error(data.message || "Erreur lors du chargement");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      drivers_license: "Permis de conduire",
      id_card: "Pièce d'identité",
      passport: "Passeport",
      residence_permit: "Carte de séjour",
      selfie_with_id: "Selfie avec document",
      proof_of_address: "Justificatif de domicile",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
      verified: { label: "Vérifié", color: "text-green-400 bg-green-500/10", icon: CheckCircle },
      pre_verified: { label: "Pré-vérifié GoMonto", color: "text-blue-400 bg-blue-500/10", icon: Shield },
      uploaded: { label: "En attente", color: "text-amber-400 bg-amber-500/10", icon: Clock },
      rejected: { label: "Rejeté", color: "text-red-400 bg-red-500/10", icon: AlertTriangle },
      expired: { label: "Expiré", color: "text-gray-400 bg-gray-500/10", icon: AlertTriangle },
    };
    return configs[status] || configs.uploaded;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="glass-card p-6 border border-glass-border text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h4 className="font-semibold mb-2">Aucun document KYC</h4>
        <p className="text-sm text-muted-foreground">
          Ce locataire n'a pas encore téléchargé ses documents d'identité.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Documents KYC{renterName ? ` - ${renterName}` : ""}</h3>
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length > 1 ? "s" : ""} disponible{documents.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        
        {accessExpiresAt && (
          <div className="text-xs text-muted-foreground">
            Accès jusqu'au {new Date(accessExpiresAt).toLocaleDateString("fr-FR", { 
              day: "numeric", 
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </div>
        )}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => {
          const statusConfig = getStatusBadge(doc.status);
          const StatusIcon = statusConfig.icon;
          
          return (
            <div
              key={doc.id}
              className="glass-card p-4 border border-glass-border hover:border-primary/30 transition-all"
            >
              {/* Document Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium">{getDocumentTypeLabel(doc.document_type)}</h4>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {doc.file_name}
                  </p>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  statusConfig.color
                )}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </span>
              </div>

              {/* Document Preview */}
              {doc.signed_url ? (
                <div className="relative group">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    <img
                      src={doc.signed_url}
                      alt={doc.file_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setSelectedImage(doc.signed_url)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-sm font-medium"
                  >
                    <ZoomIn className="w-5 h-5" />
                    Agrandir
                  </button>
                </div>
              ) : (
                <div className="aspect-[4/3] rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                </div>
              )}

              {/* Document Meta */}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                {doc.document_country && (
                  <span>Pays: {doc.document_country}</span>
                )}
                {doc.expiry_date && (
                  <span>Expire: {new Date(doc.expiry_date).toLocaleDateString("fr-FR")}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-glass-border">
        <button
          onClick={onVerificationComplete}
          className="flex-1 btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Vérifier l'identité en personne
        </button>
        <button
          onClick={() => toast.info("Signaler une anomalie - fonctionnalité à venir")}
          className="px-4 py-3 rounded-xl glass border border-glass-border hover:border-amber-500/30 text-amber-400 transition-colors"
        >
          <AlertTriangle className="w-5 h-5" />
        </button>
      </div>

      {/* Zoom Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-black/90">
          <DialogHeader className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setSelectedImage(null)}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Document agrandi"
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RenterKYCViewer;
