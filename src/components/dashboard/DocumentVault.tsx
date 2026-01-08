import { useState, useEffect, useCallback } from "react";
import { 
  FileText, Upload, Trash2, Download, Lock, Shield, Eye, 
  Calendar, AlertTriangle, FolderOpen, Plus, Search, Filter
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DocumentVaultProps {
  userId: string;
}

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  vehicle_id: string | null;
  expiry_date: string | null;
  created_at: string;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
}

const documentTypes = [
  { id: "insurance", label: "Assurance", icon: Shield, color: "text-green-400" },
  { id: "registration", label: "Carte grise", icon: FileText, color: "text-blue-400" },
  { id: "contract", label: "Contrat", icon: FileText, color: "text-purple-400" },
  { id: "invoice", label: "Facture", icon: FileText, color: "text-amber-400" },
  { id: "other", label: "Autre", icon: FolderOpen, color: "text-muted-foreground" }];

const DocumentVault = ({ userId }: DocumentVaultProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    document_type: "insurance",
    description: "",
    vehicle_id: "",
    expiry_date: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocuments = useCallback(async () => {
    // Use raw query for new table not in generated types
    const { data, error } = await supabase
      .from("owner_documents" as never)
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      return;
    }

    setDocuments((data as Document[]) || []);
    setLoading(false);
  }, [userId]);

  const fetchVehicles = useCallback(async () => {
    const { data } = await supabase
      .from("vehicles")
      .select("id, brand, model")
      .eq("owner_id", userId);

    setVehicles(data || []);
  }, [userId]);

  useEffect(() => {
    fetchDocuments();
    fetchVehicles();
  }, [fetchDocuments, fetchVehicles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("Le fichier est trop volumineux (max 50 Mo)");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setUploading(true);

    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("owner-vault")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Save document record
      const { error: insertError } = await supabase
        .from("owner_documents" as never)
        .insert({
          owner_id: userId,
          document_type: uploadForm.document_type,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          description: uploadForm.description || null,
          vehicle_id: uploadForm.vehicle_id || null,
          expiry_date: uploadForm.expiry_date || null,
        } as never);

      if (insertError) throw insertError;

      toast.success("Document ajouté au coffre-fort");
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadForm({
        document_type: "insurance",
        description: "",
        vehicle_id: "",
        expiry_date: "",
      });
      fetchDocuments();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload du document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("owner-vault")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

    try {
      await supabase.storage.from("owner-vault").remove([doc.file_path]);
      await supabase.from("owner_documents" as never).delete().eq("id", doc.id);
      toast.success("Document supprimé");
      fetchDocuments();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesType = filterType === "all" || doc.document_type === filterType;
    const matchesSearch = doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiry = new Date(date);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Coffre-Fort Documents</h1>
              <p className="text-sm text-muted-foreground">Stockage sécurisé et chiffré</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary-glow px-6 py-3 rounded-xl font-semibold text-primary-foreground flex items-center gap-2"
        >
          <Plus className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Ajouter un document</span>
        </button>
      </div>

      {/* Security Banner */}
      <div className="glass-card p-4 border border-primary/20 bg-primary/5 flex items-center gap-4">
        <Shield className="w-8 h-8 text-primary shrink-0" />
        <div>
          <p className="font-medium text-sm">Isolation totale des données</p>
          <p className="text-xs text-muted-foreground">
            Vos documents sont chiffrés et accessibles uniquement par vous. Aucun autre loueur ne peut y accéder.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un document..."
            className="w-full pl-11 pr-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
          >
            <option value="all">Tous les types</option>
            {documentTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="glass-card p-12 border border-glass-border text-center">
          <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun document</h3>
          <p className="text-muted-foreground mb-4">Votre coffre-fort est vide</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary-glow px-6 py-2 rounded-xl font-medium text-primary-foreground"
          >
            Ajouter mon premier document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const docType = documentTypes.find((t) => t.id === doc.document_type) || documentTypes[4];
            const IconComponent = docType.icon;
            const expired = isExpired(doc.expiry_date);
            const expiringSoon = isExpiringSoon(doc.expiry_date);

            return (
              <div
                key={doc.id}
                className={cn(
                  "glass-card p-5 border transition-all hover-lift",
                  expired
                    ? "border-red-500/30 bg-red-500/5"
                    : expiringSoon
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-glass-border"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-muted/50", docType.color)}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="w-8 h-8 rounded-lg glass border border-glass-border flex items-center justify-center hover:border-primary/30 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="w-8 h-8 rounded-lg glass border border-glass-border flex items-center justify-center hover:border-red-500/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-medium text-sm mb-1 truncate" title={doc.file_name}>
                  {doc.file_name}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">{docType.label}</p>

                {doc.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{doc.description}</p>
                )}

                {doc.expiry_date && (
                  <div className={cn(
                    "flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg",
                    expired
                      ? "bg-red-500/10 text-red-400"
                      : expiringSoon
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-muted/50 text-muted-foreground"
                  )}>
                    {expired || expiringSoon ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <Calendar className="w-3 h-3" />
                    )}
                    {expired ? "Expiré le " : expiringSoon ? "Expire le " : "Expire le "}
                    {format(new Date(doc.expiry_date), "d MMM yyyy", { locale: fr })}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-glass-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} Mo` : "N/A"}</span>
                  <span>{format(new Date(doc.created_at), "d MMM yyyy", { locale: fr })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 border border-glass-border relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-destructive/10"
            >
              ×
            </button>

            <h2 className="text-xl font-bold mb-6">Ajouter un document</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Type de document</label>
                <select
                  value={uploadForm.document_type}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                >
                  {documentTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Véhicule associé (optionnel)</label>
                <select
                  value={uploadForm.vehicle_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, vehicle_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                >
                  <option value="">Aucun véhicule</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.brand} {v.model}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Date d'expiration (optionnel)</label>
                <input
                  type="date"
                  value={uploadForm.expiry_date}
                  onChange={(e) => setUploadForm({ ...uploadForm, expiry_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Description (optionnel)</label>
                <input
                  type="text"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Ex: Attestation d'assurance 2024"
                  className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Fichier (PDF, JPG, PNG - max 50 Mo)</label>
                <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-glass-border hover:border-primary/50 cursor-pointer transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {selectedFile ? selectedFile.name : "Cliquez pour sélectionner"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="w-full btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-5 h-5 relative z-10" />
                    <span className="relative z-10">Sécuriser dans le coffre</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentVault;
