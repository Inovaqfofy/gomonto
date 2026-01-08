import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import montoAvatar from "@/assets/monto-avatar.jpeg";

interface ChatMessageProps {
  content: string;
  isBot: boolean;
  timestamp?: Date;
}

const ChatMessage = ({ content, isBot, timestamp }: ChatMessageProps) => {
  return (
    <div className={cn("flex gap-3", isBot ? "justify-start" : "justify-end")}>
      {isBot && (
        <img 
          src={montoAvatar} 
          alt="Monto" 
          className="flex-shrink-0 w-8 h-8 rounded-full object-cover"
        />
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isBot
            ? "bg-muted text-foreground rounded-tl-md"
            : "bg-primary text-primary-foreground rounded-tr-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        {timestamp && (
          <p className={cn(
            "text-xs mt-1 opacity-70",
            isBot ? "text-muted-foreground" : "text-primary-foreground/70"
          )}>
            {timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
      {!isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-4 h-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
