import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Send, ArrowLeft, MoreVertical, Trash2, Pencil, X, Check 
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  onBack?: () => void;
}

const ChatWindow = ({ conversationId, currentUserId, onBack }: ChatWindowProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [deleteConversationOpen, setDeleteConversationOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      setNewMessage("");
    },
  });

  // Edit message mutation
  const editMutation = useMutation({
    mutationFn: async ({ messageId, content, originalContent }: { messageId: string; content: string; originalContent: string }) => {
      const { error } = await supabase
        .from("messages")
        .update({
          content,
          edited_at: new Date().toISOString(),
          original_content: originalContent,
        })
        .eq("id", messageId)
        .eq("sender_id", currentUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      setEditingMessageId(null);
      setEditContent("");
      toast.success("Message modifié");
    },
  });

  // Delete message mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("sender_id", currentUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      setMessageToDelete(null);
      toast.success("Message supprimé");
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async () => {
      // First get the conversation to know which participant we are
      const { data: conv } = await supabase
        .from("conversations")
        .select("participant_1, participant_2")
        .eq("id", conversationId)
        .single();

      if (!conv) throw new Error("Conversation not found");

      const updateField = conv.participant_1 === currentUserId 
        ? { deleted_by_user_1: true } 
        : { deleted_by_user_2: true };

      const { error } = await supabase
        .from("conversations")
        .update(updateField)
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation supprimée");
      onBack?.();
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    const markAsRead = async () => {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId)
        .eq("is_read", false);
    };
    markAsRead();
  }, [conversationId, currentUserId, messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  const handleStartEdit = (message: any) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = (message: any) => {
    if (editContent.trim() && editContent !== message.content) {
      editMutation.mutate({
        messageId: message.id,
        content: editContent.trim(),
        originalContent: message.original_content || message.content,
      });
    } else {
      setEditingMessageId(null);
      setEditContent("");
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
  };

  const canEditMessage = (message: any) => {
    const isOwn = message.sender_id === currentUserId;
    const minutesAgo = differenceInMinutes(new Date(), new Date(message.created_at));
    return isOwn && minutesAgo <= 5;
  };

  const canDeleteMessage = (message: any) => {
    return message.sender_id === currentUserId;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <span className="font-medium">Conversation</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteConversationOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer la conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Commencez la conversation...
          </div>
        ) : (
          messages?.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            const isEditing = editingMessageId === message.id;
            
            return (
              <div
                key={message.id}
                className={cn("flex group", isOwn ? "justify-end" : "justify-start")}
              >
                <div className={cn("relative max-w-[75%]", isOwn && "flex flex-row-reverse items-start gap-1")}>
                  {/* Message actions */}
                  {isOwn && !isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pt-1">
                      {canEditMessage(message) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleStartEdit(message)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      )}
                      {canDeleteMessage(message) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteMessage(message.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "glass-card rounded-bl-md"
                    )}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="h-8 text-sm bg-transparent border-none focus-visible:ring-0 p-0 text-inherit"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(message);
                            if (e.key === "Escape") {
                              setEditingMessageId(null);
                              setEditContent("");
                            }
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleSaveEdit(message)}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditContent("");
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p
                        className={cn(
                          "text-xs",
                          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        {format(new Date(message.created_at), "HH:mm", { locale: fr })}
                      </p>
                      {message.edited_at && (
                        <span
                          className={cn(
                            "text-xs italic",
                            isOwn ? "text-primary-foreground/50" : "text-muted-foreground/70"
                          )}
                        >
                          modifié
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 bg-background/50"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!newMessage.trim() || sendMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {/* Delete Message Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le message sera supprimé pour vous et votre interlocuteur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => messageToDelete && deleteMutation.mutate(messageToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Conversation Dialog */}
      <AlertDialog open={deleteConversationOpen} onOpenChange={setDeleteConversationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              La conversation sera supprimée de votre liste. L'autre participant pourra toujours la voir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConversationMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatWindow;
