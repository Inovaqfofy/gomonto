import { useState } from "react";
import { Shield, ShieldCheck, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DigitalGuaranteeOptionProps {
  totalDays: number;
  depositAmount: number;
  dailyGuaranteeRate?: number;
  isSelected: boolean;
  onToggle: (selected: boolean) => void;
  isEligible?: boolean;
}

export const DigitalGuaranteeOption = ({
  totalDays,
  depositAmount,
  dailyGuaranteeRate = 1500,
  isSelected,
  onToggle,
  isEligible = true,
}: DigitalGuaranteeOptionProps) => {
  const { t } = useTranslation();
  const guaranteeCost = totalDays * dailyGuaranteeRate;
  const savings = depositAmount - guaranteeCost;

  if (!isEligible || totalDays <= 0) return null;

  return (
    <div
      onClick={() => onToggle(!isSelected)}
      className={cn(
        "relative p-4 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden group",
        isSelected
          ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500"
          : "glass border border-glass-border hover:border-emerald-500/50"
      )}
    >
      {/* Glow effect when selected */}
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 animate-pulse pointer-events-none" />
      )}

      <div className="relative flex items-start gap-4">
        {/* Checkbox */}
        <div
          className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
            isSelected
              ? "bg-emerald-500 text-white"
              : "border-2 border-muted-foreground/30"
          )}
        >
          {isSelected && <ShieldCheck className="w-4 h-4" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-foreground">
              {t('guarantee.title', 'Garantie GoMonto')}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p className="text-sm">
                    {t('guarantee.tooltip', 'La Garantie GoMonto vous protège contre les frais de caution. En cas de dommage mineur, nous prenons en charge les réparations jusqu\'à la valeur de la caution.')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            {t('guarantee.description', 'Supprimez la caution et roulez l\'esprit tranquille')}
          </p>

          {/* Pricing */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-emerald-400">
                {formatCurrency(guaranteeCost)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({formatCurrency(dailyGuaranteeRate)}/{t('common.day', 'jour')})
              </span>
            </div>

            {savings > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                <Sparkles className="w-3 h-3" />
                {t('guarantee.save', 'Économisez')} {formatCurrency(savings)}
              </div>
            )}
          </div>

          {/* Benefits */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              t('guarantee.benefit1', 'Sans caution'),
              t('guarantee.benefit2', 'Protection dommages'),
              t('guarantee.benefit3', 'Assistance 24/7'),
              t('guarantee.benefit4', 'Remboursement rapide')].map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalGuaranteeOption;
