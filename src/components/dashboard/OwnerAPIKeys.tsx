import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, ExternalLink, Code, FileSpreadsheet, Calendar, Activity } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import FleetImport from "./FleetImport";
import CalendarSync from "./CalendarSync";

interface OwnerAPIKeysProps {
  ownerId: string;
}

interface APIKey {
  id: string;
  name: string;
  api_key: string;
  permissions: string[];
  rate_limit_per_hour: number;
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
  allowed_origins: string[] | null;
  created_at: string;
  expires_at: string | null;
}

interface APILog {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  created_at: string;
  error_message: string | null;
}

const OwnerAPIKeys = ({ ownerId }: OwnerAPIKeysProps) => {
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [apiLogs, setApiLogs] = useState<APILog[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("api");
  const [newKey, setNewKey] = useState({
    name: "",
    rate_limit_per_hour: 1000,
    allowed_origins: "",
  });

  useEffect(() => {
    fetchAPIKeys();
    fetchAPILogs();
  }, [ownerId]);

  const fetchAPIKeys = async () => {
    const { data } = await supabase
      .from("owner_api_keys")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (data) {
      setApiKeys(data);
    }

    setLoading(false);
  };

  const fetchAPILogs = async () => {
    const { data } = await supabase
      .from("api_logs")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setApiLogs(data);
    }
  };

  const generateAPIKey = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "gm_live_";
    for (let i = 0; i < 32; i++) {
      key += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return key;
  };

  const createAPIKey = async () => {
    if (!newKey.name) {
      toast.error("Veuillez donner un nom à votre clé API");
      return;
    }

    const apiKey = generateAPIKey();
    const origins = newKey.allowed_origins
      ? newKey.allowed_origins.split(",").map((o) => o.trim()).filter((o) => o)
      : null;

    const { error } = await supabase.from("owner_api_keys").insert({
      owner_id: ownerId,
      name: newKey.name,
      api_key: apiKey,
      rate_limit_per_hour: newKey.rate_limit_per_hour,
      allowed_origins: origins,
      permissions: ["read"],
    });

    if (error) {
      toast.error("Erreur lors de la création de la clé API");
    } else {
      toast.success("Clé API créée avec succès");
      setIsAddDialogOpen(false);
      setNewKey({ name: "", rate_limit_per_hour: 1000, allowed_origins: "" });
      fetchAPIKeys();
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Clé copiée dans le presse-papier");
  };

  const toggleKeyStatus = async (key: APIKey) => {
    const { error } = await supabase
      .from("owner_api_keys")
      .update({ is_active: !key.is_active })
      .eq("id", key.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      fetchAPIKeys();
    }
  };

  const deleteKey = async (keyId: string) => {
    const { error } = await supabase
      .from("owner_api_keys")
      .delete()
      .eq("id", keyId);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Clé API supprimée");
      fetchAPIKeys();
    }
  };

  const maskAPIKey = (key: string) => {
    return key.substring(0, 12) + "..." + key.substring(key.length - 4);
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "text-green-500";
    if (statusCode >= 400 && statusCode < 500) return "text-yellow-500";
    return "text-destructive";
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Key className="w-8 h-8 text-primary" />
          Intégrations & API
        </h1>
        <p className="text-muted-foreground">Gérez vos clés API, importez votre flotte et synchronisez vos calendriers</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            <span className="hidden sm:inline">Clés API</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Sync</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle clé API
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une clé API</DialogTitle>
                  <DialogDescription>
                    Cette clé vous permettra d'accéder à vos véhicules depuis votre propre site
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Nom de la clé *</label>
                    <Input
                      value={newKey.name}
                      onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                      placeholder="Ex: Site web principal"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Limite de requêtes par heure</label>
                    <Input
                      type="number"
                      value={newKey.rate_limit_per_hour}
                      onChange={(e) => setNewKey({ ...newKey, rate_limit_per_hour: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Origines autorisées (optionnel)</label>
                    <Input
                      value={newKey.allowed_origins}
                      onChange={(e) => setNewKey({ ...newKey, allowed_origins: e.target.value })}
                      placeholder="https://monsite.com, https://app.monsite.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Séparez les domaines par des virgules. Laissez vide pour autoriser tous les domaines.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={createAPIKey}>Créer la clé</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* API Keys List */}
          {apiKeys.length === 0 ? (
            <Card className="glass-card border-glass-border">
              <CardContent className="py-12 text-center">
                <Key className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Aucune clé API</h3>
                <p className="text-muted-foreground mb-4">
                  Créez une clé API pour intégrer vos véhicules sur votre site web
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer ma première clé
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <Card key={key.id} className="glass-card border-glass-border">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{key.name}</h3>
                          <Badge variant={key.is_active ? "default" : "secondary"}>
                            {key.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>

                        {/* API Key Display */}
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 font-mono text-sm mb-3">
                          <code className="flex-1">
                            {visibleKeys.has(key.id) ? key.api_key : maskAPIKey(key.api_key)}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleKeyVisibility(key.id)}
                          >
                            {visibleKeys.has(key.id) ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => copyToClipboard(key.api_key)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span>Limite: {key.rate_limit_per_hour}/heure</span>
                          <span>Utilisations: {key.usage_count}</span>
                          {key.last_used_at && (
                            <span>
                              Dernière utilisation: {format(new Date(key.last_used_at), "d MMM yyyy HH:mm", { locale: fr })}
                            </span>
                          )}
                          <span>
                            Créée le: {format(new Date(key.created_at), "d MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={key.is_active}
                          onCheckedChange={() => toggleKeyStatus(key)}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteKey(key.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Documentation */}
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Documentation API
              </CardTitle>
              <CardDescription>Comment intégrer vos véhicules sur votre site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 font-mono text-sm overflow-x-auto">
                <pre>{`// Exemple d'appel API
fetch('${import.meta.env.VITE_SUPABASE_URL}/functions/v1/owner-api/v1/vehicles', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));`}</pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Endpoints disponibles</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                    <Badge variant="outline" className="text-xs">GET</Badge>
                    <code>/v1/vehicles</code>
                    <span className="text-muted-foreground">- Liste de vos véhicules</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                    <Badge variant="outline" className="text-xs">GET</Badge>
                    <code>/v1/vehicles/:id</code>
                    <span className="text-muted-foreground">- Détails d'un véhicule</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                    <Badge variant="outline" className="text-xs">GET</Badge>
                    <code>/v1/availability/:id</code>
                    <span className="text-muted-foreground">- Disponibilités</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                    <Badge variant="outline" className="text-xs">POST</Badge>
                    <code>/v1/reservations</code>
                    <span className="text-muted-foreground">- Créer une réservation</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                    <Badge variant="outline" className="text-xs">GET</Badge>
                    <code>/v1/stats</code>
                    <span className="text-muted-foreground">- Statistiques</span>
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('/api-docs', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Documentation complète
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="mt-6">
          <FleetImport ownerId={ownerId} onImportComplete={() => {}} />
        </TabsContent>

        {/* Sync Tab */}
        <TabsContent value="sync" className="mt-6">
          <CalendarSync ownerId={ownerId} />
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6 mt-6">
          <Card className="glass-card border-glass-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Historique des appels API
              </CardTitle>
              <CardDescription>Les 50 derniers appels à votre API</CardDescription>
            </CardHeader>
            <CardContent>
              {apiLogs.length === 0 ? (
                <div className="py-12 text-center">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Aucun appel API enregistré</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {apiLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">{log.method}</Badge>
                        <code className="text-muted-foreground">{log.endpoint}</code>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={getStatusColor(log.status_code)}>{log.status_code}</span>
                        <span className="text-muted-foreground">{log.response_time_ms}ms</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "d MMM HH:mm", { locale: fr })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerAPIKeys;
