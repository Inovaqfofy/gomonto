import { useState, useEffect } from "react";
import { AlertTriangle, Clock, FileWarning, Shield, Car, CheckCircle, Upload, ArrowLeft } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { format, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { DashboardView } from "@/pages/Dashboard";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  license_plate: string;
  insurance_expiry_date: string | null;
  technical_inspection_expiry_date: string | null;
  compliance_suspended: boolean | null;
}

interface Alert {
  id: string;
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  type: "insurance" | "technical";
  status: "expired" | "warning" | "missing";
  expiryDate: string | null;
  daysRemaining: number | null;
  message: string;
}

interface ComplianceManagerProps {
  userId: string;
  onNavigate: (view: DashboardView) => void;
  onBack: () => void;
}

const ComplianceManager = ({ userId, onNavigate, onBack }: ComplianceManagerProps) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "expired" | "warning" | "missing">("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: vehiclesData, error } = await supabase
      .from("vehicles")
      .select("id, brand, model, license_plate, insurance_expiry_date, technical_inspection_expiry_date, compliance_suspended")
      .eq("owner_id", userId);

    if (error) {
      console.error("Error fetching vehicles:", error);
      setIsLoading(false);
      return;
    }

    setVehicles(vehiclesData as Vehicle[]);

    const today = new Date();
    const warningThreshold = 15;
    const newAlerts: Alert[] = [];

    (vehiclesData as Vehicle[])?.forEach((vehicle) => {
      const vehicleName = `${vehicle.brand} ${vehicle.model}`;

      // Check insurance
      if (!vehicle.insurance_expiry_date) {
        newAlerts.push({
          id: `${vehicle.id}-insurance-missing`,
          vehicleId: vehicle.id,
          vehicleName,
          licensePlate: vehicle.license_plate,
          type: "insurance",
          status: "missing",
          expiryDate: null,
          daysRemaining: null,
          message: `Attestation d'assurance manquante`,
        });
      } else {
        const insuranceDate = parseISO(vehicle.insurance_expiry_date);
        const daysRemaining = differenceInDays(insuranceDate, today);

        if (daysRemaining < 0) {
          newAlerts.push({
            id: `${vehicle.id}-insurance-expired`,
            vehicleId: vehicle.id,
            vehicleName,
            licensePlate: vehicle.license_plate,
            type: "insurance",
            status: "expired",
            expiryDate: vehicle.insurance_expiry_date,
            daysRemaining,
            message: `Assurance expirée depuis ${Math.abs(daysRemaining)} jour(s)`,
          });
        } else if (daysRemaining <= warningThreshold) {
          newAlerts.push({
            id: `${vehicle.id}-insurance-warning`,
            vehicleId: vehicle.id,
            vehicleName,
            licensePlate: vehicle.license_plate,
            type: "insurance",
            status: "warning",
            expiryDate: vehicle.insurance_expiry_date,
            daysRemaining,
            message: `Assurance expire dans ${daysRemaining} jour(s)`,
          });
        }
      }

      // Check technical inspection
      if (!vehicle.technical_inspection_expiry_date) {
        newAlerts.push({
          id: `${vehicle.id}-technical-missing`,
          vehicleId: vehicle.id,
          vehicleName,
          licensePlate: vehicle.license_plate,
          type: "technical",
          status: "missing",
          expiryDate: null,
          daysRemaining: null,
          message: `Visite technique manquante`,
        });
      } else {
        const technicalDate = parseISO(vehicle.technical_inspection_expiry_date);
        const daysRemaining = differenceInDays(technicalDate, today);

        if (daysRemaining < 0) {
          newAlerts.push({
            id: `${vehicle.id}-technical-expired`,
            vehicleId: vehicle.id,
            vehicleName,
            licensePlate: vehicle.license_plate,
            type: "technical",
            status: "expired",
            expiryDate: vehicle.technical_inspection_expiry_date,
            daysRemaining,
            message: `Visite technique expirée depuis ${Math.abs(daysRemaining)} jour(s)`,
          });
        } else if (daysRemaining <= warningThreshold) {
          newAlerts.push({
            id: `${vehicle.id}-technical-warning`,
            vehicleId: vehicle.id,
            vehicleName,
            licensePlate: vehicle.license_plate,
            type: "technical",
            status: "warning",
            expiryDate: vehicle.technical_inspection_expiry_date,
            daysRemaining,
            message: `Visite technique expire dans ${daysRemaining} jour(s)`,
          });
        }
      }
    });

    // Sort alerts: expired first, then warnings, then missing
    newAlerts.sort((a, b) => {
      const priority = { expired: 0, warning: 1, missing: 2 };
      return priority[a.status] - priority[b.status];
    });

    setAlerts(newAlerts);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleUpdateDocument = async () => {
    if (!selectedAlert || !newExpiryDate) return;

    setIsUpdating(true);
    const field = selectedAlert.type === "insurance" ? "insurance_expiry_date" : "technical_inspection_expiry_date";

    const { error } = await supabase
      .from("vehicles")
      .update({ [field]: newExpiryDate, compliance_suspended: false })
      .eq("id", selectedAlert.vehicleId);

    if (error) {
      toast.error("Erreur lors de la mise à jour du document");
      console.error(error);
    } else {
      toast.success("Document mis à jour avec succès");
      setIsUpdateModalOpen(false);
      setSelectedAlert(null);
      setNewExpiryDate("");
      fetchData();
    }
    setIsUpdating(false);
  };

  const getStatusIcon = (status: Alert["status"]) => {
    switch (status) {
      case "expired":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "warning":
        return <Clock className="w-5 h-5 text-amber-500" />;
      case "missing":
        return <FileWarning className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: Alert["status"]) => {
    switch (status) {
      case "expired":
        return <Badge variant="destructive">Expiré</Badge>;
      case "warning":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">À renouveler</Badge>;
      case "missing":
        return <Badge variant="secondary">Manquant</Badge>;
    }
  };

  const getTypeBadge = (type: Alert["type"]) => {
    switch (type) {
      case "insurance":
        return <Badge variant="outline" className="text-xs">Assurance</Badge>;
      case "technical":
        return <Badge variant="outline" className="text-xs">Visite Technique</Badge>;
    }
  };

  const filteredAlerts = filter === "all" ? alerts : alerts.filter((a) => a.status === filter);

  const expiredCount = alerts.filter((a) => a.status === "expired").length;
  const warningCount = alerts.filter((a) => a.status === "warning").length;
  const missingCount = alerts.filter((a) => a.status === "missing").length;

  if (isLoading) {
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
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Gestion de la Conformité</h1>
          <p className="text-muted-foreground">Gérez les documents de vos véhicules</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setFilter("all")}
          className={`glass-card p-4 border transition-all text-left ${
            filter === "all" ? "border-primary bg-primary/5" : "border-glass-border hover:border-primary/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alerts.length}</p>
              <p className="text-sm text-muted-foreground">Total alertes</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilter("expired")}
          className={`glass-card p-4 border transition-all text-left ${
            filter === "expired" ? "border-destructive bg-destructive/5" : "border-glass-border hover:border-destructive/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{expiredCount}</p>
              <p className="text-sm text-muted-foreground">Expirés</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilter("warning")}
          className={`glass-card p-4 border transition-all text-left ${
            filter === "warning" ? "border-amber-500 bg-amber-500/5" : "border-glass-border hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{warningCount}</p>
              <p className="text-sm text-muted-foreground">À renouveler</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilter("missing")}
          className={`glass-card p-4 border transition-all text-left ${
            filter === "missing" ? "border-muted-foreground bg-muted/20" : "border-glass-border hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <FileWarning className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{missingCount}</p>
              <p className="text-sm text-muted-foreground">Manquants</p>
            </div>
          </div>
        </button>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="glass-card p-12 border border-glass-border text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {filter === "all" ? "Tous vos véhicules sont conformes !" : "Aucune alerte dans cette catégorie"}
          </h3>
          <p className="text-muted-foreground">
            {filter === "all"
              ? "Vos documents sont à jour et vos véhicules sont visibles sur la plateforme."
              : "Sélectionnez une autre catégorie pour voir les alertes."}
          </p>
        </div>
      ) : (
        <div className="glass-card border border-glass-border overflow-hidden">
          <div className="divide-y divide-border">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Vehicle Icon */}
                <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <Car className="w-8 h-8 text-muted-foreground" />
                </div>

                {/* Alert Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {getStatusIcon(alert.status)}
                    <span className="font-semibold">{alert.vehicleName}</span>
                    <span className="text-muted-foreground">({alert.licensePlate})</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                  <div className="flex flex-wrap gap-2">
                    {getTypeBadge(alert.type)}
                    {getStatusBadge(alert.status)}
                    {alert.expiryDate && (
                      <span className="text-xs text-muted-foreground">
                        {alert.status === "expired" ? "Expiré le" : "Expire le"}{" "}
                        {format(parseISO(alert.expiryDate), "d MMMM yyyy", { locale: fr })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 md:flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAlert(alert);
                      setNewExpiryDate(alert.expiryDate || "");
                      setIsUpdateModalOpen(true);
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Mettre à jour
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Update Document Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mettre à jour le document</DialogTitle>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="font-medium">{selectedAlert.vehicleName}</p>
                <p className="text-sm text-muted-foreground">{selectedAlert.licensePlate}</p>
                <div className="mt-2 flex gap-2">
                  {getTypeBadge(selectedAlert.type)}
                  {getStatusBadge(selectedAlert.status)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">
                  Nouvelle date d'expiration
                </Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
                <p className="text-xs text-muted-foreground">
                  Entrez la date d'expiration du nouveau document
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateDocument} disabled={!newExpiryDate || isUpdating}>
              {isUpdating ? "Mise à jour..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComplianceManager;
