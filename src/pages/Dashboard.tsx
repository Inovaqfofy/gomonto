import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/hooks/useAuth";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import RenterDashboardOverview from "@/components/dashboard/RenterDashboardOverview";
import RenterReservations from "@/components/dashboard/RenterReservations";
import RenterHistory from "@/components/dashboard/RenterHistory";
import RenterVehicleSearch from "@/components/dashboard/RenterVehicleSearch";
import FleetManagement from "@/components/dashboard/FleetManagement";
import AddVehicle from "@/components/dashboard/AddVehicle";
import VehicleCalendar from "@/components/dashboard/VehicleCalendar";
import PaymentSettings from "@/components/dashboard/PaymentSettings";
import EnhancedReservations from "@/components/dashboard/EnhancedReservations";
import WalletManager from "@/components/dashboard/WalletManager";
import DocumentVault from "@/components/dashboard/DocumentVault";
import AdvancedPaymentSettings from "@/components/dashboard/AdvancedPaymentSettings";
import MessagingCenter from "@/components/messaging/MessagingCenter";
import ReferralDashboard from "@/components/referral/ReferralDashboard";
import SafeHubButton from "@/components/safehub/SafeHubButton";
import DamageComparison from "@/components/ai-vision/DamageComparison";
import DriverPool from "@/components/drivers/DriverPool";
import GeofenceManager from "@/components/geofencing/GeofenceManager";
import DynamicPricing from "@/components/pricing/DynamicPricing";
import StorefrontEditor from "@/components/dashboard/StorefrontEditor";
import AdvancedAnalytics from "@/components/dashboard/AdvancedAnalytics";
import RenterReliabilityScore from "@/components/dashboard/RenterReliabilityScore";
import VehicleQRCode from "@/components/dashboard/VehicleQRCode";
import RenterBlacklist from "@/components/dashboard/RenterBlacklist";
import OwnerReminders from "@/components/dashboard/OwnerReminders";
import LoyaltyProgramManager from "@/components/dashboard/LoyaltyProgramManager";
import DigitalContractManager from "@/components/dashboard/DigitalContractManager";
import B2BMarketplace from "@/components/dashboard/B2BMarketplace";
import AIRevenuePredictions from "@/components/dashboard/AIRevenuePredictions";
import FleetRecommendations from "@/components/dashboard/FleetRecommendations";
import OwnerAPIKeys from "@/components/dashboard/OwnerAPIKeys";
import PaymentConfirmation from "@/components/dashboard/PaymentConfirmation";
import SubscriptionManager from "@/components/dashboard/SubscriptionManager";
import OwnerAccountManager from "@/components/dashboard/OwnerAccountManager";
import SafeDriveMonitor from "@/components/dashboard/SafeDriveMonitor";
import TrustScoreCard from "@/components/dashboard/TrustScoreCard";
import KYCVerificationPanel from "@/components/admin/KYCVerificationPanel";
import AdminDashboardOverview from "@/components/admin/AdminDashboardOverview";
import AdminUsersManagement from "@/components/admin/AdminUsersManagement";
import AdminVehiclesManagement from "@/components/admin/AdminVehiclesManagement";
import AdminReservationsManagement from "@/components/admin/AdminReservationsManagement";
import AdminDisputeCenter from "@/components/admin/AdminDisputeCenter";
import AdminFinanceDashboard from "@/components/admin/AdminFinanceDashboard";
import AdminContentManagement from "@/components/admin/AdminContentManagement";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminGuaranteesTracking from "@/components/admin/AdminGuaranteesTracking";
import OwnerReservationDetails from "@/components/dashboard/OwnerReservationDetails";
import ComplianceManager from "@/components/dashboard/ComplianceManager";
import PendingPaymentRecovery from "@/components/dashboard/PendingPaymentRecovery";
import { SidebarProvider } from "@/components/ui/sidebar";

// Owner dashboard views
export type DashboardView = "overview" | "fleet" | "add-vehicle" | "calendar" | "payments" | "reservations" | "reservation-details" | "wallet" | "account" | "messages" | "referral" | "drivers" | "geofencing" | "pricing" | "vault" | "payment-gateway" | "storefront" | "analytics" | "reliability" | "qr-codes" | "blacklist" | "reminders" | "loyalty" | "contracts" | "b2b" | "predictions" | "recommendations" | "api-keys" | "payment-confirm" | "subscription" | "kyc-admin" | "safe-drive" | "trust-score" | "compliance" | "damage-check" | "admin-overview" | "admin-users" | "admin-vehicles" | "admin-reservations" | "admin-disputes" | "admin-finance" | "admin-content" | "admin-settings" | "admin-guarantees";

