import { useState, useEffect } from "react";
import { AlertTriangle, Clock, FileWarning, CheckCircle, X, ChevronRight, Shield } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { format, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

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

interface ComplianceAlertsProps {
  userId: string;
  onNavigateToVehicle?: (vehicleId: string) => void;
  onViewAllAlerts?: () => void;
}

const ComplianceAlerts = ({ userId, onNavigateToVehicle, onViewAllAlerts }: ComplianceAlertsProps) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const fetchVehiclesCompliance = async () => {
      const { data: vehicles, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, license_plate, insurance_expiry_date, technical_inspection_expiry_date, compliance_suspended")
        .eq("owner_id", userId);

      if (error) {
        console.error("Error fetching vehicles:", error);
        setIsLoading(false);
        return;
      }

      const today = new Date();
      const warningThreshold = 15;
      const newAlerts: Alert[] = [];

      (vehicles as Vehicle[])?.forEach((vehicle) => {
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

    fetchVehiclesCompliance();
  }, [userId]);

  if (isLoading || alerts.length === 0 || isDismissed) return null;

  const expiredCount = alerts.filter((a) => a.status === "expired").length;
  const warningCount = alerts.filter((a) => a.status === "warning").length;
  const missingCount = alerts.filter((a) => a.status === "missing").length;

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

  const getStatusBg = (status: Alert["status"]) => {
    switch (status) {
      case "expired":
        return "bg-destructive/10 border-destructive/20";
      case "warning":
        return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
      case "missing":
        return "bg-muted/50 border-border";
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-destructive/10 via-amber-50 to-primary/5 dark:from-destructive/20 dark:via-amber-900/10 dark:to-primary/10 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Alertes de Conformité</h3>
              <p className="text-sm text-muted-foreground">
                {expiredCount > 0 && <span className="text-destructive font-medium">{expiredCount} expiré(s)</span>}
                {expiredCount > 0 && (warningCount > 0 || missingCount > 0) && " · "}
                {warningCount > 0 && <span className="text-amber-600 font-medium">{warningCount} à renouveler</span>}
                {warningCount > 0 && missingCount > 0 && " · "}
                {missingCount > 0 && <span className="text-muted-foreground">{missingCount} manquant(s)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-border max-h-80 overflow-y-auto">
        {alerts.slice(0, 5).map((alert) => (
          <div
            key={alert.id}
            className={`px-6 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer ${getStatusBg(alert.status)}`}
            onClick={() => onNavigateToVehicle?.(alert.vehicleId)}
          >
            <div className="flex-shrink-0">{getStatusIcon(alert.status)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {alert.vehicleName} <span className="text-muted-foreground">({alert.licensePlate})</span>
              </p>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
              {alert.expiryDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {alert.status === "expired" ? "Expiré le" : "Expire le"}{" "}
                  {format(parseISO(alert.expiryDate), "d MMMM yyyy", { locale: fr })}
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Suspended Vehicles Warning */}
      {expiredCount > 0 && (
        <div className="px-6 py-4 bg-destructive/5 border-t border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">
              <span className="font-semibold">{expiredCount} véhicule(s) suspendu(s)</span> — Les véhicules avec des
              documents expirés sont automatiquement masqués des résultats de recherche. Mettez à jour vos documents
              pour réactiver leur visibilité.
            </p>
          </div>
        </div>
      )}

      {/* View All Link */}
      {(alerts.length > 5 || onViewAllAlerts) && (
        <div className="px-6 py-3 bg-muted/30 border-t border-border text-center">
          <button 
            onClick={onViewAllAlerts}
            className="text-sm text-primary font-medium hover:underline"
          >
            Voir toutes les alertes ({alerts.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default ComplianceAlerts;
