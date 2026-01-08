import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Shield, CheckCircle, Globe, User } from "lucide-react";
import DocumentUpload from "@/components/auth/DocumentUpload";
import logo from "@/assets/logo.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UEMOA_COUNTRIES = [
  "Sénégal", "Côte d'Ivoire", "Mali", "Burkina Faso", 
  "Bénin", "Togo", "Niger", "Guinée-Bissau"
];

const AFRICA_COUNTRIES = [
  "Algérie", "Maroc", "Tunisie", "Égypte", "Nigeria", 
  "Ghana", "Cameroun", "RDC", "Kenya", "Afrique du Sud", "Autre Afrique"
];

const INTERNATIONAL_REGIONS = ["Europe", "Amérique", "Asie", "Autre"];

type NationalityType = "uemoa" | "africa" | "international";

const KYC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [nationality, setNationality] = useState<string>("");
  const [nationalityType, setNationalityType] = useState<NationalityType | null>(null);
  
  // Documents based on nationality
  const [driversLicense, setDriversLicense] = useState<string | null>(null);
  const [idCard, setIdCard] = useState<string | null>(null);
  const [passport, setPassport] = useState<string | null>(null);
  const [internationalLicense, setInternationalLicense] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [proofOfAddress, setProofOfAddress] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
        
        // Load existing profile nationality
        const { data: profile } = await supabase
          .from("profiles")
          .select("nationality")
          .eq("user_id", session.user.id)
          .single();
        
        if (profile?.nationality) {
          setNationality(profile.nationality);
          determineNationalityType(profile.nationality);
        }
        
        // Load existing documents
        const { data: docs } = await supabase
          .from("kyc_documents")
          .select("*")
          .eq("user_id", session.user.id);

        if (docs) {
          docs.forEach((doc) => {
            switch (doc.document_type) {
              case "drivers_license": setDriversLicense(doc.file_name); break;
              case "id_card": setIdCard(doc.file_name); break;
              case "passport": setPassport(doc.file_name); break;
              case "international_license": setInternationalLicense(doc.file_name); break;
              case "selfie": setSelfie(doc.file_name); break;
              case "proof_of_address": setProofOfAddress(doc.file_name); break;
            }
          });
        }
      }
    };

    checkAuth();
  }, [navigate]);

  const determineNationalityType = (country: string) => {
    if (UEMOA_COUNTRIES.includes(country)) {
      setNationalityType("uemoa");
    } else if (AFRICA_COUNTRIES.includes(country)) {
      setNationalityType("africa");
    } else {
      setNationalityType("international");
    }
  };

  const handleNationalityChange = async (value: string) => {
    setNationality(value);
    determineNationalityType(value);
    
    // Save to profile
    if (userId) {
      await supabase
        .from("profiles")
        .update({ nationality: value })
        .eq("user_id", userId);
    }
  };

  const getRequiredDocuments = () => {
    switch (nationalityType) {
      case "uemoa":
        return { cni: true, permis: true, passport: false, intlLicense: false, selfie: false, address: false };
      case "africa":
        return { cni: false, permis: true, passport: true, intlLicense: false, selfie: true, address: false };
      case "international":
        return { cni: false, permis: false, passport: true, intlLicense: true, selfie: true, address: true };
      default:
        return { cni: false, permis: false, passport: false, intlLicense: false, selfie: false, address: false };
    }
  };

  const allDocumentsUploaded = () => {
    const req = getRequiredDocuments();
    if (req.cni && !idCard) return false;
    if (req.permis && !driversLicense) return false;
    if (req.passport && !passport) return false;
    if (req.intlLicense && !internationalLicense) return false;
    if (req.selfie && !selfie) return false;
    if (req.address && !proofOfAddress) return false;
    return nationalityType !== null;
  };

  if (!userId) return null;

  const requiredDocs = getRequiredDocuments();

  return (
    <div className="min-h-screen p-4 pb-24 md:pb-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-lg mx-auto relative">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={logo} alt="GoMonto" className="h-8" />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Vérification d'identité</h1>
          <p className="text-muted-foreground">
            Pour garantir la sécurité de notre communauté, veuillez télécharger vos documents d'identité.
          </p>
        </div>

        {/* Nationality Selection */}
        <div className="glass-card p-6 border border-glass-border mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Votre nationalité</h2>
          </div>
          
          <Select value={nationality} onValueChange={handleNationalityChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionnez votre pays" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Zone UEMOA</div>
              {UEMOA_COUNTRIES.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Afrique</div>
              {AFRICA_COUNTRIES.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">International</div>
              {INTERNATIONAL_REGIONS.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {nationalityType && (
            <p className="text-sm text-muted-foreground mt-3">
              {nationalityType === "uemoa" && "Documents requis : CNI + Permis de conduire"}
              {nationalityType === "africa" && "Documents requis : Passeport + Permis + Selfie"}
              {nationalityType === "international" && "Documents requis : Passeport + Permis international + Selfie + Justificatif de domicile"}
            </p>
          )}
        </div>

        {/* Documents Container */}
        {nationalityType && (
          <div className="glass-card p-6 border border-glass-border relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl" />

            <div className="relative space-y-4">
              {/* UEMOA: CNI + Permis */}
              {requiredDocs.cni && (
                <DocumentUpload
                  userId={userId}
                  documentType="id_card"
                  label="Carte Nationale d'Identité"
                  description="Recto et verso de votre CNI valide"
                  onUploadComplete={(path) => setIdCard(path)}
                  existingFile={idCard || undefined}
                />
              )}

              {requiredDocs.permis && (
                <DocumentUpload
                  userId={userId}
                  documentType="drivers_license"
                  label="Permis de conduire"
                  description="Recto et verso de votre permis valide"
                  onUploadComplete={(path) => setDriversLicense(path)}
                  existingFile={driversLicense || undefined}
                />
              )}

              {/* Africa & International: Passport */}
              {requiredDocs.passport && (
                <DocumentUpload
                  userId={userId}
                  documentType="passport"
                  label="Passeport"
                  description="Page d'identité de votre passeport valide"
                  onUploadComplete={(path) => setPassport(path)}
                  existingFile={passport || undefined}
                />
              )}

              {/* International: Permis international */}
              {requiredDocs.intlLicense && (
                <DocumentUpload
                  userId={userId}
                  documentType="international_license"
                  label="Permis de conduire international"
                  description="Votre permis de conduire international valide"
                  onUploadComplete={(path) => setInternationalLicense(path)}
                  existingFile={internationalLicense || undefined}
                />
              )}

              {/* Africa & International: Selfie */}
              {requiredDocs.selfie && (
                <DocumentUpload
                  userId={userId}
                  documentType="selfie"
                  label="Selfie avec pièce d'identité"
                  description="Photo de vous tenant votre document d'identité"
                  onUploadComplete={(path) => setSelfie(path)}
                  existingFile={selfie || undefined}
                />
              )}

              {/* International: Proof of address */}
              {requiredDocs.address && (
                <DocumentUpload
                  userId={userId}
                  documentType="proof_of_address"
                  label="Justificatif de domicile"
                  description="Facture ou relevé bancaire de moins de 3 mois"
                  onUploadComplete={(path) => setProofOfAddress(path)}
                  existingFile={proofOfAddress || undefined}
                />
              )}
            </div>

            {/* Status */}
            {allDocumentsUploaded() && (
              <div className="relative mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <div>
                  <p className="font-medium text-green-400">Documents envoyés</p>
                  <p className="text-sm text-muted-foreground">
                    Votre vérification est en cours de traitement par GoMonto.
                  </p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={() => navigate("/")}
              className="relative w-full btn-primary-glow py-3 rounded-xl font-semibold text-primary-foreground mt-6"
            >
              <span className="relative z-10">
                {allDocumentsUploaded() ? "Retour à l'accueil" : "Terminer plus tard"}
              </span>
            </button>
          </div>
        )}

        {/* Info */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Vos documents sont chiffrés et stockés de manière sécurisée. Nous ne les partageons jamais.
        </p>
      </div>
    </div>
  );
};

export default KYC;
