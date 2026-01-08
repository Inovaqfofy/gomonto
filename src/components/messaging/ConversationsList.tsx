import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircle, Car } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationsListProps {
  currentUserId: string;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

const ConversationsList = ({ 
  currentUserId, 
  onSelectConversation,
  selectedConversationId 
}: ConversationsListProps) => {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          vehicle:vehicles(brand, model),
          messages(content, created_at, is_read, sender_id)
        `)
        .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Fetch contact names for each conversation
      const conversationsWithContacts = await Promise.all(
        (data || []).map(async (conv) => {
          const contactId = conv.participant_1 === currentUserId 
            ? conv.participant_2 
            : conv.participant_1;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", contactId)
            .single();
          
          return {
            ...conv,
            contactName: profile?.full_name || "Utilisateur"
          };
        })
      );
      
      return conversationsWithContacts;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-muted/50 rounded-xl h-20" />
        ))}
      </div>
    );
  }

  if (!conversations?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-6 text-center">
        <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
        <p className="font-medium">Aucune conversation</p>
        <p className="text-sm mt-2">
          Commencez une discussion en utilisant le bouton + ci-dessus ou en contactant un propriétaire depuis une page véhicule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {conversations.map((conversation) => {
        const lastMessage = conversation.messages
          ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
        const unreadCount = conversation.messages?.filter(
          (m: any) => !m.is_read && m.sender_id !== currentUserId
        ).length || 0;

        const isSelected = selectedConversationId === conversation.id;

        return (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={cn(
              "w-full p-4 rounded-xl text-left transition-all",
              isSelected 
                ? "bg-primary/10 border border-primary/20" 
                : "glass-card hover:bg-muted/50"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium truncate">
                    {conversation.contactName}
                  </span>
                  {lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(lastMessage.created_at), "HH:mm", { locale: fr })}
                    </span>
                  )}
                </div>
                {conversation.vehicle && (
                  <p className="text-xs text-primary mb-1">
                    {conversation.vehicle.brand} {conversation.vehicle.model}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">
                    {lastMessage?.content || "Commencer la conversation"}
                  </p>
                  {unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ConversationsList;
