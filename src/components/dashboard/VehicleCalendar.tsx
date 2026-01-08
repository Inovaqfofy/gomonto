import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Wrench, X, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface VehicleCalendarProps {
  vehicleId: string | null;
  onBack: () => void;
}

interface BlockedDate {
  id: string;
  blocked_date: string;
  reason: string;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
}

const VehicleCalendar = ({ vehicleId, onBack }: VehicleCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(vehicleId);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockReason, setBlockReason] = useState("maintenance");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, brand, model")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setVehicles(data);
        if (!selectedVehicleId) {
          setSelectedVehicleId(data[0].id);
        }
      }
      setLoading(false);
    };

    fetchVehicles();
  }, [selectedVehicleId]);

  useEffect(() => {
    if (!selectedVehicleId) return;

    const fetchBlockedDates = async () => {
      const { data } = await supabase
        .from("vehicle_availability")
        .select("*")
        .eq("vehicle_id", selectedVehicleId);

      if (data) {
        setBlockedDates(data);
      }
    };

    fetchBlockedDates();
  }, [selectedVehicleId, currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const isDateBlocked = (date: Date) => {
    return blockedDates.some((bd) => isSameDay(new Date(bd.blocked_date), date));
  };

  const getBlockedInfo = (date: Date) => {
    return blockedDates.find((bd) => isSameDay(new Date(bd.blocked_date), date));
  };

  const handleDateClick = (date: Date) => {
    if (isBefore(date, new Date()) && !isToday(date)) return;
    setSelectedDate(date);
  };

  const handleBlockDate = async () => {
    if (!selectedDate || !selectedVehicleId) return;

    setIsBlocking(true);

    try {
      const existingBlock = getBlockedInfo(selectedDate);

      if (existingBlock) {
        // Unblock
        await supabase
          .from("vehicle_availability")
          .delete()
          .eq("id", existingBlock.id);

        setBlockedDates((prev) => prev.filter((bd) => bd.id !== existingBlock.id));
        toast({
          title: "Date débloquée",
          description: `Le ${format(selectedDate, "d MMMM yyyy", { locale: fr })} est maintenant disponible.`,
        });
      } else {
        // Block
        const { data, error } = await supabase
          .from("vehicle_availability")
          .insert({
            vehicle_id: selectedVehicleId,
            blocked_date: format(selectedDate, "yyyy-MM-dd"),
            reason: blockReason,
          })
          .select()
          .single();

        if (error) throw error;

        setBlockedDates((prev) => [...prev, data]);
        toast({
          title: "Date bloquée",
          description: `Le ${format(selectedDate, "d MMMM yyyy", { locale: fr })} est maintenant indisponible.`,
        });
      }

      setSelectedDate(null);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier la disponibilité.",
        variant: "destructive",
      });
    } finally {
      setIsBlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun véhicule trouvé. Ajoutez d'abord un véhicule.</p>
        <button
          onClick={onBack}
          className="mt-4 btn-primary-glow px-6 py-2 rounded-xl text-primary-foreground"
        >
          <span className="relative z-10">Retour</span>
        </button>
      </div>
    );
  }

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-primary/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Calendrier</h1>
          <p className="text-muted-foreground">Gérez les disponibilités de votre véhicule</p>
        </div>
      </div>

      {/* Vehicle Selector */}
      <div className="glass-card p-4 border border-glass-border">
        <label className="block text-sm text-muted-foreground mb-2">Véhicule</label>
        <select
          value={selectedVehicleId || ""}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none bg-transparent"
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar */}
      <div className="glass-card p-6 border border-glass-border relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        
        <div className="relative">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
              <div key={day} className="text-center text-sm text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {days.map((day) => {
              const blocked = isDateBlocked(day);
              const blockedInfo = getBlockedInfo(day);
              const isPast = isBefore(day, new Date()) && !isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  disabled={isPast}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all relative ${
                    isPast
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : isSelected
                      ? "ring-2 ring-primary bg-primary/10"
                      : blocked
                      ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                      : isToday(day)
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted"
                  }`}
                >
                  <span>{format(day, "d")}</span>
                  {blocked && (
                    <Wrench className="w-3 h-3 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-glass-border text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/10" />
              <span className="text-muted-foreground">Aujourd'hui</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-destructive/20" />
              <span className="text-muted-foreground">Indisponible</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Action */}
      {selectedDate && (
        <div className="glass-card p-6 border border-glass-border animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold capitalize">
                {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isDateBlocked(selectedDate) ? "Actuellement indisponible" : "Actuellement disponible"}
              </p>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isDateBlocked(selectedDate) && (
            <div className="mb-4">
              <label className="block text-sm text-muted-foreground mb-2">Raison</label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass border border-glass-border focus:border-primary focus:outline-none bg-transparent"
              >
                <option value="maintenance">Maintenance</option>
                <option value="personal">Usage personnel</option>
                <option value="other">Autre</option>
              </select>
            </div>
          )}

          <button
            onClick={handleBlockDate}
            disabled={isBlocking}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
              isDateBlocked(selectedDate)
                ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
            } transition-colors`}
          >
            {isBlocking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isDateBlocked(selectedDate) ? (
              "Rendre disponible"
            ) : (
              "Bloquer cette date"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default VehicleCalendar;
