import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Loader2 } from "lucide-react";
import montoAvatar from "@/assets/monto-avatar.jpeg";
import { cn } from "@/lib/utils";
import ChatMessage from "./ChatMessage";
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

const WELCOME_MESSAGE = `Bonjour ! 👋 Je suis Monto, votre assistant virtuel.

Je peux vous aider avec :
• 🚗 Trouver un véhicule à louer
• 💳 Les moyens de paiement (Mobile Money)
• 🌍 Les pays disponibles (zone UEMOA)
• 📝 Comment devenir loueur
• ❓ Toute question sur GoMonto

Comment puis-je vous aider ?`;

const MontoChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: WELCOME_MESSAGE,
      isBot: true,
      timestamp: new Date(),
    }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("monto-chat", {
        body: { 
          message: userMessage.content,
          history: messages.slice(-10).map(m => ({
            role: m.isBot ? "assistant" : "user",
            content: m.content
          }))
        },
      });

      if (error) throw error;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || "Désolé, je n'ai pas pu traiter votre demande.",
        isBot: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 md:bottom-6 right-4 z-50 h-16 w-16 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 transition-all duration-300",
          "animate-pulse hover:animate-none overflow-hidden",
          isOpen && "hidden"
        )}
      >
        <img 
          src={montoAvatar} 
          alt="Monto Assistant" 
          className="w-full h-full object-cover"
        />
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <Card className={cn(
          "fixed z-50 shadow-2xl border-border/50",
          "md:bottom-6 md:right-4 md:w-96 md:h-[500px] md:rounded-2xl",
          "bottom-0 right-0 left-0 top-0 md:top-auto md:left-auto w-full h-full md:h-[500px] rounded-none md:rounded-2xl",
          "flex flex-col overflow-hidden"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={montoAvatar} 
                  alt="Monto" 
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Monto</h3>
                <p className="text-xs opacity-80">Assistant GoMonto</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  content={message.content}
                  isBot={message.isBot}
                  timestamp={message.timestamp}
                />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Posez votre question..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Propulsé par l'IA GoMonto
            </p>
          </div>
        </Card>
      )}
    </>
  );
};

export default MontoChatbot;
