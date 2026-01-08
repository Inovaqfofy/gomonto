import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import ConversationsList from "./ConversationsList";
import ChatWindow from "./ChatWindow";
import NewConversationDialog from "./NewConversationDialog";
import { MessageCircle } from "lucide-react";

const MessagingCenter = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Handle conversation param from URL
  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (conversationId) {
      setSelectedConversationId(conversationId);
    }
  }, [searchParams]);

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Mobile view: show list or chat
  if (isMobile) {
    if (selectedConversationId) {
      return (
        <div className="h-[calc(100vh-12rem)]">
          <ChatWindow
            conversationId={selectedConversationId}
            currentUserId={currentUserId}
            onBack={() => setSelectedConversationId(null)}
          />
        </div>
      );
    }

    return (
      <div className="h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Messages
          </h2>
          <NewConversationDialog
            currentUserId={currentUserId}
            onConversationCreated={setSelectedConversationId}
          />
        </div>
        <ConversationsList
          currentUserId={currentUserId}
          onSelectConversation={setSelectedConversationId}
          selectedConversationId={selectedConversationId || undefined}
        />
      </div>
    );
  }

  // Desktop view: side by side
  return (
    <div className="glass-card rounded-2xl overflow-hidden h-[600px] flex">
      {/* Conversations sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Messages
          </h2>
          <NewConversationDialog
            currentUserId={currentUserId}
            onConversationCreated={setSelectedConversationId}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationsList
            currentUserId={currentUserId}
            onSelectConversation={setSelectedConversationId}
            selectedConversationId={selectedConversationId || undefined}
          />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1">
        {selectedConversationId ? (
          <ChatWindow
            conversationId={selectedConversationId}
            currentUserId={currentUserId}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Sélectionnez une conversation</p>
              <p className="text-sm mt-1">ou créez-en une nouvelle avec le bouton +</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingCenter;
