import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Map, Trash2, Save, AlertTriangle, Loader2, MapPin, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface GeofenceManagerProps {
  vehicleId: string;
}

interface Geofence {
  id: string;
  vehicle_id: string;
  name: string;
  geojson: any;
  is_active: boolean;
  alert_enabled: boolean;
}

const GeofenceManager = ({ vehicleId }: GeofenceManagerProps) => {
  const queryClient = useQueryClient();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const drawRef = useRef<any>(null);
  const [mapboxToken, setMapboxToken] = useState("");
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [drawnPolygon, setDrawnPolygon] = useState<any>(null);

  const { data: geofences, isLoading } = useQuery({
    queryKey: ["vehicle-geofences", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_geofences")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Geofence[];
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["geofence-alerts", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geofence_alerts")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const createGeofenceMutation = useMutation({
    mutationFn: async () => {
      if (!drawnPolygon || !newZoneName) {
        throw new Error("Missing polygon or name");
      }

      const { error } = await supabase.from("vehicle_geofences").insert({
        vehicle_id: vehicleId,
        name: newZoneName,
        geojson: drawnPolygon,
        is_active: true,
        alert_enabled: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Zone créée",
        description: "La zone de géofencing a été enregistrée.",
      });
      setNewZoneName("");
      setDrawnPolygon(null);
      if (drawRef.current) {
        drawRef.current.deleteAll();
      }
      queryClient.invalidateQueries({ queryKey: ["vehicle-geofences"] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer la zone.",
        variant: "destructive",
      });
    },
  });

  const deleteGeofenceMutation = useMutation({
    mutationFn: async (geofenceId: string) => {
      const { error } = await supabase
        .from("vehicle_geofences")
        .delete()
        .eq("id", geofenceId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Zone supprimée",
        description: "La zone a été supprimée avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["vehicle-geofences"] });
    },
  });

  const toggleGeofenceMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("vehicle_geofences")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-geofences"] });
    },
  });

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || isMapLoaded) return;

    const loadMap = async () => {
      try {
        const mapboxgl = await import("mapbox-gl");
        const MapboxDraw = (await import("@mapbox/mapbox-gl-draw")).default;
        
        await import("mapbox-gl/dist/mapbox-gl.css");
        await import("@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css");

        mapboxgl.default.accessToken = mapboxToken;

        const map = new mapboxgl.default.Map({
          container: mapContainerRef.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [-17.4676, 14.7167], // Dakar
          zoom: 10,
        });

        const draw = new MapboxDraw({
          displayControlsDefault: false,
          controls: {
            polygon: true,
            trash: true,
          },
          defaultMode: "simple_select",
        });

        map.addControl(draw);
        map.addControl(new mapboxgl.default.NavigationControl());

        map.on("draw.create", (e: any) => {
          const polygon = e.features[0];
          setDrawnPolygon(polygon.geometry);
        });

        map.on("draw.delete", () => {
          setDrawnPolygon(null);
        });

        map.on("load", () => {
          // Add existing geofences to map
          if (geofences) {
            geofences.forEach((fence, index) => {
              if (fence.geojson) {
                map.addSource(`geofence-${fence.id}`, {
                  type: "geojson",
                  data: {
                    type: "Feature",
                    properties: {},
                    geometry: fence.geojson,
                  },
                });

                map.addLayer({
                  id: `geofence-fill-${fence.id}`,
                  type: "fill",
                  source: `geofence-${fence.id}`,
                  paint: {
                    "fill-color": fence.is_active ? "#22c55e" : "#94a3b8",
                    "fill-opacity": 0.3,
                  },
                });

                map.addLayer({
                  id: `geofence-line-${fence.id}`,
                  type: "line",
                  source: `geofence-${fence.id}`,
                  paint: {
                    "line-color": fence.is_active ? "#16a34a" : "#64748b",
                    "line-width": 2,
                  },
                });
              }
            });
          }
        });

        mapRef.current = map;
        drawRef.current = draw;
        setIsMapLoaded(true);
      } catch (error) {
        console.error("Error loading map:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger la carte Mapbox.",
          variant: "destructive",
        });
      }
    };

    loadMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [mapboxToken, geofences]);

  if (!mapboxToken) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Système de Geofencing</CardTitle>
              <CardDescription>
                Définissez une zone de circulation autorisée pour votre véhicule
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              Pour utiliser le geofencing, entrez votre token Mapbox.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Token Mapbox (public)</Label>
            <Input
              placeholder="pk.eyJ1Ijoi..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Obtenez votre token sur{" "}
              <a
                href="https://mapbox.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Alertes de sortie de zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between bg-white p-3 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">
                        Sortie de zone détectée
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive">
                    {alert.alert_type === "exit" ? "Sortie" : "Entrée"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Dessiner une zone</CardTitle>
                <CardDescription>
                  Utilisez l'outil polygone pour définir la zone autorisée
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            ref={mapContainerRef}
            className="h-[400px] rounded-lg overflow-hidden"
          />

          {drawnPolygon && (
            <div className="flex items-center gap-3">
              <Input
                placeholder="Nom de la zone"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => createGeofenceMutation.mutate()}
                disabled={!newZoneName || createGeofenceMutation.isPending}
              >
                {createGeofenceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Sauvegarder
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Geofences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Zones enregistrées</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : geofences && geofences.length > 0 ? (
            <div className="space-y-3">
              {geofences.map((fence) => (
                <div
                  key={fence.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        fence.is_active ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <p className="font-medium">{fence.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {fence.alert_enabled ? "Alertes activées" : "Alertes désactivées"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={fence.is_active}
                      onCheckedChange={(checked) =>
                        toggleGeofenceMutation.mutate({ id: fence.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteGeofenceMutation.mutate(fence.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Map className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune zone définie</p>
              <p className="text-sm">Dessinez un polygone sur la carte ci-dessus</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GeofenceManager;
