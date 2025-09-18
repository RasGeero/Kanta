import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Send, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { messageApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import type { Message, ProductWithSeller, User } from "@shared/schema";
import { format } from "date-fns";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
  product?: ProductWithSeller;
}

export default function ChatModal({ 
  isOpen, 
  onClose, 
  sellerId, 
  sellerName, 
  product 
}: ChatModalProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get conversation between current user and seller
  const { data: messages = [], isLoading, refetch } = useQuery<Message[]>({
    queryKey: ['/api/messages', user?.id, sellerId, product?.id],
    queryFn: () => messageApi.getMessages(user!.id, sellerId, product?.id),
    enabled: isAuthenticated && isOpen && !!user?.id,
    refetchInterval: 3000, // Poll for new messages every 3 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => messageApi.sendMessage({
      receiverId: sellerId,
      content,
      productId: product?.id,
    }),
    onSuccess: () => {
      setNewMessage("");
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ['/api/messages', user!.id, sellerId, product?.id] });
      // Scroll to bottom after sending
      setTimeout(scrollToBottom, 100);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark messages as read when chat opens or new messages arrive
  useEffect(() => {
    if (isOpen && user?.id && messages.length > 0) {
      // Mark unread messages from seller as read
      const unreadFromSeller = messages.some(
        m => m.senderId === sellerId && m.receiverId === user.id && !m.isRead
      );
      
      if (unreadFromSeller) {
        messageApi.markAsRead(user.id, sellerId, product?.id).catch(console.error);
        // Invalidate unread count in navigation and conversation
        queryClient.invalidateQueries({ queryKey: ['/api/users', user.id, 'unread-messages'] });
        queryClient.invalidateQueries({ queryKey: ['/api/messages', user.id, sellerId, product?.id] });
      }
    }
  }, [isOpen, user?.id, sellerId, messages, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !isAuthenticated) return;

    sendMessageMutation.mutate(content);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatMessageTime = (date: Date | string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return format(messageDate, 'HH:mm');
    } else if (diffHours < 7 * 24) {
      return format(messageDate, 'EEE HH:mm');
    } else {
      return format(messageDate, 'MMM dd, HH:mm');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        {/* Chat Header */}
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getUserInitials(sellerName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">
                {sellerName}
              </DialogTitle>
              {product && (
                <p className="text-sm text-muted-foreground">
                  About: {product.title}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="close-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Product Context (if applicable) */}
        {product && (
          <div className="p-4 border-b bg-muted/50">
            <Card className="p-3">
              <div className="flex items-center space-x-3">
                <img 
                  src={product.processedImage || product.originalImage || ''} 
                  alt={product.title}
                  className="w-12 h-12 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{product.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    ₵{parseFloat(product.price).toFixed(0)}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {product.category}
                </Badge>
              </div>
            </Card>
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isFromCurrentUser = message.senderId === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      isFromCurrentUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs ${
                        isFromCurrentUser 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {formatMessageTime(message.createdAt!)}
                      </p>
                      {isFromCurrentUser && (
                        <span className={`text-xs ${
                          message.isRead 
                            ? 'text-primary-foreground/70' 
                            : 'text-primary-foreground/50'
                        }`}>
                          {message.isRead ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1"
              disabled={sendMessageMutation.isPending}
              data-testid="message-input"
            />
            <Button 
              type="submit" 
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              data-testid="send-message"
            >
              {sendMessageMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          {isTyping && (
            <p className="text-xs text-muted-foreground mt-1">
              {sellerName} will be notified...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}