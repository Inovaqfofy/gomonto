import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Battery, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BatteryLowAlertProps {
  reservationId: string;
  ownerId: string;
  vehicleName: string;
  renterName: string;
  renterPhone?: string;
}

const BatteryLowAlert = ({ 
  reservationId, 
  ownerId, 
  vehicleName, 
  renterName,
  renterPhone 
}: BatteryLowAlertProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [notifying, setNotifying] = useState(false);

  const notifyOwner = async () => {
    setNotifying(true);
    try {
      // Create notification for owner
      await supabase.from("notifications").insert({
        user_id: ownerId,
        type: "battery_low_alert",
        title: "⚠️ Alerte batterie faible - Safe-Drive",
        message: `Le téléphone de ${renterName} a une batterie faible. Le tracking Safe-Drive pourrait être interrompu pour ${vehicleName}.`,
        data: { 
          reservation_id: reservationId, 
          alert_type: "battery_low",
          renter_phone: renterPhone 
        },
      });

      toast.success("Notification envoyée au propriétaire");
      setIsVisible(false);
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Erreur lors de l'envoi de la notification");
    } finally {
      setNotifying(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4">
      <div className="glass-card p-4 border-2 border-amber-500/50 bg-amber-500/5 rounded-xl shadow-lg shadow-amber-500/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Battery className="w-5 h-5 text-amber-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Batterie faible
              </h4>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-1">
              Votre batterie est faible. Le tracking Safe-Drive pourrait s'interrompre.
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                variant="outline" 
                className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                onClick={notifyOwner}
                disabled={notifying}
              >
                {notifying ? (
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Phone className="w-4 h-4 mr-2" />
                )}
                Alerter le loueur
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setIsVisible(false)}
              >
                Ignorer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to detect battery level
export const useBatteryMonitor = (
  isActive: boolean,
  reservationId: string,
  ownerId: string,
  vehicleName: string,
  renterName: string
) => {
  const [showBatteryAlert, setShowBatteryAlert] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const checkBattery = async () => {
      try {
        // @ts-ignore - Battery API is not fully typed
        if ('getBattery' in navigator) {
          // @ts-ignore
          const battery = await navigator.getBattery();
          setBatteryLevel(battery.level * 100);

          if (battery.level <= 0.15 && !battery.charging) {
            setShowBatteryAlert(true);
            
            // Also send notification to owner
            await supabase.from("notifications").insert({
              user_id: ownerId,
              type: "battery_low_warning",
              title: "⚡ Batterie locataire faible",
              message: `La batterie du téléphone de ${renterName} est à ${Math.round(battery.level * 100)}%. Le tracking Safe-Drive pourrait s'arrêter.`,
              data: { 
                reservation_id: reservationId, 
                battery_level: battery.level * 100 
              },
            });
          }

          // Listen for battery changes
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(battery.level * 100);
            if (battery.level <= 0.15 && !battery.charging) {
              setShowBatteryAlert(true);
            }
          });
        }
      } catch (error) {
        console.log("Battery API not supported");
      }
    };

    checkBattery();
  }, [isActive, reservationId, ownerId, vehicleName, renterName]);

  return { showBatteryAlert, batteryLevel, setShowBatteryAlert };
};

export default BatteryLowAlert;
