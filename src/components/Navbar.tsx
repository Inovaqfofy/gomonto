import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, LogOut, User, LayoutDashboard, ChevronRight, Car, Building2, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import LanguageSwitcher from "./LanguageSwitcher";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { isAdmin, isOwner, isRenter, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Determine button config based on user type
  const getDashboardButton = () => {
    if (isAdmin) {
      return {
        label: t("nav.adminSpace"),
        icon: Shield,
        className: "text-destructive bg-destructive/10 hover:bg-destructive/20"
      };
    }
    if (isOwner) {
      return {
        label: t("nav.ownerSpace"),
        icon: Building2,
        className: "text-primary bg-primary/10 hover:bg-primary/20"
      };
    }
    // Default for renter or unspecified profile
    return {
      label: t("nav.renterSpace"),
      icon: Car,
      className: "text-secondary bg-secondary/10 hover:bg-secondary/20"
    };
  };

  const dashboardButton = getDashboardButton();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const navLinks = [
    { href: "/vehicules", label: t("nav.vehicles") },
    { href: "/loueurs", label: t("nav.owners") },
    { href: "/fonctionnement", label: t("nav.howItWorks") },
    { href: "/devenir-loueur", label: t("nav.becomeOwner") }];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={logo} alt="GoMonto" className="h-9 md:h-11" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            
            {user ? (
              <>
                <Link
                  to="/vehicules"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 transition-all"
                >
                  <Car className="w-4 h-4" />
                  {t("nav.findCar")}
                </Link>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${dashboardButton.className}`}
                >
                  <dashboardButton.icon className="w-4 h-4" />
                  {dashboardButton.label}
                </Link>
                <div className="flex items-center gap-2 pl-3 border-l border-border">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-glow-primary">
                    <User className="w-4 h-4" />
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title={t("nav.logout")}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/vehicules"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-all"
                >
                  <Car className="w-4 h-4" />
                  {t("nav.findCar")}
                </Link>
                <Link
                  to="/auth"
                  className="btn-primary-glow flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-primary-foreground"
                >
                  <Building2 className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{t("nav.ownerSpace")}</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl text-foreground hover:bg-muted transition-colors touch-target"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute left-0 right-0 top-16 bg-card border-b border-border shadow-soft-xl animate-fade-in">
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between py-3 px-4 rounded-xl text-foreground font-medium hover:bg-muted transition-colors touch-target"
                >
                  {link.label}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
              
              <div className="pt-4 mt-4 border-t border-border space-y-2">
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center justify-between py-3 px-4 rounded-xl font-semibold touch-target ${dashboardButton.className}`}
                    >
                      <span className="flex items-center gap-2">
                        <dashboardButton.icon className="w-5 h-5" />
                        {dashboardButton.label}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full py-3 px-4 rounded-xl text-destructive font-medium hover:bg-destructive/10 transition-colors touch-target"
                    >
                      <LogOut className="w-5 h-5" />
                      {t("nav.logout")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/vehicules"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-foreground bg-muted transition-colors touch-target"
                    >
                      <Car className="w-5 h-5" />
                      {t("nav.findCar")}
                    </Link>
                    <Link
                      to="/auth"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-2 btn-primary-glow py-3.5 px-4 rounded-xl font-bold text-primary-foreground touch-target"
                    >
                      <Building2 className="w-5 h-5 relative z-10" />
                      <span className="relative z-10">{t("nav.ownerSpace")}</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
