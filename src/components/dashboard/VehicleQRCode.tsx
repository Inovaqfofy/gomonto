import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Download, Copy, ExternalLink, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";

interface VehicleQRCodeProps {
  vehicleId: string;
  vehicleName: string;
}

interface QRCodeData {
  id: string;
  qr_code_data: string;
  short_url: string;
  scan_count: number;
  last_scanned_at: string | null;
}

const VehicleQRCode = ({ vehicleId, vehicleName }: VehicleQRCodeProps) => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrData, setQrData] = useState<QRCodeData | null>(null);

  useEffect(() => {
    fetchQRCode();
  }, [vehicleId]);

  const fetchQRCode = async () => {
    const { data } = await supabase
      .from("vehicle_qr_codes")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .single();

    setQrData(data);
    setLoading(false);
  };

  const generateQRCode = async () => {
    setGenerating(true);
    
    // Generate unique QR code data
    const vehicleUrl = `${window.location.origin}/vehicule/${vehicleId}`;
    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const shortUrl = `${window.location.origin}/v/${shortCode}`;
    
    const qrCodeData = JSON.stringify({
      vehicleId,
      url: vehicleUrl,
      shortCode,
      generatedAt: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from("vehicle_qr_codes")
      .upsert({
        vehicle_id: vehicleId,
        qr_code_data: qrCodeData,
        short_url: shortUrl,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la génération du QR code");
    } else {
      setQrData(data);
      toast.success("QR code généré avec succès");
    }
    
    setGenerating(false);
  };

  const copyLink = () => {
    if (qrData?.short_url) {
      navigator.clipboard.writeText(qrData.short_url);
      toast.success("Lien copié dans le presse-papier");
    }
  };

  const downloadQRCode = () => {
    // Create a simple QR code using a public API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData?.short_url || '')}`;
    
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-${vehicleName.replace(/\s+/g, '-')}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Téléchargement du QR code...");
  };

  if (loading) {
    return (
      <div className="animate-pulse h-64 bg-muted rounded-xl" />
    );
  }

  return (
    <Card className="glass-card border-glass-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              QR Code Véhicule
            </CardTitle>
            <CardDescription>Accès rapide pour check-in/check-out</CardDescription>
          </div>
          {qrData && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {qrData.scan_count} scans
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrData ? (
          <>
            {/* QR Code Display */}
            <div className="flex justify-center p-6 bg-white rounded-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData.short_url || '')}`}
                alt="Vehicle QR Code"
                className="w-48 h-48"
              />
            </div>

            {/* Short URL */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <input
                type="text"
                value={qrData.short_url || ''}
                readOnly
                className="flex-1 bg-transparent text-sm font-mono outline-none"
              />
              <Button size="sm" variant="ghost" onClick={copyLink}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={qrData.short_url || ''} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={downloadQRCode} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
              <Button variant="outline" onClick={generateQRCode} disabled={generating}>
                <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Usage Tips */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <h4 className="font-medium text-sm mb-2">💡 Comment utiliser</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Imprimez et collez le QR code sur le pare-brise</li>
                <li>• Les locataires scannent pour accéder aux infos</li>
                <li>• Utile pour le check-in/check-out rapide</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              Aucun QR code généré pour ce véhicule
            </p>
            <Button onClick={generateQRCode} disabled={generating}>
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Générer un QR Code
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VehicleQRCode;