// Renter dashboard views
export type RenterDashboardView = "renter-overview" | "renter-reservations" | "renter-history" | "renter-messages" | "renter-referral" | "renter-vehicles";

type ProfileType = "loueur" | "locataire" | "chauffeur";

interface ActiveRental {
  reservationId: string;
  vehicleId: string;
  country: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<DashboardView | RenterDashboardView>("overview");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [activeRental, setActiveRental] = useState<ActiveRental | null>(null);
  const [profileType, setProfileType] = useState<ProfileType>("locataire");
  const [profileLoading, setProfileLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      
      // Check if user is admin
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      if (adminRole) {
        setIsAdmin(true);
        setCurrentView("admin-overview");
        setProfileLoading(false);
        return;
      }
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_type, country")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setProfileType(profile.profile_type as ProfileType);
        
        // Set initial view based on profile type
        if (profile.profile_type === "locataire") {
          setCurrentView("renter-overview");
        } else {
          setCurrentView("overview");
        }
      }

      // Check for active rental (as renter or owner)
      const today = new Date().toISOString().split("T")[0];
      const { data: activeReservation } = await supabase
        .from("reservations")
        .select(`
          id,
          vehicle_id,
          vehicles!inner(location_country)
        `)
        .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
        .in("status", ["confirmed", "guaranteed"])
        .lte("start_date", today)
        .gte("end_date", today)
        .limit(1)
        .maybeSingle();

      if (activeReservation) {
        setActiveRental({
          reservationId: activeReservation.id,
          vehicleId: activeReservation.vehicle_id,
          country: (activeReservation.vehicles as any)?.location_country || profile?.country || "senegal",
        });
      }

