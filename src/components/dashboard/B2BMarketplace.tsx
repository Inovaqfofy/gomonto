import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Users, FileText, TrendingUp, CheckCircle, Clock, XCircle, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface B2BMarketplaceProps {
  ownerId: string;
}

interface B2BClient {
  id: string;
  company_name: string;
  company_email: string;
  company_phone: string | null;
  contact_person: string | null;
  contract_discount: number;
  payment_terms_days: number;
  status: string;
  is_verified: boolean;
  created_at: string;
}

interface B2BContract {
  id: string;
  client_id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  discount_percentage: number;
  status: string;
  clientName?: string;
}

const statusConfig = {
  pending: { label: "En attente", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  active: { label: "Actif", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  suspended: { label: "Suspendu", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  terminated: { label: "Terminé", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  draft: { label: "Brouillon", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  paused: { label: "En pause", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  expired: { label: "Expiré", color: "bg-red-500/10 text-red-500 border-red-500/20" },
};

const B2BMarketplace = ({ ownerId }: B2BMarketplaceProps) => {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<B2BClient[]>([]);
  const [contracts, setContracts] = useState<B2BContract[]>([]);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    company_name: "",
    company_email: "",
    company_phone: "",
    contact_person: "",
    contract_discount: 15,
    payment_terms_days: 30,
  });

  useEffect(() => {
    fetchData();
  }, [ownerId]);

  const fetchData = async () => {
    // Fetch clients
    const { data: clientData } = await supabase
      .from("b2b_clients")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (clientData) {
      setClients(clientData);

      // Fetch contracts
      const { data: contractData } = await supabase
        .from("b2b_contracts")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });

      if (contractData) {
        const enrichedContracts = contractData.map((contract) => ({
          ...contract,
          clientName: clientData.find((c) => c.id === contract.client_id)?.company_name || "Client",
        }));
        setContracts(enrichedContracts);
      }
    }

    setLoading(false);
  };

  const addClient = async () => {
    if (!newClient.company_name || !newClient.company_email) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    const { error } = await supabase.from("b2b_clients").insert({
      owner_id: ownerId,
      ...newClient,
    });

    if (error) {
      toast.error("Erreur lors de l'ajout du client");
    } else {
      toast.success("Client entreprise ajouté");
      setIsAddClientDialogOpen(false);
      setNewClient({
        company_name: "",
        company_email: "",
        company_phone: "",
        contact_person: "",
        contract_discount: 15,
        payment_terms_days: 30,
      });
      fetchData();
    }
  };

  const updateClientStatus = async (clientId: string, status: string) => {
    const { error } = await supabase
      .from("b2b_clients")
      .update({ status })
      .eq("id", clientId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Statut mis à jour");
      fetchData();
    }
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
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            Espace B2B
          </h1>
          <p className="text-muted-foreground">Gérez vos clients entreprises et contrats longue durée</p>
        </div>
        <Dialog open={isAddClientDialogOpen} onOpenChange={setIsAddClientDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un client entreprise</DialogTitle>
              <DialogDescription>
                Créez un compte pour une entreprise cliente
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Nom de l'entreprise *</label>
                <Input
                  value={newClient.company_name}
                  onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
                  placeholder="Société XYZ"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    value={newClient.company_email}
                    onChange={(e) => setNewClient({ ...newClient, company_email: e.target.value })}
                    placeholder="contact@entreprise.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Téléphone</label>
                  <Input
                    value={newClient.company_phone}
                    onChange={(e) => setNewClient({ ...newClient, company_phone: e.target.value })}
                    placeholder="+221 77 123 45 67"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Personne de contact</label>
                <Input
                  value={newClient.contact_person}
                  onChange={(e) => setNewClient({ ...newClient, contact_person: e.target.value })}
                  placeholder="M. Diallo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Remise (%)</label>
                  <Input
                    type="number"
                    value={newClient.contract_discount}
                    onChange={(e) => setNewClient({ ...newClient, contract_discount: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Délai de paiement (jours)</label>
                  <Input
                    type="number"
                    value={newClient.payment_terms_days}
                    onChange={(e) => setNewClient({ ...newClient, payment_terms_days: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddClientDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={addClient}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-glass-border">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clients.length}</p>
                <p className="text-xs text-muted-foreground">Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-glass-border">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clients.filter((c) => c.status === "active").length}</p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-glass-border">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contracts.length}</p>
                <p className="text-xs text-muted-foreground">Contrats</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-glass-border">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clients.reduce((sum, c) => sum + c.contract_discount, 0) / (clients.length || 1)}%</p>
                <p className="text-xs text-muted-foreground">Remise moyenne</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList className="glass">
          <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contrats ({contracts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          {clients.length === 0 ? (
            <Card className="glass-card border-glass-border">
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">Aucun client entreprise</p>
                <Button onClick={() => setIsAddClientDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un client
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {clients.map((client) => {
                const config = statusConfig[client.status as keyof typeof statusConfig] || statusConfig.pending;

                return (
                  <Card key={client.id} className="glass-card border-glass-border">
                    <CardContent className="py-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{client.company_name}</h3>
                              <Badge className={`${config.color} border text-xs`}>
                                {config.label}
                              </Badge>
                              {client.is_verified && (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Vérifié
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {client.company_email}
                              </span>
                              {client.company_phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-4 h-4" />
                                  {client.company_phone}
                                </span>
                              )}
                              {client.contact_person && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {client.contact_person}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Remise: {client.contract_discount}%</span>
                              <span>Paiement: {client.payment_terms_days} jours</span>
                              <span>Depuis: {format(new Date(client.created_at), "d MMM yyyy", { locale: fr })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {client.status === "pending" && (
                            <Button size="sm" onClick={() => updateClientStatus(client.id, "active")}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Activer
                            </Button>
                          )}
                          {client.status === "active" && (
                            <Button size="sm" variant="outline" onClick={() => updateClientStatus(client.id, "suspended")}>
                              Suspendre
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contracts">
          {contracts.length === 0 ? (
            <Card className="glass-card border-glass-border">
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Aucun contrat B2B</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => {
                const config = statusConfig[contract.status as keyof typeof statusConfig] || statusConfig.draft;

                return (
                  <Card key={contract.id} className="glass-card border-glass-border">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{contract.contract_number}</h3>
                            <Badge className={`${config.color} border text-xs`}>
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {contract.clientName} • {format(new Date(contract.start_date), "d MMM yyyy", { locale: fr })} - {format(new Date(contract.end_date), "d MMM yyyy", { locale: fr })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Remise: {contract.discount_percentage}%
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Détails
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default B2BMarketplace;
