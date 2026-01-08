import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Eye, Pen, CheckCircle, Clock, XCircle, Car, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import SignaturePad from "@/components/condition-report/SignaturePad";

interface DigitalContractManagerProps {
  ownerId: string;
}

interface Contract {
  id: string;
  contract_number: string;
  reservation_id: string;
  vehicle_id: string;
  renter_id: string;
  status: string;
  owner_signature: string | null;
  renter_signature: string | null;
  owner_signed_at: string | null;
  renter_signed_at: string | null;
  created_at: string;
  vehicleName?: string;
  renterName?: string;
  startDate?: string;
  endDate?: string;
}

const statusConfig = {
  draft: { label: "Brouillon", color: "bg-gray-500/10 text-gray-500 border-gray-500/20", icon: FileText },
  pending_signatures: { label: "En attente", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
  partially_signed: { label: "Partiellement signé", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Pen },
  signed: { label: "Signé", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle },
  cancelled: { label: "Annulé", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
};

const DigitalContractManager = ({ ownerId }: DigitalContractManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    fetchContracts();
  }, [ownerId]);

  const fetchContracts = async () => {
    const { data: contractData } = await supabase
      .from("rental_contracts")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (contractData) {
      const enrichedContracts = await Promise.all(
        contractData.map(async (contract) => {
          // Get vehicle info
          const { data: vehicle } = await supabase
            .from("vehicles")
            .select("brand, model")
            .eq("id", contract.vehicle_id)
            .single();

          // Get renter info
          const { data: renter } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", contract.renter_id)
            .single();

          // Get reservation dates
          const { data: reservation } = await supabase
            .from("reservations")
            .select("start_date, end_date")
            .eq("id", contract.reservation_id)
            .single();

          return {
            ...contract,
            vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : "Véhicule",
            renterName: renter?.full_name || "Locataire",
            startDate: reservation?.start_date,
            endDate: reservation?.end_date,
          };
        })
      );
      setContracts(enrichedContracts);
    }

    setLoading(false);
  };

  const signContract = async () => {
    if (!selectedContract || !signature) {
      toast.error("Veuillez signer le contrat");
      return;
    }

    const newStatus = selectedContract.renter_signature ? "signed" : "partially_signed";

    const { error } = await supabase
      .from("rental_contracts")
      .update({
        owner_signature: signature,
        owner_signed_at: new Date().toISOString(),
        status: newStatus,
      })
      .eq("id", selectedContract.id);

    if (error) {
      toast.error("Erreur lors de la signature");
    } else {
      toast.success("Contrat signé avec succès");
      setIsSignDialogOpen(false);
      setSignature(null);
      fetchContracts();
    }
  };

  const generateContractForReservation = async (reservationId: string, vehicleId: string, renterId: string) => {
    const contractNumber = `GM-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error } = await supabase.from("rental_contracts").insert({
      reservation_id: reservationId,
      vehicle_id: vehicleId,
      owner_id: ownerId,
      renter_id: renterId,
      contract_number: contractNumber,
      status: "pending_signatures",
    });

    if (error) {
      toast.error("Erreur lors de la création du contrat");
    } else {
      toast.success("Contrat créé avec succès");
      fetchContracts();
    }
  };

  const filterByStatus = (status: string) => {
    if (status === "all") return contracts;
    return contracts.filter((c) => c.status === status);
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
          <FileText className="w-8 h-8 text-primary" />
          Contrats Numériques
        </h1>
        <p className="text-muted-foreground">Gérez vos contrats de location avec signature électronique</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusConfig).slice(0, 4).map(([key, config]) => {
          const count = contracts.filter((c) => c.status === key).length;
          const IconComponent = config.icon;
          return (
            <Card key={key} className="glass-card border-glass-border">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contracts Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="glass">
          <TabsTrigger value="all">Tous ({contracts.length})</TabsTrigger>
          <TabsTrigger value="pending_signatures">En attente</TabsTrigger>
          <TabsTrigger value="signed">Signés</TabsTrigger>
        </TabsList>

        {["all", "pending_signatures", "signed"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue}>
            {filterByStatus(tabValue).length === 0 ? (
              <Card className="glass-card border-glass-border">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Aucun contrat trouvé</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filterByStatus(tabValue).map((contract) => {
                  const config = statusConfig[contract.status as keyof typeof statusConfig] || statusConfig.draft;
                  const IconComponent = config.icon;

                  return (
                    <Card key={contract.id} className="glass-card border-glass-border">
                      <CardContent className="py-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl ${config.color} flex items-center justify-center`}>
                              <IconComponent className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{contract.contract_number}</h3>
                                <Badge className={`${config.color} border text-xs`}>
                                  {config.label}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Car className="w-4 h-4" />
                                  {contract.vehicleName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  {contract.renterName}
                                </span>
                                {contract.startDate && contract.endDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {format(new Date(contract.startDate), "d MMM", { locale: fr })} - {format(new Date(contract.endDate), "d MMM yyyy", { locale: fr })}
                                  </span>
                                )}
                              </div>

                              {/* Signature status */}
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-xs">
                                  {contract.owner_signature ? (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Clock className="w-3 h-3 text-yellow-500" />
                                  )}
                                  <span>Loueur</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                  {contract.renter_signature ? (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Clock className="w-3 h-3 text-yellow-500" />
                                  )}
                                  <span>Locataire</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              Voir
                            </Button>
                            {!contract.owner_signature && contract.status !== "cancelled" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedContract(contract);
                                  setIsSignDialogOpen(true);
                                }}
                              >
                                <Pen className="w-4 h-4 mr-2" />
                                Signer
                              </Button>
                            )}
                            {contract.status === "signed" && (
                              <Button variant="outline" size="sm">
                                <Download className="w-4 h-4 mr-2" />
                                PDF
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
        ))}
      </Tabs>

      {/* Sign Dialog */}
      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Signer le contrat</DialogTitle>
            <DialogDescription>
              Contrat {selectedContract?.contract_number} - {selectedContract?.vehicleName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              En signant ce contrat, vous acceptez les conditions de location et confirmez l'état du véhicule.
            </p>
            <SignaturePad 
              onSignatureComplete={setSignature} 
              label="Votre signature"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={signContract} disabled={!signature}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmer la signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DigitalContractManager;
