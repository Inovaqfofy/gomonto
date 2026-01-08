import { useEffect, useState } from "react";
import { 
  CreditCard, Save, Loader2, Shield, Percent, DollarSign, 
  Building2, Key, AlertCircle, CheckCircle, ExternalLink, Zap
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface AdvancedPaymentSettingsProps {
  userId: string;
}

interface PaymentSettingsData {
  // Mobile Money
  mtn_momo_enabled: boolean;
  mtn_momo_merchant_id: string;
  mtn_momo_api_key: string;
  moov_money_enabled: boolean;
  moov_money_merchant_id: string;
  moov_money_api_key: string;
  orange_money_enabled: boolean;
  orange_money_merchant_id: string;
  orange_money_api_key: string;
  wave_enabled: boolean;
  wave_merchant_id: string;
  wave_api_key: string;
  // Payment Gateways
  fedapay_enabled: boolean;
  fedapay_public_key: string;
  fedapay_secret_key: string;
  kkiapay_enabled: boolean;
  kkiapay_public_key: string;
  kkiapay_private_key: string;
  kkiapay_secret: string;
  // Settings
  preferred_gateway: string;
  deposit_type: "percentage" | "fixed";
  deposit_value: number;
  business_name: string;
  business_logo_url: string;
}

const initialSettings: PaymentSettingsData = {
  mtn_momo_enabled: false,
  mtn_momo_merchant_id: "",
  mtn_momo_api_key: "",
  moov_money_enabled: false,
  moov_money_merchant_id: "",
  moov_money_api_key: "",
  orange_money_enabled: false,
  orange_money_merchant_id: "",
  orange_money_api_key: "",
  wave_enabled: false,
  wave_merchant_id: "",
  wave_api_key: "",
  fedapay_enabled: false,
  fedapay_public_key: "",
  fedapay_secret_key: "",
  kkiapay_enabled: false,
  kkiapay_public_key: "",
  kkiapay_private_key: "",
  kkiapay_secret: "",
  preferred_gateway: "mobile_money",
  deposit_type: "percentage",
  deposit_value: 20,
  business_name: "",
  business_logo_url: "",
};

const mobileMoneyMethods = [
  { id: "mtn_momo", name: "MTN MoMo", color: "from-yellow-400 to-yellow-600", logo: "🟡" },
  { id: "moov_money", name: "Moov Money", color: "from-blue-400 to-blue-600", logo: "🔵" },
  { id: "orange_money", name: "Orange Money", color: "from-orange-400 to-orange-600", logo: "🟠" },
  { id: "wave", name: "Wave", color: "from-cyan-400 to-cyan-600", logo: "🌊" }];

const paymentGateways = [
  { 
    id: "fedapay", 
    name: "FedaPay", 
    description: "Passerelle de paiement panafricaine",
    color: "from-green-500 to-emerald-600",
    countries: ["Bénin", "Côte d'Ivoire", "Togo", "Sénégal"],
    url: "https://fedapay.com"
  },
  { 
    id: "kkiapay", 
    name: "KkiaPay", 
    description: "Paiement mobile et cartes bancaires",
    color: "from-indigo-500 to-purple-600",
    countries: ["Bénin", "Côte d'Ivoire", "Togo", "Sénégal", "Mali", "Burkina Faso"],
    url: "https://kkiapay.me"
  }];

const AdvancedPaymentSettings = ({ userId }: AdvancedPaymentSettingsProps) => {
  const [settings, setSettings] = useState<PaymentSettingsData>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"deposit" | "mobile" | "gateways" | "business">("deposit");

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("owner_payment_settings")
        .select("*")
        .eq("owner_id", userId)
        .single();

      if (data) {
        // Cast to any to handle new columns not yet in generated types
        const d = data as Record<string, unknown>;
        setSettings({
          mtn_momo_enabled: (d.mtn_momo_enabled as boolean) || false,
          mtn_momo_merchant_id: (d.mtn_momo_merchant_id as string) || "",
          mtn_momo_api_key: (d.mtn_momo_api_key as string) || "",
          moov_money_enabled: (d.moov_money_enabled as boolean) || false,
          moov_money_merchant_id: (d.moov_money_merchant_id as string) || "",
          moov_money_api_key: (d.moov_money_api_key as string) || "",
          orange_money_enabled: (d.orange_money_enabled as boolean) || false,
          orange_money_merchant_id: (d.orange_money_merchant_id as string) || "",
          orange_money_api_key: (d.orange_money_api_key as string) || "",
          wave_enabled: (d.wave_enabled as boolean) || false,
          wave_merchant_id: (d.wave_merchant_id as string) || "",
          wave_api_key: (d.wave_api_key as string) || "",
          fedapay_enabled: (d.fedapay_enabled as boolean) || false,
          fedapay_public_key: (d.fedapay_public_key as string) || "",
          fedapay_secret_key: (d.fedapay_secret_key as string) || "",
          kkiapay_enabled: (d.kkiapay_enabled as boolean) || false,
          kkiapay_public_key: (d.kkiapay_public_key as string) || "",
          kkiapay_private_key: (d.kkiapay_private_key as string) || "",
          kkiapay_secret: (d.kkiapay_secret as string) || "",
          preferred_gateway: (d.preferred_gateway as string) || "mobile_money",
          deposit_type: (d.deposit_type as "percentage" | "fixed") || "percentage",
          deposit_value: (d.deposit_value as number) || 20,
          business_name: (d.business_name as string) || "",
          business_logo_url: (d.business_logo_url as string) || "",
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from("owner_payment_settings")
        .upsert({
          owner_id: userId,
          ...settings,
        }, { onConflict: "owner_id" });

      if (error) throw error;

      toast({
        title: "Paramètres sauvegardés",
        description: "Vos paramètres de paiement ont été mis à jour.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleMethod = (methodId: string) => {
    const key = `${methodId}_enabled` as keyof PaymentSettingsData;
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateField = (key: keyof PaymentSettingsData, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
          <CreditCard className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mes Récepteurs de Paiement</h1>
          <p className="text-muted-foreground text-sm">
            Configurez comment recevoir les paiements directement sur vos comptes
          </p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="glass-card p-4 border border-green-500/20 bg-green-500/5 flex items-start gap-4">
        <Shield className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-sm text-green-400">Paiement Direct & Souverain</p>
          <p className="text-xs text-muted-foreground mt-1">
            L'argent transite directement du client vers votre compte. GoMonto fournit uniquement le widget technique de paiement. 
            Aucun fonds ne passe par le compte d'Inopay Group.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "deposit", label: "Acompte", icon: Percent },
          { id: "mobile", label: "Mobile Money", icon: CreditCard },
          { id: "gateways", label: "Passerelles", icon: Zap },
          { id: "business", label: "Mon Business", icon: Building2 }].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "glass border border-glass-border hover:border-primary/30"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deposit Settings Tab */}
      {activeTab === "deposit" && (
        <div className="glass-card p-6 border border-glass-border space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Acompte de Réservation</h3>
              <p className="text-sm text-muted-foreground">Montant requis pour garantir une réservation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Type d'acompte</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateField("deposit_type", "percentage")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all",
                    settings.deposit_type === "percentage"
                      ? "bg-primary text-primary-foreground"
                      : "glass border border-glass-border hover:border-primary/30"
                  )}
                >
                  <Percent className="w-5 h-5" />
                  Pourcentage
                </button>
                <button
                  onClick={() => updateField("deposit_type", "fixed")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all",
                    settings.deposit_type === "fixed"
                      ? "bg-primary text-primary-foreground"
                      : "glass border border-glass-border hover:border-primary/30"
                  )}
                >
                  <DollarSign className="w-5 h-5" />
                  Montant fixe
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Valeur {settings.deposit_type === "percentage" ? "(en %)" : "(en FCFA)"}
              </label>
              <input
                type="number"
                value={settings.deposit_value}
                onChange={(e) => updateField("deposit_value", parseInt(e.target.value) || 0)}
                min={settings.deposit_type === "percentage" ? 5 : 1000}
                max={settings.deposit_type === "percentage" ? 100 : 1000000}
                className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20">
            <p className="text-sm text-muted-foreground">
              💡 Exemple : Pour une location de 100 000 FCFA, l'acompte sera de{" "}
              <span className="text-secondary font-semibold">
                {settings.deposit_type === "percentage"
                  ? `${(100000 * settings.deposit_value) / 100} FCFA (${settings.deposit_value}%)`
                  : `${settings.deposit_value.toLocaleString()} FCFA`}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Mobile Money Tab */}
      {activeTab === "mobile" && (
        <div className="glass-card p-6 border border-glass-border space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Connectez vos numéros marchands Mobile Money pour recevoir les paiements directement
          </p>

          {mobileMoneyMethods.map((method) => {
            const isEnabled = settings[`${method.id}_enabled` as keyof PaymentSettingsData] as boolean;

            return (
              <div
                key={method.id}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  isEnabled ? "border-primary/30 bg-primary/5" : "border-glass-border glass"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${method.color} flex items-center justify-center text-xl`}>
                      {method.logo}
                    </div>
                    <span className="font-semibold">{method.name}</span>
                  </div>
                  <button
                    onClick={() => toggleMethod(method.id)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative",
                      isEnabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-6 h-6 rounded-full bg-white transition-all",
                      isEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                {isEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-glass-border animate-fade-in">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Numéro Marchand / ID</label>
                      <input
                        type="text"
                        value={settings[`${method.id}_merchant_id` as keyof PaymentSettingsData] as string}
                        onChange={(e) => updateField(`${method.id}_merchant_id` as keyof PaymentSettingsData, e.target.value)}
                        placeholder="Ex: 12345678"
                        className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-2">Clé API / Secret</label>
                      <input
                        type="password"
                        value={settings[`${method.id}_api_key` as keyof PaymentSettingsData] as string}
                        onChange={(e) => updateField(`${method.id}_api_key` as keyof PaymentSettingsData, e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Gateways Tab */}
      {activeTab === "gateways" && (
        <div className="space-y-4">
          {paymentGateways.map((gateway) => {
            const isEnabled = settings[`${gateway.id}_enabled` as keyof PaymentSettingsData] as boolean;

            return (
              <div
                key={gateway.id}
                className={cn(
                  "glass-card p-6 border transition-all",
                  isEnabled ? "border-primary/30 bg-primary/5" : "border-glass-border"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gateway.color} flex items-center justify-center shrink-0`}>
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{gateway.name}</h3>
                        <a
                          href={gateway.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground">{gateway.description}</p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {gateway.countries.map((country) => (
                          <span key={country} className="px-2 py-0.5 rounded-full bg-muted/50 text-xs">
                            {country}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleMethod(gateway.id)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative shrink-0",
                      isEnabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-6 h-6 rounded-full bg-white transition-all",
                      isEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                {isEnabled && (
                  <div className="space-y-4 pt-4 border-t border-glass-border animate-fade-in">
                    {gateway.id === "fedapay" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-muted-foreground mb-2">
                              <Key className="w-4 h-4 inline mr-1" />
                              Clé Publique
                            </label>
                            <input
                              type="text"
                              value={settings.fedapay_public_key}
                              onChange={(e) => updateField("fedapay_public_key", e.target.value)}
                              placeholder="pk_live_..."
                              className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none font-mono text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-muted-foreground mb-2">
                              <Key className="w-4 h-4 inline mr-1" />
                              Clé Secrète
                            </label>
                            <input
                              type="password"
                              value={settings.fedapay_secret_key}
                              onChange={(e) => updateField("fedapay_secret_key", e.target.value)}
                              placeholder="sk_live_..."
                              className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {gateway.id === "kkiapay" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm text-muted-foreground mb-2">Clé Publique</label>
                            <input
                              type="text"
                              value={settings.kkiapay_public_key}
                              onChange={(e) => updateField("kkiapay_public_key", e.target.value)}
                              placeholder="pk_..."
                              className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none font-mono text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-muted-foreground mb-2">Clé Privée</label>
                            <input
                              type="password"
                              value={settings.kkiapay_private_key}
                              onChange={(e) => updateField("kkiapay_private_key", e.target.value)}
                              placeholder="prk_..."
                              className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-muted-foreground mb-2">Secret</label>
                            <input
                              type="password"
                              value={settings.kkiapay_secret}
                              onChange={(e) => updateField("kkiapay_secret", e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Les paiements iront directement sur votre compte {gateway.name}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Preferred Gateway */}
          <div className="glass-card p-6 border border-glass-border">
            <h3 className="font-semibold mb-4">Passerelle préférée</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: "mobile_money", label: "Mobile Money Direct" },
                { id: "fedapay", label: "FedaPay" },
                { id: "kkiapay", label: "KkiaPay" }].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => updateField("preferred_gateway", opt.id)}
                  className={cn(
                    "px-4 py-3 rounded-xl transition-all text-sm font-medium",
                    settings.preferred_gateway === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "glass border border-glass-border hover:border-primary/30"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Business Tab */}
      {activeTab === "business" && (
        <div className="glass-card p-6 border border-glass-border space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-6 h-6 text-primary" />
            <h3 className="font-semibold text-lg">Informations Business</h3>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Nom de votre entreprise/activité</label>
            <input
              type="text"
              value={settings.business_name}
              onChange={(e) => updateField("business_name", e.target.value)}
              placeholder="Ex: Location Auto Dakar SARL"
              className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Ce nom apparaîtra sur les reçus de paiement envoyés aux clients
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-glass-border">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">À propos du reçu de paiement</p>
                <p>Le reçu indiquera : "Paiement sécurisé direct à <strong>{settings.business_name || "[Votre entreprise]"}</strong> via GoMonto. GoMonto est le prestataire technique. Inopay Group n'encaisse pas les frais de location."</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full btn-primary-glow py-4 rounded-xl font-semibold text-primary-foreground flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Save className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Sauvegarder les paramètres</span>
          </>
        )}
      </button>
    </div>
  );
};

export default AdvancedPaymentSettings;
