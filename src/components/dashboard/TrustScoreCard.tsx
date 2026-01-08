import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from '@/lib/supabase';
import { 
  Star, 
  Crown, 
  Shield, 
  Award, 
  Gem, 
  Sparkles,
  Car,
  Check,
  Lock,
  TrendingUp,
  Gift
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type TrustLevel = "starter" | "bronze" | "silver" | "gold" | "platinum" | "diamond";

interface TrustScoreData {
  total_score: number;
  level: TrustLevel;
  successful_rentals: number;
  total_rentals: number;
  avg_drive_score: number;
  deposit_reduction_percent: number;
  luxury_access_unlocked: boolean;
  self_drive_unlocked: boolean;
  fee_discount_percent: number;
}

const levelConfig: Record<TrustLevel, {
  icon: typeof Star;
  color: string;
  bgColor: string;
  label: string;
  gradient: string;
  minScore: number;
  nextLevel?: TrustLevel;
  nextMinScore?: number;
}> = {
  starter: {
    icon: Star,
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
    label: "Débutant",
    gradient: "from-slate-400 to-slate-600",
    minScore: 0,
    nextLevel: "bronze",
    nextMinScore: 300,
  },
  bronze: {
    icon: Shield,
    color: "text-amber-600",
    bgColor: "bg-amber-600/20",
    label: "Bronze",
    gradient: "from-amber-500 to-amber-700",
    minScore: 300,
    nextLevel: "silver",
    nextMinScore: 800,
  },
  silver: {
    icon: Award,
    color: "text-slate-300",
    bgColor: "bg-slate-300/20",
    label: "Argent",
    gradient: "from-slate-300 to-slate-500",
    minScore: 800,
    nextLevel: "gold",
    nextMinScore: 1500,
  },
  gold: {
    icon: Crown,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/20",
    label: "Or",
    gradient: "from-yellow-400 to-amber-500",
    minScore: 1500,
    nextLevel: "platinum",
    nextMinScore: 3000,
  },
  platinum: {
    icon: Gem,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/20",
    label: "Platine",
    gradient: "from-cyan-400 to-blue-500",
    minScore: 3000,
    nextLevel: "diamond",
    nextMinScore: 5000,
  },
  diamond: {
    icon: Sparkles,
    color: "text-violet-400",
    bgColor: "bg-violet-400/20",
    label: "Diamant",
    gradient: "from-violet-400 to-purple-600",
    minScore: 5000,
  },
};

interface TrustScoreCardProps {
  userId?: string;
}

export const TrustScoreCard = ({ userId }: TrustScoreCardProps) => {
  const { t } = useTranslation();
  const [data, setData] = useState<TrustScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrustScore = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const targetUserId = userId || user?.id;
        
        if (!targetUserId) return;

        const { data: trustData, error } = await supabase
          .from('driver_trust_scores')
          .select('*')
          .eq('user_id', targetUserId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (trustData) {
          setData({
            total_score: trustData.total_score,
            level: trustData.level as TrustLevel,
            successful_rentals: trustData.successful_rentals || 0,
            total_rentals: trustData.total_rentals || 0,
            avg_drive_score: trustData.avg_drive_score || 100,
            deposit_reduction_percent: trustData.deposit_reduction_percent || 0,
            luxury_access_unlocked: trustData.luxury_access_unlocked || false,
            self_drive_unlocked: trustData.self_drive_unlocked || false,
            fee_discount_percent: trustData.fee_discount_percent || 0,
          });
        } else {
          // Default starter data
          setData({
            total_score: 0,
            level: 'starter',
            successful_rentals: 0,
            total_rentals: 0,
            avg_drive_score: 100,
            deposit_reduction_percent: 0,
            luxury_access_unlocked: false,
            self_drive_unlocked: false,
            fee_discount_percent: 0,
          });
        }
      } catch (error) {
        console.error('Error fetching trust score:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrustScore();
  }, [userId]);

  if (loading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="h-60" />
      </Card>
    );
  }

  if (!data) return null;

  const config = levelConfig[data.level];
  const Icon = config.icon;
  const progressToNext = config.nextMinScore
    ? Math.min(100, ((data.total_score - config.minScore) / (config.nextMinScore - config.minScore)) * 100)
    : 100;

  const benefits = [
    {
      label: t('trustScore.depositReduction', 'Réduction caution'),
      value: `${data.deposit_reduction_percent}%`,
      unlocked: data.deposit_reduction_percent > 0,
      icon: Shield,
    },
    {
      label: t('trustScore.feeDiscount', 'Réduction frais'),
      value: `${data.fee_discount_percent}%`,
      unlocked: data.fee_discount_percent > 0,
      icon: Gift,
    },
    {
      label: t('trustScore.selfDrive', 'Conduite autonome'),
      value: t('common.unlocked', 'Débloqué'),
      unlocked: data.self_drive_unlocked,
      icon: Car,
    },
    {
      label: t('trustScore.luxuryAccess', 'Véhicules de luxe'),
      value: t('common.unlocked', 'Débloqué'),
      unlocked: data.luxury_access_unlocked,
      icon: Crown,
    }];

  return (
    <Card className="glass-card overflow-hidden">
      <div className={cn(
        "h-2 bg-gradient-to-r",
        config.gradient
      )} />
      
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t('trustScore.title', 'Score de Confiance')}
          </span>
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
            config.bgColor, config.color
          )}>
            <Icon className="w-4 h-4" />
            <span className="font-semibold">{config.label}</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Score Display */}
        <div className="text-center py-4">
          <div className={cn(
            "inline-flex items-center justify-center w-24 h-24 rounded-full",
            "bg-gradient-to-br", config.gradient
          )}>
            <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center">
              <span className={cn("text-3xl font-bold", config.color)}>
                {data.total_score}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {data.successful_rentals} {t('trustScore.successfulRentals', 'locations réussies')} / {data.total_rentals} {t('trustScore.total', 'total')}
          </p>
        </div>

        {/* Progress to Next Level */}
        {config.nextLevel && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {t('trustScore.progressTo', 'Progression vers')} {levelConfig[config.nextLevel].label}
              </span>
              <span className={config.color}>
                {data.total_score} / {config.nextMinScore}
              </span>
            </div>
            <Progress value={progressToNext} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {config.nextMinScore! - data.total_score} {t('trustScore.pointsRemaining', 'points restants')}
            </p>
          </div>
        )}

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-3">
          {benefits.map((benefit, idx) => {
            const BenefitIcon = benefit.icon;
            return (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-xl border transition-all",
                  benefit.unlocked
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/20 border-border opacity-60"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {benefit.unlocked ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                  <BenefitIcon className={cn(
                    "w-4 h-4",
                    benefit.unlocked ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <p className="text-xs text-muted-foreground">{benefit.label}</p>
                <p className={cn(
                  "font-semibold text-sm",
                  benefit.unlocked ? "text-foreground" : "text-muted-foreground"
                )}>
                  {benefit.unlocked ? benefit.value : t('common.locked', 'Verrouillé')}
                </p>
              </div>
            );
          })}
        </div>

        {/* Level Progression */}
        <div className="pt-4 border-t border-glass-border">
          <p className="text-sm font-medium mb-3">{t('trustScore.allLevels', 'Niveaux')}</p>
          <div className="flex justify-between">
            {(Object.keys(levelConfig) as TrustLevel[]).map((level) => {
              const lvlConfig = levelConfig[level];
              const LvlIcon = lvlConfig.icon;
              const isCurrentOrPast = data.total_score >= lvlConfig.minScore;
              const isCurrent = data.level === level;

              return (
                <div 
                  key={level}
                  className={cn(
                    "flex flex-col items-center gap-1",
                    isCurrent && "scale-110"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    isCurrentOrPast ? lvlConfig.bgColor : "bg-muted/30",
                    isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}>
                    <LvlIcon className={cn(
                      "w-4 h-4",
                      isCurrentOrPast ? lvlConfig.color : "text-muted-foreground"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[10px]",
                    isCurrent ? "font-semibold" : "text-muted-foreground"
                  )}>
                    {lvlConfig.minScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrustScoreCard;
