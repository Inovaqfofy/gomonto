import { useState, useEffect } from "react";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  FileText, CheckCircle, XCircle, Clock, Eye, ZoomIn, 
  Search, Filter, AlertTriangle, Shield, User, X 
} from "lucide-react";
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
  user_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  status: string;
  uploaded_at: string;
  expiry_date: string | null;
  document_country: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    nationality: string | null;
    profile_type: string;
  };
}

const KYCVerificationPanel = () => {
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"uploaded" | "all" | "pre_verified" | "rejected">("uploaded");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<KYCDocument | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [filter]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // Requête séparée pour les documents KYC (évite le problème de jointure sans FK)
      let query = supabase
        .from("kyc_documents")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter as any);
      }

      const { data: docs, error: docsError } = await query;

      if (docsError) throw docsError;

      if (!docs || docs.length === 0) {
        setDocuments([]);
        return;
      }

      // Récupérer les profils correspondants
      const userIds = [...new Set(docs.map(d => d.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, nationality, profile_type")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Fusionner les données
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const formattedData = docs.map(doc => ({
        ...doc,
        profile: profileMap.get(doc.user_id) || null
      }));
      
      setDocuments(formattedData);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  };

  const viewDocument = async (doc: KYCDocument) => {
    setSelectedDoc(doc);
    
    try {
      const { data, error } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(doc.file_path, 3600); // 1 hour

      if (error) throw error;
      setSignedUrl(data.signedUrl);
    } catch (error) {
      console.error("Error getting signed URL:", error);
      toast.error("Impossible de charger le document");
    }
  };

  const handlePreVerify = async () => {
    if (!selectedDoc) return;
    
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update document status - cast to any for extended status
      const { error: updateError } = await supabase
        .from("kyc_documents")
        .update({ 
          status: "verified" as any, // pre_verified stored as verified for now
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", selectedDoc.id);

      if (updateError) throw updateError;

      // Log in history
      await supabase
        .from("kyc_verification_history")
        .insert({
          user_id: selectedDoc.user_id,
          document_id: selectedDoc.id,
          previous_status: selectedDoc.status,
          new_status: "pre_verified",
          changed_by: user?.id,
          verification_type: "platform",
          reason: "Document pré-vérifié par l'équipe GoMonto"
        });

      toast.success("Document pré-vérifié !");
      setSelectedDoc(null);
      setSignedUrl(null);
      fetchDocuments();
    } catch (error) {
      console.error("Pre-verify error:", error);
      toast.error("Erreur lors de la pré-vérification");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc || !rejectionReason.trim()) {
      toast.error("Veuillez indiquer la raison du rejet");
      return;
    }
    
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update document status
      const { error: updateError } = await supabase
        .from("kyc_documents")
        .update({ 
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", selectedDoc.id);

      if (updateError) throw updateError;

      // Log in history
      await supabase
        .from("kyc_verification_history")
        .insert({
          user_id: selectedDoc.user_id,
          document_id: selectedDoc.id,
          previous_status: selectedDoc.status,
          new_status: "rejected",
          changed_by: user?.id,
          verification_type: "platform",
          reason: rejectionReason
        });

      toast.success("Document rejeté");
      setSelectedDoc(null);
      setSignedUrl(null);
      setRejectionReason("");
      setShowRejectForm(false);
      fetchDocuments();
    } catch (error) {
      console.error("Reject error:", error);
      toast.error("Erreur lors du rejet");
    } finally {
      setProcessing(false);
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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
      uploaded: { label: "En attente", color: "text-amber-400 bg-amber-500/10", icon: Clock },
      pre_verified: { label: "Pré-vérifié", color: "text-blue-400 bg-blue-500/10", icon: Shield },
      verified: { label: "Vérifié", color: "text-green-400 bg-green-500/10", icon: CheckCircle },
      rejected: { label: "Rejeté", color: "text-red-400 bg-red-500/10", icon: XCircle },
    };
    return configs[status] || configs.uploaded;
  };

  const getAge = (uploadedAt: string) => {
    const hours = differenceInHours(new Date(), new Date(uploadedAt));
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  };

  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      doc.profile?.full_name?.toLowerCase().includes(search) ||
      doc.profile?.email?.toLowerCase().includes(search) ||
      doc.file_name.toLowerCase().includes(search)
    );
  });

  const pendingCount = documents.filter(d => d.status === "uploaded").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Vérification KYC
          </h1>
          <p className="text-muted-foreground">
            {pendingCount} document{pendingCount !== 1 ? "s" : ""} en attente de vérification
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl glass border border-glass-border focus:border-primary/50 focus:outline-none w-full md:w-64"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "uploaded", label: "En attente", count: documents.filter(d => d.status === "uploaded").length },
          { id: "pre_verified", label: "Pré-vérifiés", count: documents.filter(d => d.status === "pre_verified").length },
          { id: "rejected", label: "Rejetés", count: documents.filter(d => d.status === "rejected").length },
          { id: "all", label: "Tous", count: documents.length }].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={cn(
              "px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px] flex items-center gap-2",
              filter === f.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "glass border border-glass-border hover:border-primary/30"
            )}
          >
            {f.label}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              filter === f.id ? "bg-white/20" : "bg-muted"
            )}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="glass-card p-12 border border-glass-border text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun document</h3>
          <p className="text-muted-foreground">
            {filter === "uploaded" 
              ? "Aucun document en attente de vérification"
              : "Aucun document trouvé avec ce filtre"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => {
            const statusConfig = getStatusConfig(doc.status);
            const StatusIcon = statusConfig.icon;
            const age = getAge(doc.uploaded_at);
            const isOld = differenceInHours(new Date(), new Date(doc.uploaded_at)) > 48;

            return (
              <div
                key={doc.id}
                className={cn(
                  "glass-card p-4 border transition-all",
                  isOld && doc.status === "uploaded"
                    ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                    : "border-glass-border"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold truncate">
                        {doc.profile?.full_name || "Utilisateur inconnu"}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {doc.profile?.email}
                      </p>
                    </div>
                  </div>

                  {/* Document Info */}
                  <div className="flex-1">
                    <p className="font-medium">{getDocumentTypeLabel(doc.document_type)}</p>
                    <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                  </div>

                  {/* Age Badge */}
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    isOld ? "bg-amber-500/10 text-amber-400" : "bg-muted text-muted-foreground"
                  )}>
                    {isOld && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                    {age}
                  </div>

                  {/* Status */}
                  <span className={cn(
                    "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium",
                    statusConfig.color
                  )}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </span>

                  {/* Actions */}
                  <button
                    onClick={() => viewDocument(doc)}
                    className="px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-2 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    Examiner
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document View Modal */}
      <Dialog open={!!selectedDoc} onOpenChange={() => { setSelectedDoc(null); setSignedUrl(null); setShowRejectForm(false); }}>
        <DialogContent className="glass-card border-glass-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {selectedDoc && getDocumentTypeLabel(selectedDoc.document_type)}
              </span>
              <button
                onClick={() => { setSelectedDoc(null); setSignedUrl(null); }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-6">
              {/* User Details */}
              <div className="glass-card p-4 border border-glass-border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Utilisateur</p>
                    <p className="font-medium">{selectedDoc.profile?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedDoc.profile?.email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type de profil</p>
                    <p className="font-medium capitalize">{selectedDoc.profile?.profile_type || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Téléchargé le</p>
                    <p className="font-medium">
                      {format(new Date(selectedDoc.uploaded_at), "d MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Preview */}
              <div className="relative rounded-xl overflow-hidden bg-muted aspect-[4/3]">
                {signedUrl ? (
                  <img
                    src={signedUrl}
                    alt={selectedDoc.file_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Actions */}
              {!showRejectForm ? (
                <div className="flex gap-3">
                  <button
                    onClick={handlePreVerify}
                    disabled={processing || selectedDoc.status !== "uploaded"}
                    className="flex-1 py-3 rounded-xl btn-primary-glow text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Shield className="w-5 h-5" />
                    Pré-vérifier
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={processing || selectedDoc.status === "rejected"}
                    className="px-6 py-3 rounded-xl glass border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                    Rejeter
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Raison du rejet</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Expliquez pourquoi ce document est rejeté..."
                      rows={3}
                      className="w-full p-3 rounded-xl glass border border-glass-border focus:border-primary/50 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleReject}
                      disabled={processing || !rejectionReason.trim()}
                      className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" />
                      Confirmer le rejet
                    </button>
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectionReason(""); }}
                      className="px-6 py-3 rounded-xl glass border border-glass-border hover:bg-muted/50 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KYCVerificationPanel;
