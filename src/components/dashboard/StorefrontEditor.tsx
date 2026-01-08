import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  Save, 
  Upload, 
  ExternalLink, 
  Store, 
  Users, 
  Shield, 
  FileText,
  Image as ImageIcon,
  Loader2
} from "lucide-react";

const PAYMENT_OPTIONS = ["Orange Money", "Wave", "MTN MoMo", "Moov Money", "Espèces", "Virement bancaire"];

const StorefrontEditor = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);

  const [formData, setFormData] = useState({
    business_name: "",
    tagline: "",
    description: "",
    business_phone: "",
    business_email: "",
    business_address: "",
    whatsapp_number: "",
    with_driver_available: false,
    driver_daily_rate: "",
    minimum_rental_days: "1",
    deposit_policy: "",
    cancellation_policy: "",
    payment_methods: [] as string[],
    insurance_included: true,
    roadside_assistance: false,
    airport_delivery: false,
    unlimited_mileage: false,
    years_in_business: "",
    slug: "",
    logo_url: "",
    cover_image_url: "",
  });

  // Fetch existing storefront
  const { data: storefront, isLoading } = useQuery({
    queryKey: ['my-storefront', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owner_storefronts')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Populate form when data loads
  useEffect(() => {
    if (storefront) {
      setFormData({
        business_name: storefront.business_name || "",
        tagline: storefront.tagline || "",
        description: storefront.description || "",
        business_phone: storefront.business_phone || "",
        business_email: storefront.business_email || "",
        business_address: storefront.business_address || "",
        whatsapp_number: storefront.whatsapp_number || "",
        with_driver_available: storefront.with_driver_available || false,
        driver_daily_rate: storefront.driver_daily_rate?.toString() || "",
        minimum_rental_days: storefront.minimum_rental_days?.toString() || "1",
        deposit_policy: storefront.deposit_policy || "",
        cancellation_policy: storefront.cancellation_policy || "",
        payment_methods: storefront.payment_methods || [],
        insurance_included: storefront.insurance_included ?? true,
        roadside_assistance: storefront.roadside_assistance || false,
        airport_delivery: storefront.airport_delivery || false,
        unlimited_mileage: storefront.unlimited_mileage || false,
        years_in_business: storefront.years_in_business?.toString() || "",
        slug: storefront.slug || "",
        logo_url: storefront.logo_url || "",
        cover_image_url: storefront.cover_image_url || "",
      });
    }
  }, [storefront]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        user_id: user!.id,
        business_name: data.business_name || null,
        tagline: data.tagline || null,
        description: data.description || null,
        business_phone: data.business_phone || null,
        business_email: data.business_email || null,
        business_address: data.business_address || null,
        whatsapp_number: data.whatsapp_number || null,
        with_driver_available: data.with_driver_available,
        driver_daily_rate: data.driver_daily_rate ? parseInt(data.driver_daily_rate) : null,
        minimum_rental_days: parseInt(data.minimum_rental_days) || 1,
        deposit_policy: data.deposit_policy || null,
        cancellation_policy: data.cancellation_policy || null,
        payment_methods: data.payment_methods,
        insurance_included: data.insurance_included,
        roadside_assistance: data.roadside_assistance,
        airport_delivery: data.airport_delivery,
        unlimited_mileage: data.unlimited_mileage,
        years_in_business: data.years_in_business ? parseInt(data.years_in_business) : null,
        slug: data.slug || generateSlug(data.business_name),
        logo_url: data.logo_url || null,
        cover_image_url: data.cover_image_url || null,
      };

      if (storefront) {
        const { error } = await supabase
          .from('owner_storefronts')
          .update(payload)
          .eq('id', storefront.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('owner_storefronts')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Vitrine enregistrée avec succès !");
      queryClient.invalidateQueries({ queryKey: ['my-storefront'] });
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error("Ce slug est déjà utilisé. Choisissez un autre.");
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'cover') => {
    if (!user) return;

    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('owner-storefronts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('owner-storefronts')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        [type === 'logo' ? 'logo_url' : 'cover_image_url']: publicUrl
      }));

      toast.success(`${type === 'logo' ? 'Logo' : 'Image de couverture'} téléchargé !`);
    } catch (error) {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setUploading(null);
    }
  };

  const togglePaymentMethod = (method: string) => {
    setFormData(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(method)
        ? prev.payment_methods.filter(m => m !== method)
        : [...prev.payment_methods, method]
    }));
  };

  const storefrontUrl = formData.slug ? `/loueur/${formData.slug}` : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5" />
            Ma Vitrine
          </h2>
          <p className="text-sm text-muted-foreground">
            Personnalisez votre page publique pour attirer plus de clients
          </p>
        </div>
        <div className="flex gap-2">
          {storefrontUrl && (
            <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Voir ma vitrine
              </Button>
            </a>
          )}
          <Button 
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </div>

      <Tabs defaultValue="identity" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="identity" className="text-xs sm:text-sm">
            <ImageIcon className="h-4 w-4 mr-1 hidden sm:inline" />
            Identité
          </TabsTrigger>
          <TabsTrigger value="services" className="text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1 hidden sm:inline" />
            Services
          </TabsTrigger>
          <TabsTrigger value="policies" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
            Conditions
          </TabsTrigger>
          <TabsTrigger value="contact" className="text-xs sm:text-sm">
            <Shield className="h-4 w-4 mr-1 hidden sm:inline" />
            Contact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Identité visuelle</CardTitle>
              <CardDescription>Logo, image de couverture et informations générales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo & Cover */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={formData.logo_url} />
                      <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                        {formData.business_name?.charAt(0) || "L"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <input
                        type="file"
                        id="logo-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={uploading === 'logo'}
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        {uploading === 'logo' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        {formData.logo_url ? 'Changer' : 'Ajouter'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Image de couverture</Label>
                  <div className="mt-2">
                    <div className="h-24 rounded-lg bg-muted overflow-hidden relative">
                      {formData.cover_image_url ? (
                        <img src={formData.cover_image_url} className="w-full h-full object-cover" alt="Couverture" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          Aucune image
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      id="cover-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      disabled={uploading === 'cover'}
                      onClick={() => document.getElementById('cover-upload')?.click()}
                    >
                      {uploading === 'cover' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      {formData.cover_image_url ? 'Changer' : 'Ajouter'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Business info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name">Nom commercial</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                    placeholder="Ex: Location Express Dakar"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">URL personnalisée</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/loueur/</span>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                      placeholder="location-express-dakar"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="tagline">Slogan</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Ex: Votre partenaire mobilité depuis 2018"
                />
              </div>

              <div>
                <Label htmlFor="description">Description de votre entreprise</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Présentez votre activité, vos valeurs..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="years_in_business">Années d'expérience</Label>
                <Input
                  id="years_in_business"
                  type="number"
                  value={formData.years_in_business}
                  onChange={(e) => setFormData(prev => ({ ...prev, years_in_business: e.target.value }))}
                  placeholder="Ex: 5"
                  className="max-w-[120px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Services et garanties</CardTitle>
              <CardDescription>Indiquez les services que vous proposez</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Location avec chauffeur</div>
                    <div className="text-sm text-muted-foreground">Proposez un chauffeur professionnel</div>
                  </div>
                  <Switch
                    checked={formData.with_driver_available}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, with_driver_available: checked }))}
                  />
                </div>

                {formData.with_driver_available && (
                  <div className="p-4 border rounded-lg">
                    <Label htmlFor="driver_rate">Tarif chauffeur / jour (FCFA)</Label>
                    <Input
                      id="driver_rate"
                      type="number"
                      value={formData.driver_daily_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, driver_daily_rate: e.target.value }))}
                      placeholder="15000"
                      className="mt-2"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Assurance incluse</div>
                    <div className="text-sm text-muted-foreground">Véhicules assurés tous risques</div>
                  </div>
                  <Switch
                    checked={formData.insurance_included}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, insurance_included: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Assistance 24h/24</div>
                    <div className="text-sm text-muted-foreground">Dépannage en cas de panne</div>
                  </div>
                  <Switch
                    checked={formData.roadside_assistance}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, roadside_assistance: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Livraison aéroport</div>
                    <div className="text-sm text-muted-foreground">Remise et récupération à l'aéroport</div>
                  </div>
                  <Switch
                    checked={formData.airport_delivery}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, airport_delivery: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Kilométrage illimité</div>
                    <div className="text-sm text-muted-foreground">Pas de limite de km</div>
                  </div>
                  <Switch
                    checked={formData.unlimited_mileage}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, unlimited_mileage: checked }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="min_days">Durée minimum de location (jours)</Label>
                <Input
                  id="min_days"
                  type="number"
                  min="1"
                  value={formData.minimum_rental_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimum_rental_days: e.target.value }))}
                  className="max-w-[120px] mt-2"
                />
              </div>

              <div>
                <Label>Moyens de paiement acceptés</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PAYMENT_OPTIONS.map(method => (
                    <Badge
                      key={method}
                      variant={formData.payment_methods.includes(method) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => togglePaymentMethod(method)}
                    >
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Conditions de location</CardTitle>
              <CardDescription>Décrivez vos politiques de caution et d'annulation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="deposit_policy">Politique de caution</Label>
                <Textarea
                  id="deposit_policy"
                  value={formData.deposit_policy}
                  onChange={(e) => setFormData(prev => ({ ...prev, deposit_policy: e.target.value }))}
                  placeholder="Ex: Caution de 20% du montant total, remboursée sous 48h après restitution du véhicule..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="cancellation_policy">Politique d'annulation</Label>
                <Textarea
                  id="cancellation_policy"
                  value={formData.cancellation_policy}
                  onChange={(e) => setFormData(prev => ({ ...prev, cancellation_policy: e.target.value }))}
                  placeholder="Ex: Annulation gratuite jusqu'à 48h avant, 50% de frais au-delà..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations de contact</CardTitle>
              <CardDescription>Comment vos clients peuvent vous joindre</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_phone">Téléphone</Label>
                  <Input
                    id="business_phone"
                    type="tel"
                    value={formData.business_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_phone: e.target.value }))}
                    placeholder="+221 77 123 45 67"
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp_number">WhatsApp</Label>
                  <Input
                    id="whatsapp_number"
                    type="tel"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                    placeholder="+221 77 123 45 67"
                  />
                </div>

                <div>
                  <Label htmlFor="business_email">Email professionnel</Label>
                  <Input
                    id="business_email"
                    type="email"
                    value={formData.business_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_email: e.target.value }))}
                    placeholder="contact@votreentreprise.com"
                  />
                </div>

                <div>
                  <Label htmlFor="business_address">Adresse</Label>
                  <Input
                    id="business_address"
                    value={formData.business_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_address: e.target.value }))}
                    placeholder="Ex: Almadies, Dakar"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StorefrontEditor;
