import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { 
  AlertTriangle, Search, Eye, CheckCircle, XCircle,
  MessageSquare, DollarSign, FileText
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Incident {
  id: string;
  incident_type: string;
  description: string;
  status: string;
  created_at: string;
  location_address: string;
  photos: any[];
  reservations: {
    id: string;
    total_price: number;
    vehicles: {
      brand: string;
      model: string;
    };
  };
  reporter: {
    full_name: string;
    email: string;
  };
}

const AdminDisputeCenter = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [resolutionDialog, setResolutionDialog] = useState(false);
  const [resolution, setResolution] = useState({
    type: "no_action",
    refundAmount: 0,
    refundTo: "",
    decision: "",
    notes: "",
  });

  useEffect(() => {
    fetchIncidents();
  }, [filterStatus]);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("incident_reports")
        .select(`*, reservations(id, total_price, vehicles(brand, model))`)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setIncidents((data || []) as any);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      toast.error("Erreur lors du chargement des incidents");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedIncident || !user || !resolution.decision) {
      toast.error("Veuillez remplir la décision");
      return;
    }

    try {
      // Create resolution record
      const { error: resError } = await supabase
        .from("dispute_resolutions")
        .insert({
          incident_id: selectedIncident.id,
          reservation_id: selectedIncident.reservations?.id,
          admin_id: user.id,
          resolution_type: resolution.type,
          refund_amount: resolution.refundAmount,
          refund_to: resolution.refundTo,
          decision: resolution.decision,
          notes: resolution.notes,
          status: "resolved",
          resolved_at: new Date().toISOString(),
        });

      if (resError) throw resError;

      // Update incident status
      const { error: incError } = await supabase
        .from("incident_reports")
        .update({ status: "resolved" })
        .eq("id", selectedIncident.id);

      if (incError) throw incError;

      toast.success("Litige résolu avec succès");
      setResolutionDialog(false);
      setResolution({ type: "no_action", refundAmount: 0, refundTo: "", decision: "", notes: "" });
      fetchIncidents();
    } catch (error) {
      console.error("Error resolving dispute:", error);
      toast.error("Erreur lors de la résolution");
    }
  };

  const filteredIncidents = incidents.filter(inc =>
    inc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.reporter?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "En attente", variant: "destructive" },
      investigating: { label: "En cours", variant: "secondary" },
      resolved: { label: "Résolu", variant: "default" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getIncidentTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; color: string }> = {
      accident: { label: "Accident", color: "bg-red-500/10 text-red-500" },
      damage: { label: "Dommage", color: "bg-orange-500/10 text-orange-500" },
      theft: { label: "Vol", color: "bg-purple-500/10 text-purple-500" },
      breakdown: { label: "Panne", color: "bg-amber-500/10 text-amber-500" },
      dispute: { label: "Litige", color: "bg-blue-500/10 text-blue-500" },
      other: { label: "Autre", color: "bg-gray-500/10 text-gray-500" },
    };
    const config = typeConfig[type] || { label: type, color: "bg-muted text-muted-foreground" };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const stats = {
    total: incidents.length,
    pending: incidents.filter(i => i.status === "pending").length,
    investigating: incidents.filter(i => i.status === "investigating").length,
    resolved: incidents.filter(i => i.status === "resolved").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Centre de Litiges
          </h1>
          <p className="text-muted-foreground">Gérez les incidents et litiges signalés</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-glass-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total incidents</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-glass-border bg-red-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-glass-border bg-amber-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.investigating}</p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-glass-border bg-green-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
            <p className="text-xs text-muted-foreground">Résolus</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card border-glass-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="investigating">En cours</SelectItem>
                <SelectItem value="resolved">Résolus</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Table */}
      <Card className="glass-card border-glass-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Déclarant</TableHead>
                <TableHead>Véhicule</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun incident trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell>{getIncidentTypeBadge(incident.incident_type)}</TableCell>
                    <TableCell className="max-w-xs truncate">{incident.description}</TableCell>
                    <TableCell>{incident.reporter?.full_name || "Inconnu"}</TableCell>
                    <TableCell>
                      {incident.reservations?.vehicles?.brand} {incident.reservations?.vehicles?.model}
                    </TableCell>
                    <TableCell>
                      {format(new Date(incident.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>{getStatusBadge(incident.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedIncident(incident)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Détails de l'incident</DialogTitle>
                            </DialogHeader>
                            {selectedIncident && (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  {getIncidentTypeBadge(selectedIncident.incident_type)}
                                  {getStatusBadge(selectedIncident.status)}
                                </div>

                                <div className="p-4 rounded-lg bg-muted/50">
                                  <h4 className="font-medium mb-2">Description</h4>
                                  <p className="text-sm text-muted-foreground">{selectedIncident.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Déclarant</p>
                                    <p className="font-medium">{selectedIncident.reporter?.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{selectedIncident.reporter?.email}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Véhicule</p>
                                    <p className="font-medium">
                                      {selectedIncident.reservations?.vehicles?.brand} {selectedIncident.reservations?.vehicles?.model}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Localisation</p>
                                    <p className="font-medium">{selectedIncident.location_address || "Non précisée"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Montant réservation</p>
                                    <p className="font-medium">{selectedIncident.reservations?.total_price?.toLocaleString()} FCFA</p>
                                  </div>
                                </div>

                                {selectedIncident.photos && selectedIncident.photos.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Photos</h4>
                                    <div className="flex gap-2 flex-wrap">
                                      {selectedIncident.photos.map((photo: any, idx: number) => (
                                        <div key={idx} className="w-20 h-20 rounded bg-muted" />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {selectedIncident.status !== "resolved" && (
                                  <Button
                                    onClick={() => setResolutionDialog(true)}
                                    className="w-full"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Résoudre ce litige
                                  </Button>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <Dialog open={resolutionDialog} onOpenChange={setResolutionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Résoudre le litige</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type de résolution</label>
              <Select value={resolution.type} onValueChange={(v) => setResolution({...resolution, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_action">Aucune action requise</SelectItem>
                  <SelectItem value="partial_refund">Remboursement partiel</SelectItem>
                  <SelectItem value="full_refund">Remboursement total</SelectItem>
                  <SelectItem value="compensation">Compensation</SelectItem>
                  <SelectItem value="warning">Avertissement</SelectItem>
                  <SelectItem value="suspension">Suspension compte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {["partial_refund", "full_refund", "compensation"].includes(resolution.type) && (
              <>
                <div>
                  <label className="text-sm font-medium">Montant (FCFA)</label>
                  <Input
                    type="number"
                    value={resolution.refundAmount}
                    onChange={(e) => setResolution({...resolution, refundAmount: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Bénéficiaire</label>
                  <Select value={resolution.refundTo} onValueChange={(v) => setResolution({...resolution, refundTo: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="renter">Locataire</SelectItem>
                      <SelectItem value="owner">Propriétaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium">Décision *</label>
              <Textarea
                value={resolution.decision}
                onChange={(e) => setResolution({...resolution, decision: e.target.value})}
                placeholder="Expliquez votre décision..."
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notes internes</label>
              <Textarea
                value={resolution.notes}
                onChange={(e) => setResolution({...resolution, notes: e.target.value})}
                placeholder="Notes pour l'équipe admin..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleResolve}>
              Confirmer la résolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDisputeCenter;
