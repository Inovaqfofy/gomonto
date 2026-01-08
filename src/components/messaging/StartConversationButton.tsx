import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface StartConversationButtonProps {
  targetUserId: string;
  vehicleId?: string;
  reservationId?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

const StartConversationButton = ({
  targetUserId,
  vehicleId,
  reservationId,
  variant = "outline",
  size = "default",
  className,
  children
}: StartConversationButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const startConversation = async () => {
    setIsLoading(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté pour envoyer un message");
        navigate("/auth");
        return;
      }

      if (user.id === targetUserId) {
        toast.error("Vous ne pouvez pas vous envoyer un message à vous-même");
        return;
      }

      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${targetUserId}),and(participant_1.eq.${targetUserId},participant_2.eq.${user.id})`)
        .maybeSingle();

      let conversationId = existingConversation?.id;

      if (!conversationId) {
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from("conversations")
          .insert({
            participant_1: user.id,
            participant_2: targetUserId,
            vehicle_id: vehicleId || null,
            reservation_id: reservationId || null,
          })
          .select("id")
          .single();

        if (error) throw error;
        conversationId = newConversation.id;
      }

      // Invalidate conversations query
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Navigate to dashboard with messaging open
      navigate(`/dashboard?tab=messaging&conversation=${conversationId}`);
      toast.success("Conversation ouverte");
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Erreur lors de l'ouverture de la conversation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={startConversation}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <MessageCircle className="h-4 w-4 mr-2" />
          {children || "Message"}
        </>
      )}
    </Button>
  );
};

export default StartConversationButton;
