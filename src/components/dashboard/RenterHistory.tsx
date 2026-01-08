import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Calendar, Car, Star, MapPin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RenterHistoryProps {
  userId: string;
}

interface CompletedReservation {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  total_days: number;
  vehicles?: {
    brand: string;
    model: string;
    location_city: string;
    vehicle_photos?: { file_path: string; is_primary: boolean }[];
  };
  reviews?: { rating: number; comment: string }[];
}

const RenterHistory = ({ userId }: RenterHistoryProps) => {
  const [history, setHistory] = useState<CompletedReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          id, start_date, end_date, total_price, total_days,
          vehicles (
            brand,
            model,
            location_city,
            vehicle_photos (file_path, is_primary)
          ),
          reviews (rating, comment)
        `)
        .eq("renter_id", userId)
        .eq("status", "completed")
        .order("end_date", { ascending: false });

      if (!error) {
        setHistory(data || []);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [userId]);

  const getVehicleImage = (vehicle: CompletedReservation["vehicles"]) => {
    const primaryPhoto = vehicle?.vehicle_photos?.find((p) => p.is_primary);
    return primaryPhoto?.file_path || vehicle?.vehicle_photos?.[0]?.file_path || "/placeholder.svg";
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
      <div>
        <h1 className="text-2xl font-bold">Historique de locations</h1>
        <p className="text-muted-foreground">Vos locations passées sur GoMonto</p>
      </div>

      {history.length === 0 ? (
        <div className="glass-card p-12 text-center border border-glass-border">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">Aucun historique</h3>
          <p className="text-muted-foreground">
            Vous n'avez pas encore terminé de location
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {history.map((reservation) => (
            <div
              key={reservation.id}
              className="glass-card border border-glass-border overflow-hidden"
            >
              <div className="h-40 relative">
                <img
                  src={getVehicleImage(reservation.vehicles)}
                  alt={`${reservation.vehicles?.brand} ${reservation.vehicles?.model}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {reservation.vehicles?.brand} {reservation.vehicles?.model}
                  </h3>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <MapPin className="w-3 h-3" />
                    {reservation.vehicles?.location_city}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(reservation.start_date), "dd MMM", { locale: fr })} -{" "}
                    {format(new Date(reservation.end_date), "dd MMM yyyy", { locale: fr })}
                  </div>
                  <span className="font-semibold text-primary">
                    {reservation.total_price.toLocaleString()} XOF
                  </span>
                </div>

                {reservation.reviews && reservation.reviews.length > 0 ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-glass-border">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < (reservation.reviews?.[0]?.rating || 0)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {reservation.reviews[0].comment?.slice(0, 50)}
                      {(reservation.reviews[0].comment?.length || 0) > 50 && "..."}
                    </span>
                  </div>
                ) : (
                  <button className="w-full py-2 text-sm text-primary hover:underline border-t border-glass-border">
                    Laisser un avis
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RenterHistory;
