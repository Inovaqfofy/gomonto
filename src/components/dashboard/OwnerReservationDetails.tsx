import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, User, Car, Calendar, Phone, MessageSquare,
  Activity, AlertTriangle, CheckCircle, Clock, Eye,
  DollarSign, FileText, MapPin, Wallet, Camera
} from "lucide-react";
import SmartDeposit from "@/components/deposits/SmartDeposit";
import DamageComparison from "@/components/ai-vision/DamageComparison";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TrustScoreBadge } from "@/components/trust/TrustScoreBadge";
import { formatCurrency } from "@/lib/currency";
import StartConversationButton from "@/components/messaging/StartConversationButton";
import type { DashboardView } from "@/pages/Dashboard";

interface OwnerReservationDetailsProps {
  reservationId: string;
  onNavigate: (view: DashboardView) => void;
  onBack: () => void;
}

interface ReservationDetails {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  deposit_amount: number;
  deposit_paid: boolean;
  deposit_mode: "direct" | "gomonto" | "digital_guarantee";
  status: string;
  has_digital_guarantee: boolean;
  guarantee_cost: number;
  renter_phone: string;
  renter_message: string;
  created_at: string;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    self_drive_allowed: boolean;
  };
  renter: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
  trust_score?: {
    total_score: number;
    level: string;
    successful_rentals: number;
    avg_drive_score: number;
  };
  safe_drive_session?: {
    id: string;
    is_active: boolean;
    overall_score: number;
    current_behavior: string;
  };
}