      setProfileLoading(false);
    };

    checkProfile();
  }, [user]);

  const handleOpenCalendar = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setCurrentView("calendar");
  };

  const handleNavigate = (view: DashboardView | RenterDashboardView) => {
    setCurrentView(view);
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const renderOwnerView = () => {
    switch (currentView as DashboardView) {
      case "overview":
        return <DashboardOverview userId={user.id} onNavigate={handleNavigate} />;
      case "fleet":
        return <FleetManagement 
          userId={user.id} 
          onOpenCalendar={handleOpenCalendar} 
          onAddVehicle={() => setCurrentView("add-vehicle")}
          onEditVehicle={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setCurrentView("compliance");
          }}
          onVehicleSettings={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
          }}
          onDamageCheck={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setCurrentView("damage-check");
          }}
          onManageDrivers={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setCurrentView("drivers");
          }}
          onConfigureGeofencing={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setCurrentView("geofencing");
          }}
          onDynamicPricing={(vehicleId) => {
            setSelectedVehicleId(vehicleId);
            setCurrentView("pricing");
          }}
        />;
      case "add-vehicle":
        return <AddVehicle userId={user.id} onComplete={() => setCurrentView("fleet")} />;
      case "calendar":
        return <VehicleCalendar vehicleId={selectedVehicleId} onBack={() => setCurrentView("fleet")} />;
      case "payments":
        return <PaymentSettings userId={user.id} />;
      case "reservations":
        return <EnhancedReservations userId={user.id} />;
      case "wallet":
        return <WalletManager userId={user.id} />;
      case "account":
        return <OwnerAccountManager ownerId={user.id} />;
      case "messages":
        return <MessagingCenter />;
      case "referral":
        return <ReferralDashboard userId={user.id} userType="owner" />;
      case "damage-check":
        return selectedVehicleId ? (
          <DamageComparison reservationId="" vehicleId={selectedVehicleId} />
        ) : (
          <div className="text-center py-8 text-muted-foreground">Sélectionnez un véhicule depuis "Ma Flotte"</div>
        );
      case "drivers":
        return selectedVehicleId ? (
          <DriverPool vehicleId={selectedVehicleId} ownerId={user.id} />
        ) : (
          <div className="text-center py-8 text-muted-foreground">Sélectionnez un véhicule pour voir les chauffeurs</div>
        );
      case "geofencing":
        return selectedVehicleId ? (
          <GeofenceManager vehicleId={selectedVehicleId} />
        ) : (
          <div className="text-center py-8 text-muted-foreground">Sélectionnez un véhicule pour configurer le geofencing</div>
        );
      case "pricing":
        return selectedVehicleId ? (
          <DynamicPricing vehicleId={selectedVehicleId} currentPrice={25000} country={activeRental?.country || "senegal"} />
        ) : (
          <div className="text-center py-8 text-muted-foreground">Sélectionnez un véhicule pour voir les suggestions de prix</div>
        );
      case "vault":
        return <DocumentVault userId={user.id} />;
      case "payment-gateway":
        return <AdvancedPaymentSettings userId={user.id} />;
      case "storefront":
        return <StorefrontEditor />;
      case "analytics":
        return <AdvancedAnalytics userId={user.id} />;
      case "reliability":
        return selectedVehicleId ? (
          <RenterReliabilityScore renterId={selectedVehicleId} showDetails={true} />
        ) : (
          <div className="text-center py-8 text-muted-foreground">Sélectionnez un locataire depuis les réservations</div>
        );
      case "qr-codes":
        return selectedVehicleId ? (
          <VehicleQRCode vehicleId={selectedVehicleId} vehicleName="Véhicule" />
        ) : (
          <div className="text-center py-8 text-muted-foreground">Sélectionnez un véhicule depuis Ma Flotte</div>
        );
      case "blacklist":
        return <RenterBlacklist ownerId={user.id} />;
      case "reminders":
        return <OwnerReminders ownerId={user.id} />;
      case "loyalty":
        return <LoyaltyProgramManager ownerId={user.id} />;
      case "contracts":
        return <DigitalContractManager ownerId={user.id} />;
      case "b2b":
        return <B2BMarketplace ownerId={user.id} />;
      case "predictions":
        return <AIRevenuePredictions ownerId={user.id} />;
      case "recommendations":
        return <FleetRecommendations ownerId={user.id} />;
      case "api-keys":
        return <OwnerAPIKeys ownerId={user.id} />;
      case "payment-confirm":
        return <PaymentConfirmation ownerId={user.id} />;
      case "subscription":
        return <SubscriptionManager ownerId={user.id} />;
      case "kyc-admin":
        return <KYCVerificationPanel />;
      case "safe-drive":
        return <SafeDriveMonitor />;
      case "trust-score":
        return <TrustScoreCard />;
      case "compliance":
        return <ComplianceManager userId={user.id} onNavigate={handleNavigate} onBack={() => setCurrentView("overview")} />;
      default:
        return <DashboardOverview userId={user.id} onNavigate={handleNavigate} />;
    }
  };

  const renderRenterView = () => {
    switch (currentView as RenterDashboardView) {
      case "renter-overview":
        return <RenterDashboardOverview userId={user.id} onNavigate={handleNavigate} />;
      case "renter-vehicles":
        return <RenterVehicleSearch userId={user.id} onNavigate={handleNavigate} />;
      case "renter-reservations":
        return <RenterReservations userId={user.id} onNavigate={handleNavigate} />;
      case "renter-history":
        return <RenterHistory userId={user.id} />;
      case "renter-messages":
        return <MessagingCenter />;
      case "renter-referral":
        return <ReferralDashboard userId={user.id} userType="renter" />;
      default:
        return <RenterDashboardOverview userId={user.id} onNavigate={handleNavigate} />;
    }
  };

  const renderAdminView = () => {
    switch (currentView as DashboardView) {
      case "admin-overview":
        return <AdminDashboardOverview onNavigate={handleNavigate} />;
      case "admin-users":
        return <AdminUsersManagement />;
      case "admin-vehicles":
        return <AdminVehiclesManagement />;
      case "admin-reservations":
        return <AdminReservationsManagement />;
      case "admin-disputes":
        return <AdminDisputeCenter />;
      case "admin-finance":
        return <AdminFinanceDashboard />;
      case "admin-content":
        return <AdminContentManagement />;
      case "admin-settings":
        return <AdminSettings />;
      case "admin-guarantees":
        return <AdminGuaranteesTracking />;
      case "kyc-admin":
        return <KYCVerificationPanel />;
      default:
        return <AdminDashboardOverview onNavigate={handleNavigate} />;
    }
  };

  const renderView = () => {
    // Admin users always see admin views
    if (isAdmin) {
      return renderAdminView();
    }
    if (profileType === "loueur") {
      return renderOwnerView();
    } else {
      return renderRenterView();
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col md:flex-row w-full">
        <DashboardSidebar 
          currentView={currentView} 
          onNavigate={handleNavigate} 
          profileType={profileType}
          isAdmin={isAdmin}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-28 md:pb-8 overflow-x-hidden">
          <div className="max-w-full">
            <PendingPaymentRecovery />
            {renderView()}
          </div>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav 
          currentView={currentView}
          onNavigate={handleNavigate}
          profileType={profileType}
        />
        
        {/* Safe-Hub Button - visible only during active rental */}
        <SafeHubButton
          isActiveRental={!!activeRental}
          reservationId={activeRental?.reservationId}
          vehicleId={activeRental?.vehicleId}
          userId={user.id}
          country={activeRental?.country}
        />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
