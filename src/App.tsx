import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import LanguageRouteWrapper from "./components/LanguageRouteWrapper";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import KYC from "./pages/KYC";
import Dashboard from "./pages/Dashboard";
import Legal from "./pages/Legal";
import Vehicles from "./pages/Vehicles";
import VehicleDetail from "./pages/VehicleDetail";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import BecomeOwner from "./pages/BecomeOwner";
import FleetEnterprise from "./pages/FleetEnterprise";
import CertifiedDrivers from "./pages/CertifiedDrivers";
import CreditPricing from "./pages/CreditPricing";
import Contact from "./pages/Contact";
import OwnerStorefront from "./pages/OwnerStorefront";
import Owners from "./pages/Owners";
import ApiDocumentation from "./pages/ApiDocumentation";
import ServerError from "./pages/ServerError";
import NotFound from "./pages/NotFound";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import MontoChatbot from "./components/chatbot/MontoChatbot";

const queryClient = new QueryClient();

// Disable console in production
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  // Keep console.error and console.warn for critical issues
}

// All routes for the app
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/kyc" element={<KYC />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/legal" element={<Legal />} />
    <Route path="/vehicules" element={<Vehicles />} />
    <Route path="/vehicule/:id" element={<VehicleDetail />} />
    <Route path="/loueur/:slug" element={<OwnerStorefront />} />
    <Route path="/loueurs" element={<Owners />} />
    <Route path="/fonctionnement" element={<HowItWorks />} />
    <Route path="/a-propos" element={<About />} />
    <Route path="/devenir-loueur" element={<BecomeOwner />} />
    <Route path="/flotte-entreprise" element={<FleetEnterprise />} />
    <Route path="/chauffeurs-certifies" element={<CertifiedDrivers />} />
    <Route path="/tarifs-credits" element={<CreditPricing />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/api-docs" element={<ApiDocumentation />} />
    <Route path="/payment/confirmation" element={<PaymentConfirmation />} />
    <Route path="/erreur-serveur" element={<ServerError />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Language-prefixed routes for SEO */}
              <Route path="/en/*" element={
                <LanguageRouteWrapper>
                  <AppRoutes />
                </LanguageRouteWrapper>
              } />
              <Route path="/pt/*" element={
                <LanguageRouteWrapper>
                  <AppRoutes />
                </LanguageRouteWrapper>
              } />
              
              {/* Default French routes (no prefix) */}
              <Route path="/*" element={
                <LanguageRouteWrapper>
                  <AppRoutes />
                </LanguageRouteWrapper>
              } />
            </Routes>
            <MontoChatbot />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
