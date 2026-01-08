import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Star, MapPin, Car, Clock, Check, X, Loader2, Phone, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface DriverPoolProps {
  vehicleId: string;
  ownerId: string;
}

interface Driver {
  id: string;
  user_id: string;
  license_number: string;
  years_experience: number;
  vehicle_types: string[];
  languages: string[];
  hourly_rate: number;
  daily_rate: number;
  is_available: boolean;
  rating: number;
  total_rides: number;
  bio: string | null;
  status: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
  };
}

const DriverPool = ({ vehicleId, ownerId }: DriverPoolProps) => {
  const queryClient = useQueryClient();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [requestForm, setRequestForm] = useState({
    request_type: "full_duration",
    start_date: "",
    end_date: "",
    pickup_location: "",
    dropoff_location: "",
    notes: "",
  });

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["available-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_certifications")
        .select("*")
        .eq("status", "verified")
        .eq("is_available", true)
        .order("rating", { ascending: false });

      if (error) throw error;
      return data as Driver[];
    },
  });

  const { data: myRequests } = useQuery({
    queryKey: ["my-driver-requests", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_requests")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const requestDriverMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDriver) throw new Error("No driver selected");

      const rate = requestForm.request_type === "hourly" 
        ? selectedDriver.hourly_rate 
        : selectedDriver.daily_rate;

      const { error } = await supabase
        .from("driver_requests")
        .insert({
          vehicle_id: vehicleId,
          owner_id: ownerId,
          driver_id: selectedDriver.user_id,
          request_type: requestForm.request_type,
          start_date: requestForm.start_date,
          end_date: requestForm.end_date || null,
          pickup_location: requestForm.pickup_location,
          dropoff_location: requestForm.dropoff_location || null,
          notes: requestForm.notes || null,
          offered_rate: rate,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Demande envoyée",
        description: "Le chauffeur a été notifié de votre demande.",
      });
      setIsRequestDialogOpen(false);
      setSelectedDriver(null);
      setRequestForm({
        request_type: "full_duration",
        start_date: "",
        end_date: "",
        pickup_location: "",
        dropoff_location: "",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["my-driver-requests"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande.",
        variant: "destructive",
      });
    },
  });

  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsRequestDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">En attente</Badge>;
      case "accepted":
        return <Badge className="bg-green-100 text-green-800">Acceptée</Badge>;
      case "rejected":
        return <Badge variant="destructive">Refusée</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Terminée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Pool de Chauffeurs Certifiés</CardTitle>
              <CardDescription>
                Sollicitez un chauffeur professionnel pour vos locations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {drivers && drivers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {drivers.map((driver) => (
                <Card key={driver.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={driver.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {driver.profiles?.full_name?.charAt(0) || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold truncate">
                            {driver.profiles?.full_name || "Chauffeur"}
                          </h4>
                          <Badge className="bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Certifié
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center text-yellow-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="ml-1 text-sm font-medium">
                              {driver.rating?.toFixed(1) || "N/A"}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            ({driver.total_rides} courses)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{driver.years_experience} ans d'expérience</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {driver.vehicle_types?.slice(0, 3).map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-sm">
                            <span className="font-semibold text-primary">
                              {driver.daily_rate?.toLocaleString()} FCFA
                            </span>
                            <span className="text-muted-foreground">/jour</span>
                          </div>
                          <Button size="sm" onClick={() => handleSelectDriver(driver)}>
                            Solliciter
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun chauffeur disponible pour le moment</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Requests */}
      {myRequests && myRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mes demandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{request.pickup_location}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.start_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Demander un chauffeur</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar>
                  <AvatarImage src={selectedDriver.profiles?.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedDriver.profiles?.full_name?.charAt(0) || "C"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedDriver.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDriver.daily_rate?.toLocaleString()} FCFA/jour
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Type de service</Label>
                  <Select
                    value={requestForm.request_type}
                    onValueChange={(v) => setRequestForm({ ...requestForm, request_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_way">Trajet simple</SelectItem>
                      <SelectItem value="full_duration">Durée complète</SelectItem>
                      <SelectItem value="hourly">À l'heure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date début</Label>
                    <Input
                      type="date"
                      value={requestForm.start_date}
                      onChange={(e) => setRequestForm({ ...requestForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Date fin</Label>
                    <Input
                      type="date"
                      value={requestForm.end_date}
                      onChange={(e) => setRequestForm({ ...requestForm, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Lieu de prise en charge</Label>
                  <Input
                    placeholder="Adresse de départ"
                    value={requestForm.pickup_location}
                    onChange={(e) => setRequestForm({ ...requestForm, pickup_location: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Destination (optionnel)</Label>
                  <Input
                    placeholder="Adresse d'arrivée"
                    value={requestForm.dropoff_location}
                    onChange={(e) => setRequestForm({ ...requestForm, dropoff_location: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Instructions particulières..."
                    value={requestForm.notes}
                    onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => requestDriverMutation.mutate()}
                disabled={!requestForm.start_date || !requestForm.pickup_location || requestDriverMutation.isPending}
              >
                {requestDriverMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Envoyer la demande
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverPool;
