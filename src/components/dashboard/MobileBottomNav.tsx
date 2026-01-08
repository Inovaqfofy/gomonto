import { LayoutDashboard, Car, ClipboardList, MessageCircle, User, Wallet, Plus } from "lucide-react";
import type { DashboardView, RenterDashboardView } from "@/pages/Dashboard";

interface MobileBottomNavProps {
  currentView: DashboardView | RenterDashboardView;
  onNavigate: (view: DashboardView | RenterDashboardView) => void;
  profileType: "loueur" | "locataire" | "chauffeur";
}

const ownerTabs = [
  { id: "overview" as DashboardView, icon: LayoutDashboard, label: "Accueil" },
  { id: "fleet" as DashboardView, icon: Car, label: "Flotte" },
  { id: "add-vehicle" as DashboardView, icon: Plus, label: "Ajouter", featured: true },
  { id: "reservations" as DashboardView, icon: ClipboardList, label: "Résa" },
  { id: "wallet" as DashboardView, icon: Wallet, label: "Wallet" }];

const renterTabs = [
  { id: "renter-overview" as RenterDashboardView, icon: LayoutDashboard, label: "Accueil" },
  { id: "renter-vehicles" as RenterDashboardView, icon: Car, label: "Véhicules" },
  { id: "renter-reservations" as RenterDashboardView, icon: ClipboardList, label: "Résa" },
  { id: "renter-messages" as RenterDashboardView, icon: MessageCircle, label: "Messages" },
  { id: "renter-referral" as RenterDashboardView, icon: User, label: "Profil" }];

const MobileBottomNav = ({ currentView, onNavigate, profileType }: MobileBottomNavProps) => {
  const tabs = profileType === "loueur" ? ownerTabs : renterTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-nav border-t border-glass-border safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = currentView === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors touch-target ${
                tab.featured ? "relative" : ""
              }`}
            >
              {tab.featured ? (
                <div className="absolute -top-5 btn-primary-glow w-14 h-14 rounded-full flex items-center justify-center shadow-lg">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
              ) : (
                <>
                  <Icon
                    className={`w-5 h-5 mb-1 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-[10px] ${
                      isActive ? "text-primary font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
