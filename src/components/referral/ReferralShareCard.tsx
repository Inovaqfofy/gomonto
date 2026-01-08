import { useState } from "react";
import { Gift, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

interface ReferralShareCardProps {
  code: string;
  discountPercentage: number;
  variant?: "compact" | "full";
}

const ReferralShareCard = ({ code, discountPercentage, variant = "full" }: ReferralShareCardProps) => {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: "Code copié !",
      description: "Partagez-le avec vos amis.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const message = `🚗 Loue une voiture sur GoMonto ! Utilise mon code ${code} pour ${discountPercentage}% de réduction sur ta première location. https://gomonto.com/auth?ref=${code}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
        <Gift className="w-5 h-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Parrainez et gagnez !</p>
          <p className="text-xs text-muted-foreground">Code: {code}</p>
        </div>
        <Button size="sm" variant="outline" onClick={copyCode}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Gift className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Parrainez vos amis</h3>
          <p className="text-sm text-muted-foreground">
            Ils obtiennent {discountPercentage}% de réduction
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-background rounded-lg px-4 py-2 font-mono font-bold text-center">
          {code}
        </div>
        <Button variant="outline" size="icon" onClick={copyCode}>
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={shareOnWhatsApp}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </Button>
        <Button variant="outline" onClick={copyCode} className="flex-1">
          <Share2 className="w-4 h-4 mr-2" />
          Copier
        </Button>
      </div>
    </div>
  );
};

export default ReferralShareCard;
