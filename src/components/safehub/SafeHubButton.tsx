import { useState } from "react";
import { ShieldAlert, Phone, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import EmergencyContacts from "./EmergencyContacts";
import IncidentReportForm from "./IncidentReportForm";

interface SafeHubButtonProps {
  isActiveRental: boolean;
  reservationId?: string;
  vehicleId?: string;
  userId?: string;
  country?: string;
}

const SafeHubButton = ({
  isActiveRental,
  reservationId,
  vehicleId,
  userId,
  country = "senegal",
}: SafeHubButtonProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("emergency");

  // Only show during active rental
  if (!isActiveRental) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="destructive"
          size="lg"
          className="fixed bottom-24 right-4 z-50 rounded-full h-14 w-14 p-0 shadow-lg animate-pulse hover:animate-none md:bottom-6"
        >
          <ShieldAlert className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-destructive/10 p-2 rounded-full">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <SheetTitle>Safe-Hub GoMonto</SheetTitle>
                <p className="text-sm text-muted-foreground">Assistance 24h/24</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Location active
            </Badge>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="emergency" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Urgences
            </TabsTrigger>
            <TabsTrigger value="incident" className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              Déclarer
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 overflow-y-auto max-h-[calc(85vh-180px)]">
            <TabsContent value="emergency" className="m-0">
              <EmergencyContacts country={country} />
            </TabsContent>

            <TabsContent value="incident" className="m-0">
              {reservationId && vehicleId && userId ? (
                <IncidentReportForm
                  reservationId={reservationId}
                  vehicleId={vehicleId}
                  userId={userId}
                  onSuccess={() => setOpen(false)}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Informations de réservation manquantes
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default SafeHubButton;
