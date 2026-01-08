import { LayoutDashboard, Car, Plus, Calendar, Home, LogOut, CreditCard, ClipboardList, Wallet, MessageCircle, Gift, Shield, Users, MapPin, TrendingUp, Clock, Star, User, FolderLock, Landmark, Store, BarChart3, UserCheck, QrCode, Ban, Bell, Heart, FileSignature, Building2, BrainCircuit, Lightbulb, Key, CheckCircle, Crown, ShieldCheck, DollarSign, FileText, Settings, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { DashboardView, RenterDashboardView } from "@/pages/Dashboard";
import logo from "@/assets/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

interface DashboardSidebarProps {
  currentView: DashboardView | RenterDashboardView;
  onNavigate: (view: DashboardView | RenterDashboardView) => void;
  profileType: "loueur" | "locataire" | "chauffeur";
  isAdmin?: boolean;
}

// Owner menu items
const ownerMainMenuItems = [
  { id: "overview" as DashboardView, title: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "account" as DashboardView, title: "Mon Compte", icon: Crown },
  { id: "analytics" as DashboardView, title: "Analytics", icon: BarChart3 },
  { id: "messages" as DashboardView, title: "Messages", icon: MessageCircle },
  { id: "fleet" as DashboardView, title: "Ma flotte", icon: Car },
  { id: "reservations" as DashboardView, title: "Réservations", icon: ClipboardList },
  { id: "contracts" as DashboardView, title: "Contrats", icon: FileSignature },
  { id: "add-vehicle" as DashboardView, title: "Ajouter véhicule", icon: Plus },
  { id: "calendar" as DashboardView, title: "Calendrier", icon: Calendar },
  { id: "payments" as DashboardView, title: "Paiements", icon: CreditCard },
  { id: "payment-confirm" as DashboardView, title: "Confirmer Paiements", icon: CheckCircle },
  { id: "referral" as DashboardView, title: "Parrainage", icon: Gift },
  { id: "storefront" as DashboardView, title: "Ma Vitrine", icon: Store },
  { id: "vault" as DashboardView, title: "Coffre-Fort", icon: FolderLock }];

const ownerAdvancedMenuItems = [
  { id: "compliance" as DashboardView, title: "Conformité", icon: ShieldCheck },
  { id: "qr-codes" as DashboardView, title: "QR Codes", icon: QrCode },
  { id: "reminders" as DashboardView, title: "Rappels", icon: Bell }];

const ownerProMenuItems = [
  { id: "reliability" as DashboardView, title: "Score Locataires", icon: UserCheck },
  { id: "blacklist" as DashboardView, title: "Liste Noire", icon: Ban },
  { id: "loyalty" as DashboardView, title: "Fidélité", icon: Heart },
  { id: "b2b" as DashboardView, title: "B2B Marketplace", icon: Building2 },
  { id: "predictions" as DashboardView, title: "Prédictions IA", icon: BrainCircuit },
  { id: "recommendations" as DashboardView, title: "Recommandations", icon: Lightbulb },
  { id: "payment-gateway" as DashboardView, title: "Passerelles", icon: Landmark },
  { id: "api-keys" as DashboardView, title: "API Keys", icon: Key }];

// Admin menu items
const adminMenuItems = [
  { id: "admin-overview" as DashboardView, title: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "admin-users" as DashboardView, title: "Utilisateurs", icon: Users },
  { id: "admin-vehicles" as DashboardView, title: "Véhicules", icon: Car },
  { id: "admin-reservations" as DashboardView, title: "Réservations", icon: ClipboardList },
  { id: "admin-disputes" as DashboardView, title: "Litiges", icon: AlertTriangle },
  { id: "admin-finance" as DashboardView, title: "Finance", icon: DollarSign },
  { id: "admin-guarantees" as DashboardView, title: "Garanties Digitales", icon: Shield },
  { id: "admin-content" as DashboardView, title: "Contenu", icon: FileText },
  { id: "kyc-admin" as DashboardView, title: "Vérification KYC", icon: ShieldCheck },
  { id: "admin-settings" as DashboardView, title: "Configuration", icon: Settings }];

// Renter menu items
const renterMenuItems = [
  { id: "renter-overview" as RenterDashboardView, title: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "renter-vehicles" as RenterDashboardView, title: "Trouver un véhicule", icon: Car },
  { id: "renter-reservations" as RenterDashboardView, title: "Mes réservations", icon: ClipboardList },
  { id: "renter-history" as RenterDashboardView, title: "Historique", icon: Clock },
  { id: "renter-messages" as RenterDashboardView, title: "Messages", icon: MessageCircle },
  { id: "renter-referral" as RenterDashboardView, title: "Parrainage", icon: Gift }];

const profileTypeLabels = {
  loueur: { label: "Loueur", color: "bg-primary/10 text-primary border-primary/20" },
  locataire: { label: "Locataire", color: "bg-secondary/10 text-secondary border-secondary/20" },
  chauffeur: { label: "Chauffeur", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  admin: { label: "Admin GoMonto", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const DashboardSidebar = ({ currentView, onNavigate, profileType, isAdmin = false }: DashboardSidebarProps) => {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Admin users see admin menu
  if (isAdmin) {
    return (
      <Sidebar className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300 glass-nav border-r border-glass-border hidden md:flex flex-col`}>
        <div className="p-4 flex items-center justify-between border-b border-glass-border">
          {!collapsed && (
            <Link to="/">
              <img src={logo} alt="GoMonto" className="h-8" />
            </Link>
          )}
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        </div>

        {!collapsed && (
          <div className="px-4 py-3 border-b border-glass-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-destructive" />
              <Badge className={`${profileTypeLabels.admin.color} border text-xs`}>
                {profileTypeLabels.admin.label}
              </Badge>
            </div>
          </div>
        )}

        <SidebarContent className="py-4">
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs text-muted-foreground px-4 mb-2">
                Administration
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        currentView === item.id
                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <div className="mt-auto p-4 border-t border-glass-border space-y-2">
          <Link
            to="/"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="font-medium">Accueil</span>}
          </Link>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="font-medium">Déconnexion</span>}
          </button>
        </div>
      </Sidebar>
    );
  }

  const isOwner = profileType === "loueur";
  const mainMenuItems = isOwner ? ownerMainMenuItems : renterMenuItems;
  const advancedMenuItems = isOwner ? ownerAdvancedMenuItems : [];
  const proMenuItems = isOwner ? ownerProMenuItems : [];

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300 glass-nav border-r border-glass-border hidden md:flex flex-col`}>
      <div className="p-4 flex items-center justify-between border-b border-glass-border">
        {!collapsed && (
          <Link to="/">
            <img src={logo} alt="GoMonto" className="h-8" />
          </Link>
        )}
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      </div>

      {/* Profile type badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-glass-border">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <Badge className={`${profileTypeLabels[profileType].color} border text-xs`}>
              {profileTypeLabels[profileType].label}
            </Badge>
          </div>
        </div>
      )}

      <SidebarContent className="py-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs text-muted-foreground px-4 mb-2">
              {isOwner ? "Principal" : "Menu"}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      currentView === item.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="font-medium">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {isOwner && advancedMenuItems.length > 0 && (
          <SidebarGroup className="mt-4">
            {!collapsed && <SidebarGroupLabel className="text-xs text-muted-foreground px-4 mb-2">Modules Avancés</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {advancedMenuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        currentView === item.id
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isOwner && proMenuItems.length > 0 && (
          <SidebarGroup className="mt-4">
            {!collapsed && (
              <SidebarGroupLabel className="text-xs px-4 mb-2 flex items-center gap-2">
                <span className="text-primary">✨ Pro</span>
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {proMenuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        currentView === item.id
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <div className="mt-auto p-4 border-t border-glass-border space-y-2">
        <Link
          to="/"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <Home className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="font-medium">Accueil</span>}
        </Link>
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="font-medium">Déconnexion</span>}
        </button>
      </div>
    </Sidebar>
  );
};

export default DashboardSidebar;
