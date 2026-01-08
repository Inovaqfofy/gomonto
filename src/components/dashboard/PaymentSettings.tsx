import { useEffect, useState } from "react";
import { CreditCard, Save, Loader2, Shield, Percent, DollarSign, Phone, User, Link, FileText, Building, Info } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PaymentSettingsProps {
  userId: string;
}

interface PaymentSettingsData {
  mtn_momo_enabled: boolean;
  mtn_momo_phone: string;
  mtn_momo_name: string;
  moov_money_enabled: boolean;
  moov_money_phone: string;
  moov_money_name: string;
  orange_money_enabled: boolean;
  orange_money_phone: string;
  orange_money_name: string;
  wave_enabled: boolean;
  wave_phone: string;
  wave_name: string;
  wave_link: string;
  deposit_type: "percentage" | "fixed";
  deposit_value: number;
  payment_instructions: string;
  deposit_management_mode: "direct" | "gomonto";
}

const initialSettings: PaymentSettingsData = {
  mtn_momo_enabled: false,
  mtn_momo_phone: "",
  mtn_momo_name: "",
  moov_money_enabled: false,
  moov_money_phone: "",
  moov_money_name: "",
  orange_money_enabled: false,
  orange_money_phone: "",
  orange_money_name: "",
  wave_enabled: false,
  wave_phone: "",
  wave_name: "",
  wave_link: "",
  deposit_type: "percentage",
  deposit_value: 20,
  payment_instructions: "",
  deposit_management_mode: "gomonto",
};

const paymentMethods = [
  {
    id: "wave",
    name: "Wave",
    color: "from-cyan-400 to-cyan-600",
    logo: "🌊",
    hasLink: true,
    countries: ["Sénégal", "Côte d'Ivoire", "Mali", "Burkina Faso"],
  },
  {
    id: "orange_money",
    name: "Orange Money",
    color: "from-orange-400 to-orange-600",
    logo: "🟠",
    hasLink: false,
    countries: ["Sénégal", "Côte d'Ivoire", "Mali", "Burkina Faso", "Niger", "Guinée-Bissau"],
  },
  {
    id: "mtn_momo",
    name: "MTN MoMo",
    color: "from-yellow-400 to-yellow-600",
    logo: "🟡",
    hasLink: false,
    countries: ["Côte d'Ivoire", "Bénin", "Guinée-Bissau"],
  },
  {
    id: "moov_money",
    name: "Moov Money",
    color: "from-blue-400 to-blue-600",
    logo: "🔵",
    hasLink: false,
    countries: ["Bénin", "Togo", "Niger", "Côte d'Ivoire"],
  }];

