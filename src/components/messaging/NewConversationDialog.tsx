import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, User, Car, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NewConversationDialogProps {
  currentUserId: string;
  onConversationCreated: (conversationId: string) => void;
}

interface UserResult {
  user_id: string;
  full_name: string;
  email: string;
}

const NewConversationDialog = ({ currentUserId, onConversationCreated }: NewConversationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  // Search for users
  const { data: users, isLoading } = useQuery({
    queryKey: ["user-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .neq("user_id", currentUserId)
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data as UserResult[];
    },
    enabled: searchTerm.length >= 2,
  });

  // Fetch user's recent vehicles for context
  const { data: recentVehicles } = useQuery({
    queryKey: ["recent-vehicles-for-messaging"],
    queryFn: async () => {
      // Fetch vehicles from recent reservations
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          vehicle_id,
          vehicles(id, brand, model, owner_id)
        `)
        .eq("renter_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data?.map(r => r.vehicles).filter(Boolean) || [];
    },
  });

  const startConversation = async (targetUserId: string, vehicleId?: string) => {
    setIsCreating(true);
    try {
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant_1.eq.${currentUserId},participant_2.eq.${targetUserId}),and(participant_1.eq.${targetUserId},participant_2.eq.${currentUserId})`)
        .maybeSingle();

      let conversationId = existingConversation?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from("conversations")
          .insert({
            participant_1: currentUserId,
            participant_2: targetUserId,
            vehicle_id: vehicleId || null,
          })
          .select("id")
          .single();

        if (error) throw error;
        conversationId = newConversation.id;
      }

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onConversationCreated(conversationId);
      setOpen(false);
      setSearchTerm("");
      toast.success("Conversation ouverte");
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Erreur lors de la création de la conversation");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {searchTerm.length >= 2 && users && users.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <p className="text-xs text-muted-foreground px-1">Résultats</p>
              {users.map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => startConversation(user.user_id)}
                  disabled={isCreating}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.full_name || "Utilisateur"}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchTerm.length >= 2 && users && users.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground py-8">
              Aucun utilisateur trouvé
            </p>
          )}

          {/* Recent Vehicle Owners */}
          {searchTerm.length < 2 && recentVehicles && recentVehicles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground px-1">Véhicules récents</p>
              {recentVehicles.map((vehicle: any) => (
                <button
                  key={vehicle.id}
                  onClick={() => startConversation(vehicle.owner_id, vehicle.id)}
                  disabled={isCreating}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{vehicle.brand} {vehicle.model}</p>
                    <p className="text-sm text-muted-foreground">Contacter le propriétaire</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchTerm.length < 2 && (!recentVehicles || recentVehicles.length === 0) && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Tapez au moins 2 caractères pour rechercher
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationDialog;
