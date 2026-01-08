import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from '@/lib/supabase';
import { 
  Car, 
  Gauge, 
  AlertTriangle, 
  Shield, 
  MapPin, 
  TrendingUp,
  Activity,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SafeDriveSession {
  id: string;
  reservation_id: string;
  vehicle_id: string;
  renter_id: string;
  is_active: boolean;
  current_speed: number;
  max_speed_recorded: number;
  avg_speed: number;
  harsh_braking_count: number;
  harsh_acceleration_count: number;
  sharp_turn_count: number;
  shock_detected_count: number;
  overall_score: number;
  current_behavior: 'safe' | 'moderate' | 'risky' | 'dangerous';
  total_distance_km: number;
  session_start: string;
  last_location_lat: number | null;
  last_location_lng: number | null;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  registration_number?: string;
}

interface Renter {
  id: string;
  full_name: string;
  phone: string;
}

const behaviorConfig = {
  safe: {
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/30",
    label: "Prudente",
    icon: Shield,
  },
  moderate: {
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-500/30",
    label: "Modérée",
    icon: Activity,
  },
  risky: {
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/30",
    label: "Risquée",
    icon: AlertTriangle,
  },
  dangerous: {
    color: "text-red-500",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/30",
    label: "Dangereuse",
    icon: AlertTriangle,
  },
};

export const SafeDriveMonitor = () => {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<(SafeDriveSession & { vehicle?: Vehicle; renter?: Renter })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveSessions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('safe-drive-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'safe_drive_sessions',
        },
        (payload) => {
          console.log('Safe drive update:', payload);
          if (payload.eventType === 'UPDATE') {
            setSessions(prev => 
              prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new as SafeDriveSession } : s)
            );
          } else {
            fetchActiveSessions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('safe_drive_sessions')
        .select(`
          *,
          vehicles:vehicle_id (id, brand, model, registration_number),
          profiles:renter_id (id, full_name, phone)
        `)
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .order('session_start', { ascending: false });

      if (error) throw error;

      const formattedSessions = (data || []).map((session: any) => ({
        ...session,
        vehicle: session.vehicles,
        renter: session.profiles,
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Error fetching safe drive sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-500";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {t('safeDrive.title', 'Safe-Drive Monitoring')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-muted/20 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {t('safeDrive.title', 'Safe-Drive Monitoring')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {t('safeDrive.noActiveSessions', 'Aucune location avec Safe-Drive active')}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {t('safeDrive.noActiveSessionsDesc', 'Les données de conduite apparaîtront ici pendant les locations')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="border-b border-glass-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            {t('safeDrive.title', 'Safe-Drive Monitoring')}
            <Badge variant="secondary" className="ml-2">
              {sessions.length} {t('safeDrive.active', 'actives')}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchActiveSessions}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.refresh', 'Actualiser')}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-glass-border">
          {sessions.map((session) => {
            const behavior = behaviorConfig[session.current_behavior];
            const BehaviorIcon = behavior.icon;
            const isExpanded = expandedSession === session.id;

            return (
              <div key={session.id} className="p-4">
                {/* Session Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Behavior Indicator */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      behavior.bgColor
                    )}>
                      <BehaviorIcon className={cn("w-6 h-6", behavior.color)} />
                    </div>

                    {/* Vehicle & Driver Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {session.vehicle?.brand} {session.vehicle?.model}
                        </span>
                        <Badge className={cn("text-[10px]", behavior.bgColor, behavior.color)}>
                          {behavior.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.renter?.full_name || 'Locataire'}
                      </p>
                    </div>
                  </div>

                  {/* Score & Speed */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg font-bold">{session.current_speed} km/h</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Max: {session.max_speed_recorded} km/h
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={cn("text-2xl font-bold", getScoreColor(session.overall_score))}>
                        {session.overall_score}
                      </span>
                      <p className="text-xs text-muted-foreground">/100</p>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-glass-border animate-fade-in">
                    {/* Score Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Score de conduite</span>
                        <span className={getScoreColor(session.overall_score)}>{session.overall_score}/100</span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all", getProgressColor(session.overall_score))}
                          style={{ width: `${session.overall_score}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-muted/20">
                        <p className="text-xs text-muted-foreground mb-1">Distance</p>
                        <p className="font-semibold">{session.total_distance_km.toFixed(1)} km</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/20">
                        <p className="text-xs text-muted-foreground mb-1">Vitesse moy.</p>
                        <p className="font-semibold">{session.avg_speed} km/h</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/20">
                        <p className="text-xs text-muted-foreground mb-1">Début</p>
                        <p className="font-semibold text-sm">
                          {format(new Date(session.session_start), "HH:mm", { locale: fr })}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/20">
                        <p className="text-xs text-muted-foreground mb-1">Durée</p>
                        <p className="font-semibold text-sm">
                          {Math.round((Date.now() - new Date(session.session_start).getTime()) / 60000)} min
                        </p>
                      </div>
                    </div>

                    {/* Events Count */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className={cn(
                        "p-2 rounded-lg text-center",
                        session.harsh_braking_count > 0 ? "bg-orange-500/20 text-orange-400" : "bg-muted/20 text-muted-foreground"
                      )}>
                        <p className="text-lg font-bold">{session.harsh_braking_count}</p>
                        <p className="text-[10px]">Freinages</p>
                      </div>
                      <div className={cn(
                        "p-2 rounded-lg text-center",
                        session.harsh_acceleration_count > 0 ? "bg-orange-500/20 text-orange-400" : "bg-muted/20 text-muted-foreground"
                      )}>
                        <p className="text-lg font-bold">{session.harsh_acceleration_count}</p>
                        <p className="text-[10px]">Accélérations</p>
                      </div>
                      <div className={cn(
                        "p-2 rounded-lg text-center",
                        session.sharp_turn_count > 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-muted/20 text-muted-foreground"
                      )}>
                        <p className="text-lg font-bold">{session.sharp_turn_count}</p>
                        <p className="text-[10px]">Virages</p>
                      </div>
                      <div className={cn(
                        "p-2 rounded-lg text-center",
                        session.shock_detected_count > 0 ? "bg-red-500/20 text-red-500" : "bg-muted/20 text-muted-foreground"
                      )}>
                        <p className="text-lg font-bold">{session.shock_detected_count}</p>
                        <p className="text-[10px]">Chocs</p>
                      </div>
                    </div>

                    {/* Location if available */}
                    {session.last_location_lat && session.last_location_lng && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>
                          Position: {session.last_location_lat.toFixed(4)}, {session.last_location_lng.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SafeDriveMonitor;
