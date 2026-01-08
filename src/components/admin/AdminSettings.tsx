import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Settings, Percent, MapPin, Shield, FileText,
  Save, RefreshCw, Clock, CreditCard,
  CheckCircle, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
  category: string;
  updated_at: string;
}

interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: any;
  created_at: string;
}

const AdminSettings = () => {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, logsRes] = await Promise.all([
        supabase.from("platform_settings").select("*").order("category"),
        supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(50)]);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        const edited: Record<string, any> = {};
        settingsRes.data.forEach(s => {
          edited[s.setting_key] = s.setting_value;
        });
        setEditedSettings(edited);
      }
      if (logsRes.data) setAuditLogs(logsRes.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetting = async (key: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({ 
          setting_value: editedSettings[key],
          updated_at: new Date().toISOString()
        })
        .eq("setting_key", key);

      if (error) throw error;
      toast.success("Paramètre enregistré");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const updateSettingValue = (key: string, path: string, value: any) => {
    setEditedSettings(prev => {
      const newSettings = { ...prev };
      if (path) {
        newSettings[key] = { ...newSettings[key], [path]: value };
      } else {
        newSettings[key] = value;
      }
      return newSettings;
    });
  };

  const getSettingsByCategory = (category: string) => {
    return settings.filter(s => s.category === category);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Configuration Plateforme
        </h1>
        <p className="text-muted-foreground">Paramètres globaux de GoMonto</p>
      </div>

      <Tabs defaultValue="finance">
        <TabsList>
          <TabsTrigger value="finance" className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Finance
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Général
          </TabsTrigger>
          <TabsTrigger value="kyc" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            KYC
          </TabsTrigger>
          <TabsTrigger value="booking" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Réservation
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Paiements
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Finance Settings */}
        <TabsContent value="finance" className="space-y-4">
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle>Commissions</CardTitle>
              <CardDescription>Taux de commission par type de compte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editedSettings.platform_commission_rate && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Standard (%)</label>
                      <Input
                        type="number"
                        value={editedSettings.platform_commission_rate?.default || 10}
                        onChange={(e) => updateSettingValue("platform_commission_rate", "default", parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Premium (%)</label>
                      <Input
                        type="number"
                        value={editedSettings.platform_commission_rate?.premium || 8}
                        onChange={(e) => updateSettingValue("platform_commission_rate", "premium", parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Enterprise (%)</label>
                      <Input
                        type="number"
                        value={editedSettings.platform_commission_rate?.enterprise || 5}
                        onChange={(e) => updateSettingValue("platform_commission_rate", "enterprise", parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <Button onClick={() => handleSaveSetting("platform_commission_rate")} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle>Frais de mise en relation</CardTitle>
              <CardDescription>Frais fixes par réservation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editedSettings.connection_fee && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Montant</label>
                      <Input
                        type="number"
                        value={editedSettings.connection_fee?.amount || 500}
                        onChange={(e) => updateSettingValue("connection_fee", "amount", parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Devise</label>
                      <Input
                        value={editedSettings.connection_fee?.currency || "XOF"}
                        disabled
                      />
                    </div>
                  </div>
                  <Button onClick={() => handleSaveSetting("connection_fee")} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle>Pays Actifs</CardTitle>
              <CardDescription>Pays où la plateforme est disponible</CardDescription>
            </CardHeader>
            <CardContent>
              {editedSettings.active_countries && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {(editedSettings.active_countries as string[]).map((country) => (
                      <Badge key={country} variant="secondary" className="capitalize">
                        {country.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pour modifier les pays actifs, contactez l'équipe technique.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* KYC Settings */}
        <TabsContent value="kyc" className="space-y-4">
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle>Documents Requis</CardTitle>
              <CardDescription>Configuration des exigences KYC</CardDescription>
            </CardHeader>
            <CardContent>
              {editedSettings.kyc_requirements && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">Pièce d'identité</p>
                      <p className="text-sm text-muted-foreground">CNI, Passeport ou Carte consulaire</p>
                    </div>
                    <Switch
                      checked={editedSettings.kyc_requirements?.identity_required}
                      onCheckedChange={(v) => updateSettingValue("kyc_requirements", "identity_required", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">Permis de conduire</p>
                      <p className="text-sm text-muted-foreground">Obligatoire pour louer</p>
                    </div>
                    <Switch
                      checked={editedSettings.kyc_requirements?.license_required}
                      onCheckedChange={(v) => updateSettingValue("kyc_requirements", "license_required", v)}
                    />
                  </div>
                  <Button onClick={() => handleSaveSetting("kyc_requirements")} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Settings */}
        <TabsContent value="booking" className="space-y-4">
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle>Durée de Location</CardTitle>
              <CardDescription>Limites de durée pour les réservations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Durée minimum (jours)</label>
                  <Input
                    type="number"
                    min="1"
                    value={editedSettings.min_rental_days?.default || 1}
                    onChange={(e) => updateSettingValue("min_rental_days", "default", parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Durée maximum (jours)</label>
                  <Input
                    type="number"
                    value={editedSettings.max_rental_days?.default || 90}
                    onChange={(e) => updateSettingValue("max_rental_days", "default", parseInt(e.target.value))}
                  />
                </div>
              </div>
              <Button 
                onClick={async () => {
                  await handleSaveSetting("min_rental_days");
                  await handleSaveSetting("max_rental_days");
                }} 
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Configuration */}
        <TabsContent value="payments" className="space-y-4">
          {/* Production Status */}
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">Mode PRODUCTION</AlertTitle>
            <AlertDescription className="text-green-600">
              Les clés CinetPay de production sont configurées via les secrets Cloud. Les vraies transactions sont actives.
            </AlertDescription>
          </Alert>

          {/* CinetPay Configuration Info */}
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Configuration CinetPay
              </CardTitle>
              <CardDescription>
                Les credentials de paiement sont gérés via les secrets Cloud
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>CINETPAY_SITE_ID configuré</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>CINETPAY_API_KEY configuré</span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                Les clés sont gérées dans les secrets Cloud et utilisées directement par les fonctions de paiement.
                CinetPay n'utilise pas de webhook à configurer - le notify_url est passé avec chaque requête de paiement.
              </p>
            </CardContent>
          </Card>

          {/* CinetPay Dashboard Link */}
          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <a 
                href="https://app.cinetpay.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir le Dashboard CinetPay
              </a>
            </Button>
          </div>
        </TabsContent>

        {/* Audit Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="glass-card border-glass-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Logs d'Audit</CardTitle>
                <CardDescription>Historique des actions administratives</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucun log d'audit
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action_type}</Badge>
                        </TableCell>
                        <TableCell>{log.target_type}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