const PaymentSettings = ({ userId }: PaymentSettingsProps) => {
  const [settings, setSettings] = useState<PaymentSettingsData>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("owner_payment_settings")
        .select("*")
        .eq("owner_id", userId)
        .single();

      if (data) {
        setSettings({
          mtn_momo_enabled: data.mtn_momo_enabled || false,
          mtn_momo_phone: data.mtn_momo_phone || "",
          mtn_momo_name: data.mtn_momo_name || "",
          moov_money_enabled: data.moov_money_enabled || false,
          moov_money_phone: data.moov_money_phone || "",
          moov_money_name: data.moov_money_name || "",
          orange_money_enabled: data.orange_money_enabled || false,
          orange_money_phone: data.orange_money_phone || "",
          orange_money_name: data.orange_money_name || "",
          wave_enabled: data.wave_enabled || false,
          wave_phone: data.wave_phone || "",
          wave_name: data.wave_name || "",
          wave_link: data.wave_link || "",
          deposit_type: data.deposit_type || "percentage",
          deposit_value: data.deposit_value || 20,
          payment_instructions: data.payment_instructions || "",
          deposit_management_mode: (data.deposit_management_mode as "direct" | "gomonto") || "gomonto",
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
          mtn_momo_enabled: settings.mtn_momo_enabled,
          mtn_momo_phone: settings.mtn_momo_phone,
          mtn_momo_name: settings.mtn_momo_name,
          moov_money_enabled: settings.moov_money_enabled,
          moov_money_phone: settings.moov_money_phone,
          moov_money_name: settings.moov_money_name,
          orange_money_enabled: settings.orange_money_enabled,
          orange_money_phone: settings.orange_money_phone,
          orange_money_name: settings.orange_money_name,
          wave_enabled: settings.wave_enabled,
          wave_phone: settings.wave_phone,
          wave_name: settings.wave_name,
          wave_link: settings.wave_link,
          deposit_type: settings.deposit_type,
          deposit_value: settings.deposit_value,
          payment_instructions: settings.payment_instructions,
          deposit_management_mode: settings.deposit_management_mode,
        }, { onConflict: "owner_id" });

      if (error) throw error;

      toast({
        title: "Paramètres sauvegardés",
        description: "Vos moyens de paiement ont été mis à jour.",
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

  const updateMethodField = (methodId: string, field: string, value: string) => {
    const key = `${methodId}_${field}` as keyof PaymentSettingsData;
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const enabledMethodsCount = paymentMethods.filter(
    (m) => settings[`${m.id}_enabled` as keyof PaymentSettingsData]
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Paramètres de Paiement</h1>
        <p className="text-muted-foreground">
          Configurez vos numéros Mobile Money pour recevoir les paiements directement
        </p>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Paiement Direct</h4>
            <p className="text-sm text-muted-foreground">
              Les locataires paieront directement sur vos numéros Mobile Money. 
              Vous confirmerez ensuite la réception pour valider la réservation. 
              GoMonto ne prélève aucun frais sur vos locations.
            </p>
          </div>
        </div>
      </div>

      {/* Deposit Management Mode */}
      <div className="glass-card p-6 border border-glass-border relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Gestion des Cautions</h3>
              <p className="text-sm text-muted-foreground">
                Choisissez comment gérer les cautions de vos locataires
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setSettings((prev) => ({ ...prev, deposit_management_mode: "direct" }))}
              className={`p-4 rounded-xl text-left transition-all ${
                settings.deposit_management_mode === "direct"
                  ? "bg-primary/10 border-2 border-primary"
                  : "glass border border-glass-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Direct</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Je gère moi-même les cautions avec mes locataires via Mobile Money.
              </p>
              <div className="mt-3 space-y-1">
                <p className="text-xs flex items-center gap-1 text-muted-foreground">
                  <span>•</span> Vous recevez la caution directement
                </p>
                <p className="text-xs flex items-center gap-1 text-muted-foreground">
                  <span>•</span> Vous décidez du remboursement
                </p>
                <p className="text-xs flex items-center gap-1 text-muted-foreground">
                  <span>•</span> Aucun frais GoMonto
                </p>
              </div>
            </button>

            <button
              onClick={() => setSettings((prev) => ({ ...prev, deposit_management_mode: "gomonto" }))}
              className={`p-4 rounded-xl text-left transition-all relative ${
                settings.deposit_management_mode === "gomonto"
                  ? "bg-emerald-500/10 border-2 border-emerald-500"
                  : "glass border border-glass-border hover:border-emerald-500/30"
              }`}
            >
              <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                RECOMMANDÉ
              </div>
              <div className="flex items-center gap-3 mb-2">
                <Building className="w-5 h-5 text-emerald-500" />
                <span className="font-semibold text-emerald-600">GoMonto Smart Deposit</span>
              </div>
              <p className="text-xs text-muted-foreground">
                GoMonto collecte et sécurise les cautions pour vous.
              </p>
              <div className="mt-3 space-y-1">
                <p className="text-xs flex items-center gap-1 text-emerald-600">
                  <span>✓</span> Paiement sécurisé via CinetPay
                </p>
                <p className="text-xs flex items-center gap-1 text-emerald-600">
                  <span>✓</span> Libération ou capture en 1 clic
                </p>
                <p className="text-xs flex items-center gap-1 text-emerald-600">
                  <span>✓</span> Les locataires préfèrent cette option
                </p>
                <p className="text-xs flex items-center gap-1 text-amber-600">
                  <span>•</span> Frais de service : 5% de la caution
                </p>
              </div>
            </button>
          </div>

          {settings.deposit_management_mode === "gomonto" && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>
                    Avec <strong>GoMonto Smart Deposit</strong>, les locataires paient leur caution directement sur notre plateforme. 
                    Vous pouvez libérer la caution en 1 clic à la fin de la location, ou la capturer (en totalité ou partiellement) en cas de dommages.
                  </p>
                  <p>
                    <strong>Frais de 5%</strong> : Ces frais couvrent le paiement sécurisé via CinetPay et le remboursement automatique au locataire.
                    Ils sont payés par le locataire lors du dépôt et ne sont pas remboursables.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deposit Settings */}
      <div className="glass-card p-6 border border-glass-border relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Montant de la Caution</h3>
              <p className="text-sm text-muted-foreground">
                Définissez le montant de caution demandé aux locataires
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Type de caution</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, deposit_type: "percentage" }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                    settings.deposit_type === "percentage"
                      ? "bg-primary text-primary-foreground"
                      : "glass border border-glass-border hover:border-primary/30"
                  }`}
                >
                  <Percent className="w-5 h-5" />
                  Pourcentage
                </button>
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, deposit_type: "fixed" }))}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                    settings.deposit_type === "fixed"
                      ? "bg-primary text-primary-foreground"
                      : "glass border border-glass-border hover:border-primary/30"
                  }`}
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
                onChange={(e) => setSettings((prev) => ({ ...prev, deposit_value: parseInt(e.target.value) || 0 }))}
                min={settings.deposit_type === "percentage" ? 5 : 1000}
                max={settings.deposit_type === "percentage" ? 100 : 1000000}
                className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-secondary/5 border border-secondary/20">
            <p className="text-sm text-muted-foreground">
              💡 Exemple : Pour une location de 100 000 FCFA, la caution sera de{" "}
              <span className="text-secondary font-semibold">
                {settings.deposit_type === "percentage"
                  ? `${(100000 * settings.deposit_value) / 100} FCFA (${settings.deposit_value}%)`
                  : `${settings.deposit_value.toLocaleString()} FCFA`}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="glass-card p-6 border border-glass-border relative overflow-hidden">
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Vos Numéros Mobile Money</h3>
                <p className="text-sm text-muted-foreground">
                  Entrez les numéros sur lesquels vous recevrez les paiements
                </p>
              </div>
            </div>
            {enabledMethodsCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                {enabledMethodsCount} actif{enabledMethodsCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="space-y-4">
            {paymentMethods.map((method) => {
              const isEnabled = settings[`${method.id}_enabled` as keyof PaymentSettingsData] as boolean;
              
              return (
                <div
                  key={method.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isEnabled
                      ? "border-primary/30 bg-primary/5"
                      : "border-glass-border glass"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${method.color} flex items-center justify-center text-xl`}>
                        {method.logo}
                      </div>
                      <div>
                        <span className="font-semibold">{method.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {method.countries.slice(0, 3).join(", ")}
                          {method.countries.length > 3 && "..."}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleMethod(method.id)}
                      className={`w-14 h-8 rounded-full transition-all relative ${
                        isEnabled ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
                          isEnabled ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  {isEnabled && (
                    <div className="space-y-4 pt-4 border-t border-glass-border animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Phone className="w-4 h-4" />
                            Numéro de téléphone
                          </label>
                          <input
                            type="tel"
                            value={settings[`${method.id}_phone` as keyof PaymentSettingsData] as string}
                            onChange={(e) => updateMethodField(method.id, "phone", e.target.value)}
                            placeholder="+221 77 123 45 67"
                            className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <User className="w-4 h-4" />
                            Nom du compte
                          </label>
                          <input
                            type="text"
                            value={settings[`${method.id}_name` as keyof PaymentSettingsData] as string}
                            onChange={(e) => updateMethodField(method.id, "name", e.target.value)}
                            placeholder="Ex: Mamadou DIALLO"
                            className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      {method.hasLink && (
                        <div>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Link className="w-4 h-4" />
                            Lien Wave Pay (optionnel)
                          </label>
                          <input
                            type="url"
                            value={settings.wave_link}
                            onChange={(e) => setSettings((prev) => ({ ...prev, wave_link: e.target.value }))}
                            placeholder="https://pay.wave.com/m/..."
                            className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Si vous avez un compte Wave Business, collez votre lien de paiement ici
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="glass-card p-6 border border-glass-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Instructions de Paiement</h3>
            <p className="text-sm text-muted-foreground">
              Message affiché aux locataires lors du paiement
            </p>
          </div>
        </div>
        
        <textarea
          value={settings.payment_instructions}
          onChange={(e) => setSettings((prev) => ({ ...prev, payment_instructions: e.target.value }))}
          rows={3}
          placeholder="Ex: Veuillez effectuer le virement et conserver le reçu. Je confirmerai sous 30 minutes."
          className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none resize-none"
        />
      </div>

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

export default PaymentSettings;