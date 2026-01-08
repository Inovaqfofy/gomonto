import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCcw, Home, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ServerError = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.reload();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center animate-pulse">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-destructive/30 to-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-destructive" />
            </div>
          </div>
          {/* Decorative rings */}
          <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full border border-destructive/20 animate-ping" style={{ animationDuration: "3s" }} />
        </div>

        {/* Error Code */}
        <div className="mb-6">
          <h1 className="text-8xl font-bold bg-gradient-to-r from-destructive to-destructive/60 bg-clip-text text-transparent">
            500
          </h1>
          <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-destructive/50 to-transparent mt-2" />
        </div>

        {/* Message */}
        <h2 className="text-2xl font-semibold mb-3">
          Oups ! Une erreur est survenue
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Notre équipe technique a été automatiquement notifiée. 
          Nous travaillons à résoudre ce problème le plus rapidement possible.
        </p>

        {/* Auto-refresh indicator */}
        <div className="mb-8 p-4 rounded-xl glass border border-glass-border">
          <div className="flex items-center justify-center gap-3">
            <RefreshCcw className="w-5 h-5 text-primary animate-spin" style={{ animationDuration: "3s" }} />
            <span className="text-sm text-muted-foreground">
              Actualisation automatique dans <span className="text-primary font-semibold">{countdown}s</span>
            </span>
          </div>
          <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000"
              style={{ width: `${((30 - countdown) / 30) * 100}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Réessayer maintenant
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Retour à l'accueil
          </Button>
        </div>

        {/* Support Contact */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">
            Si le problème persiste, contactez notre support :
          </p>
          <a 
            href="mailto:support@gomonto.com" 
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Mail className="w-4 h-4" />
            support@gomonto.com
          </a>
        </div>

        {/* Branding */}
        <div className="mt-8 opacity-50">
          <img 
            src="/logo.png" 
            alt="GoMonto" 
            className="h-8 mx-auto grayscale"
          />
        </div>
      </div>
    </div>
  );
};

export default ServerError;