const OwnerReservationDetails = ({ reservationId, onNavigate, onBack }: OwnerReservationDetailsProps) => {
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservationDetails();
  }, [reservationId]);

  const fetchReservationDetails = async () => {
    try {
      // Fetch reservation with vehicle and renter info
      const { data: resData } = await supabase
        .from("reservations")
        .select(`
          *,
          vehicles(id, brand, model, self_drive_allowed),
          profiles!reservations_renter_id_fkey(id, full_name, email, phone, user_id)
        `)
        .eq("id", reservationId)
        .single();

      if (resData) {
        // Fetch trust score for renter
        const renterId = (resData.profiles as any)?.user_id;
        let trustScore = null;
        
        if (renterId) {
          const { data: trustData } = await supabase
            .from("driver_trust_scores")
            .select("total_score, level, successful_rentals, avg_drive_score")
            .eq("user_id", renterId)
            .single();
          
          trustScore = trustData;
        }

        // Fetch active safe drive session
        const { data: sessionData } = await supabase
          .from("safe_drive_sessions")
          .select("id, is_active, overall_score, current_behavior")
          .eq("reservation_id", reservationId)
          .eq("is_active", true)
          .maybeSingle();

        setReservation({
          ...resData,
          deposit_mode: (resData.deposit_mode as "direct" | "gomonto" | "digital_guarantee") || "direct",
          vehicle: resData.vehicles as any,
          renter: resData.profiles as any,
          trust_score: trustScore || undefined,
          safe_drive_session: sessionData || undefined,
        });
      }
    } catch (error) {
      console.error("Error fetching reservation details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <Card className="glass-card border-glass-border">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Réservation non trouvée</p>
          <Button variant="outline" className="mt-4" onClick={onBack}>
            Retour
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isGuaranteed = reservation.has_digital_guarantee;
  const hasSafeDrive = reservation.vehicle.self_drive_allowed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Détails de la réservation
          </h1>
          <p className="text-muted-foreground">
            {reservation.vehicle.brand} {reservation.vehicle.model}
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Retour aux réservations
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="glass-card border-glass-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Informations de location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Période</p>
                <p className="font-medium">
                  {format(new Date(reservation.start_date), "d MMM", { locale: fr })} - {format(new Date(reservation.end_date), "d MMM yyyy", { locale: fr })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Montant total</p>
                <p className="font-medium text-lg">{formatCurrency(reservation.total_price)}</p>
              </div>
            </div>

            {/* Deposit Status */}
            <div className="p-4 rounded-xl bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type de caution</span>
                {isGuaranteed ? (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    <Shield className="w-3 h-3 mr-1" />
                    Garantie Digitale
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <DollarSign className="w-3 h-3 mr-1" />
                    Caution classique
                  </Badge>
                )}
              </div>

              {isGuaranteed ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Coût garantie</span>
                  <span className="font-medium text-emerald-500">{formatCurrency(reservation.guarantee_cost)}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Montant caution</span>
                    <span className="font-medium">{formatCurrency(reservation.deposit_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Statut</span>
                    {reservation.deposit_paid ? (
                      <Badge className="bg-green-500/10 text-green-500">Payée</Badge>
                    ) : (
                      <Badge className="bg-yellow-500/10 text-yellow-500">En attente</Badge>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Safe Drive Status */}
            {hasSafeDrive && (
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Safe-Drive Scoring</span>
                  </div>
                  {reservation.safe_drive_session?.is_active ? (
                    <Badge className="bg-green-500/10 text-green-500 animate-pulse">
                      En cours
                    </Badge>
                  ) : (
                    <Badge variant="outline">Inactif</Badge>
                  )}
                </div>

                {reservation.safe_drive_session && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Score actuel</span>
                      <span className={`font-bold ${
                        reservation.safe_drive_session.overall_score >= 80 ? "text-green-500" :
                        reservation.safe_drive_session.overall_score >= 60 ? "text-yellow-500" : "text-red-500"
                      }`}>
                        {Math.round(reservation.safe_drive_session.overall_score)}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Comportement</span>
                      <Badge variant="outline" className="capitalize">
                        {reservation.safe_drive_session.current_behavior}
                      </Badge>
                    </div>
                  </>
                )}

                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onNavigate("safe-drive")}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir le tracking en temps réel
                </Button>
              </div>
            )}

            {reservation.renter_message && (
              <div className="p-4 rounded-xl bg-muted/30">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Message du locataire</p>
                    <p className="text-sm">{reservation.renter_message}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Renter Profile */}
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profil du locataire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center pb-4 border-b border-glass-border">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{reservation.renter.full_name}</h3>
              
              {reservation.trust_score && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <TrustScoreBadge 
                    level={reservation.trust_score.level as any} 
                    score={reservation.trust_score.total_score}
                    showLabel
                  />
                </div>
              )}
            </div>

            {/* Trust Score Details */}
            {reservation.trust_score && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Score de confiance</span>
                  <span className="font-bold">{reservation.trust_score.total_score} pts</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Locations réussies</span>
                  <span className="font-medium">{reservation.trust_score.successful_rentals}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Score conduite moy.</span>
                  <span className="font-medium">{Math.round(reservation.trust_score.avg_drive_score || 100)}/100</span>
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="pt-4 border-t border-glass-border space-y-2">
              {reservation.renter_phone && (
                <a 
                  href={`tel:${reservation.renter_phone}`}
                  className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm">{reservation.renter_phone}</span>
                </a>
              )}
              <StartConversationButton
                targetUserId={reservation.renter.id}
                reservationId={reservation.id}
                vehicleId={reservation.vehicle.id}
                className="w-full"
              >
                Envoyer un message
              </StartConversationButton>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4">
              <Button className="w-full" variant="outline" onClick={() => onNavigate("contracts")}>
                <FileText className="w-4 h-4 mr-2" />
                Générer le contrat
              </Button>
              <Button className="w-full" variant="outline" onClick={() => onNavigate("kyc-admin")}>
                <Eye className="w-4 h-4 mr-2" />
                Voir les documents KYC
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Deposit Section */}
      {!isGuaranteed && (
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Gestion de la caution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SmartDeposit
              reservationId={reservation.id}
              depositAmount={reservation.deposit_amount}
              userId={reservation.renter.id}
              isOwner={true}
              depositMode={reservation.deposit_mode || "direct"}
            />
          </CardContent>
        </Card>
      )}

      {/* IA Vision - Damage Comparison */}
      <Card className="glass-card border-glass-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            État des lieux IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DamageComparison
            reservationId={reservation.id}
            vehicleId={reservation.vehicle.id}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerReservationDetails;
