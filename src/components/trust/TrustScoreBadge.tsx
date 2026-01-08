import { Star, Crown, Shield, Award, Gem, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TrustLevel = "starter" | "bronze" | "silver" | "gold" | "platinum" | "diamond";

interface TrustScoreBadgeProps {
  level: TrustLevel;
  score?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const levelConfig: Record<TrustLevel, {
  icon: typeof Star;
  color: string;
  bgColor: string;
  label: string;
  gradient: string;
}> = {
  starter: {
    icon: Star,
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
    label: "Débutant",
    gradient: "from-slate-400 to-slate-600",
  },
  bronze: {
    icon: Shield,
    color: "text-amber-600",
    bgColor: "bg-amber-600/20",
    label: "Bronze",
    gradient: "from-amber-500 to-amber-700",
  },
  silver: {
    icon: Award,
    color: "text-slate-300",
    bgColor: "bg-slate-300/20",
    label: "Argent",
    gradient: "from-slate-300 to-slate-500",
  },
  gold: {
    icon: Crown,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/20",
    label: "Or",
    gradient: "from-yellow-400 to-amber-500",
  },
  platinum: {
    icon: Gem,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/20",
    label: "Platine",
    gradient: "from-cyan-400 to-blue-500",
  },
  diamond: {
    icon: Sparkles,
    color: "text-violet-400",
    bgColor: "bg-violet-400/20",
    label: "Diamant",
    gradient: "from-violet-400 to-purple-600",
  },
};

export const TrustScoreBadge = ({
  level,
  score,
  showLabel = true,
  size = "md",
  className,
}: TrustScoreBadgeProps) => {
  const { t } = useTranslation();
  const config = levelConfig[level];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "h-5 px-1.5 text-[10px] gap-1",
    md: "h-7 px-2.5 text-xs gap-1.5",
    lg: "h-9 px-3 text-sm gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center rounded-full font-medium",
              config.bgColor,
              config.color,
              sizeClasses[size],
              className
            )}
          >
            <Icon className={iconSizes[size]} />
            {showLabel && (
              <span>{t(`trustLevel.${level}`, config.label)}</span>
            )}
            {score !== undefined && (
              <span className="opacity-70">({score})</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-semibold">
              {t('trustScore.level', 'Niveau')} {t(`trustLevel.${level}`, config.label)}
            </p>
            {score !== undefined && (
              <p className="text-muted-foreground">
                {t('trustScore.points', 'Points')}: {score}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TrustScoreBadge;
