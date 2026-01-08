import { Shield, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface NoDepositBadgeProps {
  variant?: "default" | "small" | "large";
  className?: string;
}

export const NoDepositBadge = ({ variant = "default", className }: NoDepositBadgeProps) => {
  const { t } = useTranslation();

  if (variant === "small") {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "bg-emerald-500/20 text-emerald-400 text-[10px] font-medium",
        className
      )}>
        <ShieldCheck className="w-3 h-3" />
        {t('guarantee.noDeposit', 'Sans caution')}
      </div>
    );
  }

  if (variant === "large") {
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl",
        "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30",
        className
      )}>
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="font-semibold text-emerald-400">
            {t('guarantee.vehicleNoDeposit', 'Véhicule sans caution')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('guarantee.guaranteeEligible', 'Éligible à la Garantie GoMonto')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg",
      "bg-emerald-500/20 text-emerald-400 text-xs font-medium",
      className
    )}>
      <ShieldCheck className="w-3.5 h-3.5" />
      {t('guarantee.noDeposit', 'Sans caution')}
    </div>
  );
};

export default NoDepositBadge;
