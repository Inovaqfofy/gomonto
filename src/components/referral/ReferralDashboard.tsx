import { useState, useEffect } from "react";
import { 
  Gift, 
  Users, 
  Trophy, 
  Share2, 
  Copy, 
  Check,
  TrendingUp,
  Star,
  Zap,
  Crown,
  Target,
  ArrowRight
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface ReferralDashboardProps {
  userId: string;
  userType: "owner" | "renter";
}

interface ReferralCode {
  id: string;
  code: string;
  code_type: string;
  uses_count: number;
  discount_percentage: number;
}

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalCreditsEarned: number;
  totalDiscountsEarned: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  min_referrals: number;
  reward_credits: number;
  color: string;
  earned?: boolean;
}

const BADGE_COLORS: Record<string, string> = {
  green: "from-green-500 to-emerald-600",
  blue: "from-blue-500 to-indigo-600",
  orange: "from-orange-500 to-amber-600",
  purple: "from-purple-500 to-violet-600",
  gold: "from-yellow-400 to-amber-500",
};

const ReferralDashboard = ({ userId, userType }: ReferralDashboardProps) => {
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    totalCreditsEarned: 0,
    totalDiscountsEarned: 0,
  });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [nextBadge, setNextBadge] = useState<Badge | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralData();
  }, [userId]);

  const fetchReferralData = async () => {
    try {
      // Fetch referral code
      const { data: codeData } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (codeData) {
        setReferralCode(codeData);
      }

      // Fetch referrals stats
      const { data: referralsData } = await supabase
        .from("referrals")
        .select("status, reward_credits, reward_discount")
        .eq("referrer_id", userId);

      if (referralsData) {
        const completed = referralsData.filter(r => r.status === "completed" || r.status === "rewarded");
        const pending = referralsData.filter(r => r.status === "pending");
        
        setStats({
          totalReferrals: referralsData.length,
          completedReferrals: completed.length,
          pendingReferrals: pending.length,
          totalCreditsEarned: completed.reduce((sum, r) => sum + (r.reward_credits || 0), 0),
          totalDiscountsEarned: completed.reduce((sum, r) => sum + (r.reward_discount || 0), 0),
        });
      }

      // Fetch all badges
      const { data: allBadges } = await supabase
        .from("referral_badges")
        .select("*")
        .order("level", { ascending: true });

      // Fetch user's earned badges
      const { data: userBadges } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", userId);

      const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

      if (allBadges) {
        const badgesWithStatus = allBadges.map(badge => ({
          ...badge,
          earned: earnedBadgeIds.has(badge.id),
        }));
        setBadges(badgesWithStatus);

        // Calculate current level
        const earnedBadges = badgesWithStatus.filter(b => b.earned);
        const maxLevel = earnedBadges.length > 0 
          ? Math.max(...earnedBadges.map(b => b.level))
          : 0;
        setCurrentLevel(maxLevel);

        // Find next badge
        const next = badgesWithStatus.find(b => !b.earned);
        setNextBadge(next || null);
      }
    } catch (error) {
      console.error("Error fetching referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!referralCode) return;
    
    await navigator.clipboard.writeText(referralCode.code);
    setCopied(true);
    toast({
      title: "Code copié !",
      description: "Partagez-le avec vos amis.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    if (!referralCode) return;
    
    const message = userType === "owner"
      ? `🚗 Rejoins GoMonto et publie tes véhicules ! Utilise mon code ${referralCode.code} pour obtenir des crédits gratuits. https://gomonto.com/auth?ref=${referralCode.code}`
      : `🚗 Loue une voiture sur GoMonto ! Utilise mon code ${referralCode.code} pour ${referralCode.discount_percentage}% de réduction sur ta première location. https://gomonto.com/auth?ref=${referralCode.code}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const progressToNextBadge = nextBadge 
    ? Math.min((stats.completedReferrals / nextBadge.min_referrals) * 100, 100)
    : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary" />
            Programme de Parrainage
          </h1>
          <p className="text-muted-foreground">
            Parrainez vos amis et gagnez des récompenses !
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "px-4 py-2 rounded-full text-sm font-medium",
            currentLevel > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            Niveau {currentLevel}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border border-glass-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.totalReferrals}</p>
          <p className="text-sm text-muted-foreground">Parrainages</p>
        </div>

        <div className="glass-card p-4 border border-glass-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.completedReferrals}</p>
          <p className="text-sm text-muted-foreground">Validés</p>
        </div>

        <div className="glass-card p-4 border border-glass-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.totalCreditsEarned.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Crédits gagnés</p>
        </div>

        <div className="glass-card p-4 border border-glass-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <p className="text-2xl font-bold">{stats.totalDiscountsEarned.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">FCFA économisés</p>
        </div>
      </div>

      {/* Referral Code Card */}
      <div className="glass-card p-6 border border-glass-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Votre code de parrainage</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {userType === "owner" 
                ? "Parrainez d'autres agences et gagnez 1000 crédits par inscription validée !"
                : `Vos amis bénéficient de ${referralCode?.discount_percentage || 10}% de réduction et vous gagnez aussi !`
              }
            </p>
            
            {referralCode && (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-xl px-4 py-3 font-mono text-xl font-bold tracking-wider text-center">
                  {referralCode.code}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyCode}
                  className="h-12 w-12"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={shareOnWhatsApp}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Partager sur WhatsApp
            </Button>
            <Button variant="outline" onClick={copyCode}>
              <Share2 className="w-4 h-4 mr-2" />
              Copier le lien
            </Button>
          </div>
        </div>
      </div>

      {/* Progress to Next Badge */}
      {nextBadge && (
        <div className="glass-card p-6 border border-glass-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
                `bg-gradient-to-br ${BADGE_COLORS[nextBadge.color] || BADGE_COLORS.blue}`
              )}>
                {nextBadge.icon}
              </div>
              <div>
                <h3 className="font-semibold">Prochain badge : {nextBadge.name}</h3>
                <p className="text-sm text-muted-foreground">{nextBadge.description}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                +{nextBadge.reward_credits.toLocaleString()} crédits
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{stats.completedReferrals} / {nextBadge.min_referrals} parrainages</span>
              <span className="text-primary font-medium">{Math.round(progressToNextBadge)}%</span>
            </div>
            <Progress value={progressToNextBadge} className="h-3" />
          </div>
        </div>
      )}

      {/* Badges Collection */}
      <div className="glass-card p-6 border border-glass-border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Collection de Badges
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={cn(
                "relative p-4 rounded-xl text-center transition-all",
                badge.earned 
                  ? "bg-gradient-to-br " + (BADGE_COLORS[badge.color] || BADGE_COLORS.blue)
                  : "bg-muted/50 opacity-50 grayscale"
              )}
            >
              <div className="text-4xl mb-2">{badge.icon}</div>
              <p className={cn(
                "font-medium text-sm",
                badge.earned ? "text-white" : "text-muted-foreground"
              )}>
                {badge.name}
              </p>
              <p className={cn(
                "text-xs mt-1",
                badge.earned ? "text-white/80" : "text-muted-foreground"
              )}>
                {badge.min_referrals} parrainages
              </p>
              
              {badge.earned && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* How it Works */}
      <div className="glass-card p-6 border border-glass-border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Comment ça marche ?
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">1</span>
            </div>
            <div>
              <h4 className="font-medium mb-1">Partagez votre code</h4>
              <p className="text-sm text-muted-foreground">
                Envoyez votre code unique à vos amis via WhatsApp ou par copier-coller.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">2</span>
            </div>
            <div>
              <h4 className="font-medium mb-1">Ils s'inscrivent</h4>
              <p className="text-sm text-muted-foreground">
                Vos amis utilisent votre code lors de leur inscription sur GoMonto.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">3</span>
            </div>
            <div>
              <h4 className="font-medium mb-1">Gagnez des récompenses</h4>
              <p className="text-sm text-muted-foreground">
                {userType === "owner" 
                  ? "Recevez 1000 crédits gratuits par agence parrainée !"
                  : "Recevez une réduction sur votre prochaine location !"
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;
