import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Users, Search, Filter, Eye, Ban, CheckCircle, 
  ShieldCheck, Mail, Phone, Calendar, MapPin, Shield 
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface User {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_type: string;
  country: string;
  kyc_global_status: string;
  created_at: string;
  isAdmin?: boolean;
}

const AdminUsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterKYC, setFilterKYC] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, [filterType, filterKYC, filterCountry]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterType !== "all") {
        query = query.eq("profile_type", filterType as any);
      }
      if (filterKYC !== "all") {
        query = query.eq("kyc_global_status", filterKYC);
      }
      if (filterCountry !== "all") {
        query = query.eq("country", filterCountry as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch admin roles for all users
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      // Add isAdmin flag to each user
      const usersWithAdminFlag = (data || []).map(user => ({
        ...user,
        isAdmin: adminUserIds.has(user.user_id)
      }));

      setUsers(usersWithAdminFlag);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (user: User) => {
    try {
      // Get user's reservations count
      const { count: reservationsCount } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .or(`renter_id.eq.${user.user_id},owner_id.eq.${user.user_id}`);

      // Get user's vehicles count (if owner)
      const { count: vehiclesCount } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.user_id);

      // Get KYC documents
      const { data: kycDocs } = await supabase
        .from("kyc_documents")
        .select("*")
        .eq("user_id", user.user_id);

      // Get wallet balance (if owner)
      const { data: wallet } = await supabase
        .from("owner_wallets")
        .select("balance")
        .eq("user_id", user.user_id)
        .maybeSingle();

      // Check for admin role
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.user_id)
        .eq("role", "admin")
        .maybeSingle();

      setUserDetails({
        reservationsCount: reservationsCount || 0,
        vehiclesCount: vehiclesCount || 0,
        kycDocs: kycDocs || [],
        walletBalance: wallet?.balance || 0,
        isAdmin: !!adminRole,
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    await fetchUserDetails(user);
  };

  const handlePromoteAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      if (error) throw error;
      toast.success("Utilisateur promu administrateur");
      if (selectedUser) {
        await fetchUserDetails(selectedUser);
      }
    } catch (error: any) {
      if (error.code === "23505") {
        toast.info("Cet utilisateur est déjà administrateur");
      } else {
        toast.error("Erreur lors de la promotion");
      }
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) throw error;
      toast.success("Droits admin révoqués");
      if (selectedUser) {
        await fetchUserDetails(selectedUser);
      }
    } catch (error) {
      toast.error("Erreur lors de la révocation");
    }
  };

  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm))
  );

  const getKYCBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      verified: { label: "Vérifié", variant: "default" },
      pre_verified: { label: "Pré-vérifié", variant: "secondary" },
      pending: { label: "En attente", variant: "outline" },
      rejected: { label: "Rejeté", variant: "destructive" },
      uploaded: { label: "Soumis", variant: "secondary" },
    };
    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getProfileTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; color: string }> = {
      loueur: { label: "Loueur", color: "bg-primary/10 text-primary" },
      locataire: { label: "Locataire", color: "bg-blue-500/10 text-blue-500" },
      chauffeur: { label: "Chauffeur", color: "bg-purple-500/10 text-purple-500" },
    };
    const config = typeConfig[type] || { label: type, color: "bg-muted text-muted-foreground" };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-muted-foreground">{users.length} utilisateurs enregistrés</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card border-glass-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="loueur">Loueurs</SelectItem>
                <SelectItem value="locataire">Locataires</SelectItem>
                <SelectItem value="chauffeur">Chauffeurs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterKYC} onValueChange={setFilterKYC}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Statut KYC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="verified">Vérifié</SelectItem>
                <SelectItem value="pre_verified">Pré-vérifié</SelectItem>
                <SelectItem value="uploaded">Soumis</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Pays" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous pays</SelectItem>
                <SelectItem value="senegal">Sénégal</SelectItem>
                <SelectItem value="cote_ivoire">Côte d'Ivoire</SelectItem>
                <SelectItem value="mali">Mali</SelectItem>
                <SelectItem value="burkina_faso">Burkina Faso</SelectItem>
                <SelectItem value="benin">Bénin</SelectItem>
                <SelectItem value="togo">Togo</SelectItem>
                <SelectItem value="niger">Niger</SelectItem>
                <SelectItem value="guinee_bissau">Guinée-Bissau</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-card border-glass-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Pays</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || "Sans nom"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {getProfileTypeBadge(user.profile_type)}
                        {user.isAdmin && (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{user.country?.replace("_", " ")}</TableCell>
                    <TableCell>{getKYCBadge(user.kyc_global_status || "pending")}</TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Détails Utilisateur</DialogTitle>
                          </DialogHeader>
                          {selectedUser && userDetails && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">{selectedUser.full_name}</h3>
                                  {getProfileTypeBadge(selectedUser.profile_type)}
                                  {userDetails.isAdmin && (
                                    <Badge className="ml-2 bg-destructive/10 text-destructive">Admin</Badge>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  <span>{selectedUser.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <span>{selectedUser.phone || "Non renseigné"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="w-4 h-4 text-muted-foreground" />
                                  <span className="capitalize">{selectedUser.country?.replace("_", " ")}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <span>{format(new Date(selectedUser.created_at), "dd MMMM yyyy", { locale: fr })}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
                                <div className="text-center">
                                  <p className="text-2xl font-bold">{userDetails.reservationsCount}</p>
                                  <p className="text-xs text-muted-foreground">Réservations</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold">{userDetails.vehiclesCount}</p>
                                  <p className="text-xs text-muted-foreground">Véhicules</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold">{userDetails.walletBalance.toLocaleString()}</p>
                                  <p className="text-xs text-muted-foreground">Crédits</p>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">Documents KYC</h4>
                                {userDetails.kycDocs.length > 0 ? (
                                  <div className="space-y-2">
                                    {userDetails.kycDocs.map((doc: any) => (
                                      <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                                        <span className="text-sm capitalize">{doc.document_type}</span>
                                        {getKYCBadge(doc.status)}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Aucun document soumis</p>
                                )}
                              </div>

                              <div className="flex gap-2 pt-4">
                                {userDetails.isAdmin ? (
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleRevokeAdmin(selectedUser.user_id)}
                                    className="flex-1"
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Révoquer Admin
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    onClick={() => handlePromoteAdmin(selectedUser.user_id)}
                                    className="flex-1"
                                  >
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    Promouvoir Admin
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsersManagement;
