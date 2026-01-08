import { Car, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SelfDriveBadgeProps {
  variant?: "badge" | "card";
  className?: string;
}

export const SelfDriveBadge = ({ variant = "badge", className }: SelfDriveBadgeProps) => {
  const { t } = useTranslation();

  if (variant === "card") {
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl",
        "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30",
        className
      )}>
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Car className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-blue-400">
              {t('selfDrive.badge', 'Badge Liberté')}
            </p>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('selfDrive.description', 'Conduite autonome autorisée')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg",
            "bg-blue-500/20 text-blue-400 text-xs font-medium cursor-help",
            className
          )}>
            <Car className="w-3.5 h-3.5" />
            {t('selfDrive.label', 'Liberté')}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm max-w-[200px]">
            {t('selfDrive.tooltip', 'Ce véhicule peut être conduit sans chauffeur grâce au Safe-Drive Scoring')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SelfDriveBadge;
