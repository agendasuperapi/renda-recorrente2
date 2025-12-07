import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, Image as ImageIcon, Loader2, X, CheckCircle, XCircle, Clock, Star, MessageCircle, Link2, DollarSign, Users, UserPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReferenceType, Reference } from "./ReferenceSelector";
import { ReferenceItemSelector } from "./ReferenceItemSelector";
import { ReferenceDisplay } from "./ReferenceDisplay";
import { ReferenceDetailsDialog } from "./ReferenceDetailsDialog";
import { cn } from "@/lib/utils";
import { TicketRatingDialog } from "./TicketRatingDialog";
import { ImagePreviewDialog } from "./ImagePreviewDialog";

type TicketStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string | null;
  image_urls: string[];
  is_admin: boolean;
  read_at: string | null;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attached_references?: any;
  sender?: {
    name: string;
    avatar_url: string | null;
  };
}

interface TicketChatDialogProps {
  ticket: {
    id: string;
    ticket_number: number;
    subject: string;
    status: TicketStatus;
    is_resolved: boolean | null;
    rating: number | null;
    user_id?: string;
    user?: {
      name: string;
      email: string;
      avatar_url: string | null;
    } | null;
    assigned_admin?: {
      name: string;
    } | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  isAdmin: boolean;
  currentUserId?: string;
}

const statusConfig: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: "Aberto", color: "bg-blue-500/20 text-blue-500" },
  in_progress: { label: "Em Andamento", color: "bg-yellow-500/20 text-yellow-500" },
  waiting_user: { label: "Aguardando Usuário", color: "bg-orange-500/20 text-orange-500" },
  resolved: { label: "Resolvido", color: "bg-green-500/20 text-green-500" },
  closed: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
};

export function TicketChatDialog({
  ticket,
  open,
  onOpenChange,
  onUpdate,
  isAdmin,
  currentUserId,
}: TicketChatDialogProps) {
  const { userId } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [chatReferences, setChatReferences] = useState<Reference[]>([]);
  const [referenceMenuOpen, setReferenceMenuOpen] = useState(false);
  const [selectingReferenceType, setSelectingReferenceType] = useState<ReferenceType | null>(null);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [referenceDetailsOpen, setReferenceDetailsOpen] = useState(false);

  const effectiveUserId = currentUserId || userId;

  const { data: messages, isLoading, refetch: refetchMessages } = useQuery({
    queryKey: ["ticket-messages", ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select(`
          *,
          sender:profiles!support_messages_sender_id_fkey(name, avatar_url)
        `)
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: open,
  });

  // Mark messages as read
  useEffect(() => {
    if (!open || !messages || !effectiveUserId) return;

    const unreadMessages = messages.filter(m => {
      if (isAdmin) {
        return !m.is_admin && !m.read_at;
      } else {
        return m.is_admin && !m.read_at;
      }
    });

    if (unreadMessages.length > 0) {
      supabase
        .from("support_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadMessages.map(m => m.id))
        .then(() => {
          // Invalidate unread messages count
          queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
          onUpdate();
        });
    }
  }, [open, messages, isAdmin, effectiveUserId, onUpdate, queryClient]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }
    }, 100);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, ticket.id, refetchMessages]);

  const processImageFiles = (files: File[]) => {
    if (files.length + images.length > 5) {
      toast.error("Máximo de 5 imagens por mensagem");
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} não é uma imagem válida`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede 5MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setImages(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processImageFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      processImageFiles(imageFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith("image/")
    );
    
    if (files.length > 0) {
      processImageFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const image of images) {
      const ext = image.name.split('.').pop();
      const fileName = `${effectiveUserId}/${ticket.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("support-attachments")
        .upload(fileName, image);

      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("support-attachments")
        .getPublicUrl(fileName);

      urls.push(urlData.publicUrl);
    }

    return urls;
  };

  const sendMessage = async () => {
    if ((!message.trim() && images.length === 0 && chatReferences.length === 0) || !effectiveUserId) return;

    setIsSending(true);
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      // Build message with references
      let finalMessage = message.trim();
      if (chatReferences.length > 0) {
        const referenceLabels: Record<string, string> = {
          commission: "Comissão",
          referral: "Indicação",
          sub_affiliate: "Sub-afiliado"
        };
        const refsText = chatReferences.map(ref => 
          `[${referenceLabels[ref.type]}: ${ref.label}${ref.details ? ` - ${ref.details}` : ''}]`
        ).join('\n');
        finalMessage = finalMessage ? `${finalMessage}\n\n📎 Referências:\n${refsText}` : `📎 Referências:\n${refsText}`;
      }

      const insertData = {
        ticket_id: ticket.id,
        sender_id: effectiveUserId,
        message: finalMessage || null,
        image_urls: imageUrls,
        is_admin: isAdmin,
        attached_references: chatReferences.length > 0 ? JSON.parse(JSON.stringify(chatReferences)) : null,
      };

      const { error: messageError } = await supabase
        .from("support_messages")
        .insert(insertData);

      if (messageError) throw messageError;

      // Update ticket status and assign admin if needed
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (isAdmin) {
        updates.status = "waiting_user";
        if (!ticket.assigned_admin) {
          updates.assigned_admin_id = effectiveUserId;
        }
      } else {
        if (ticket.status === "waiting_user") {
          updates.status = "in_progress";
        }
      }

      await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticket.id);

      setMessage("");
      setImages([]);
      setImagePreviews([]);
      setChatReferences([]);
      setReferenceMenuOpen(false);
      setSelectingReferenceType(null);
      refetchMessages();
      onUpdate();
      
      // Scroll to the new message
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
      // Keep focus on input after state update
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 0);
    }
  };

  const getStatusChangeMessage = (status: TicketStatus, isResolved?: boolean): string => {
    if (isResolved === true) {
      return "✅ Atendimento marcado como SOLUCIONADO";
    }
    if (isResolved === false) {
      return "❌ Atendimento marcado como NÃO SOLUCIONADO";
    }
    if (status === "closed") {
      return "🔒 Atendimento ENCERRADO";
    }
    if (status === "open") {
      return "🔓 Atendimento REABERTO";
    }
    return "";
  };

  const updateTicketStatus = async (status: TicketStatus, isResolved?: boolean) => {
    setIsUpdatingStatus(true);
    try {
      const updates: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (isResolved !== undefined) {
        updates.is_resolved = isResolved;
      }

      if (status === "closed") {
        updates.closed_at = new Date().toISOString();
      }

      // Insert system message for status change
      const systemMessage = getStatusChangeMessage(status, isResolved);
      if (systemMessage && effectiveUserId) {
        await supabase
          .from("support_messages")
          .insert({
            ticket_id: ticket.id,
            sender_id: effectiveUserId,
            message: `[SYSTEM]${systemMessage}`,
            image_urls: [],
            is_admin: isAdmin,
          });
      }

      await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticket.id);

      toast.success("Status atualizado!");
      refetchMessages();
      onUpdate();

      // Show rating dialog for user when closing
      if (!isAdmin && status === "closed" && !ticket.rating) {
        setRatingDialogOpen(true);
      } else if (status !== "open") {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isClosed = ticket.status === "closed";

  const Content = (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-160px)]">
      {/* Header Info */}
      <div className="border-b pb-3 mb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              #{String(ticket.ticket_number).padStart(3, "0")}
            </span>
            <Badge className={cn("text-xs", statusConfig[ticket.status].color)}>
              {statusConfig[ticket.status].label}
            </Badge>
            {ticket.is_resolved !== null && (
              <Badge className={ticket.is_resolved ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                {ticket.is_resolved ? "Solucionado" : "Não Solucionado"}
              </Badge>
            )}
          </div>
          {isAdmin && ticket.user && (
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={ticket.user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {ticket.user.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{ticket.user.name}</span>
            </div>
          )}
        </div>
        <h3 className="font-semibold mt-2">{ticket.subject}</h3>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma mensagem ainda</p>
            </div>
          ) : (
            messages?.map((msg) => {
              const isOwnMessage = isAdmin ? msg.is_admin : !msg.is_admin;
              const isSystemMessage = msg.message?.startsWith("[SYSTEM]");

              // System message (status change log)
              if (isSystemMessage) {
                const systemText = msg.message?.replace("[SYSTEM]", "") || "";
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="bg-muted/50 border border-border/50 rounded-full px-4 py-1.5 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        {systemText}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">
                        {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2",
                      isOwnMessage
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    )}
                  >
                    {!isOwnMessage && (
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={msg.sender?.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {msg.sender?.name?.substring(0, 2).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">
                          {msg.sender?.name || (msg.is_admin ? "Suporte" : "Usuário")}
                        </span>
                      </div>
                    )}
                    {/* Attached References */}
                    {msg.attached_references && Array.isArray(msg.attached_references) && msg.attached_references.length > 0 && (
                      <div className="mb-2">
                        <ReferenceDisplay
                          references={msg.attached_references as Reference[]}
                          isOwnMessage={isOwnMessage}
                          onReferenceClick={(ref) => {
                            setSelectedReference(ref);
                            setReferenceDetailsOpen(true);
                          }}
                        />
                      </div>
                    )}
                    {msg.image_urls && msg.image_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {msg.image_urls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Anexo ${idx + 1}`}
                            className="max-w-[200px] max-h-[200px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImage(url)}
                          />
                        ))}
                      </div>
                    )}
                    {msg.message && (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className={cn(
                          "text-[10px]",
                          isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                      {/* Show read indicator for admin viewing their own messages */}
                      {isAdmin && isOwnMessage && (
                        <span className={cn(
                          "text-[10px]",
                          msg.read_at ? "text-primary-foreground/90" : "text-primary-foreground/50"
                        )}>
                          {msg.read_at ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Image Previews */}
      {imagePreviews.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3 border-t mt-3">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-16 h-16 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selected References Preview */}
      {chatReferences.length > 0 && !isClosed && (
        <div className="flex flex-wrap gap-2 pt-2">
          {chatReferences.map((ref, index) => {
            const icons = { commission: DollarSign, referral: UserPlus, sub_affiliate: Users };
            const colors = {
              commission: "bg-green-500/20 text-green-600",
              referral: "bg-blue-500/20 text-blue-600",
              sub_affiliate: "bg-purple-500/20 text-purple-600"
            };
            const Icon = icons[ref.type];
            return (
              <Badge 
                key={`${ref.type}-${ref.id}`}
                variant="outline"
                className={`${colors[ref.type]} flex items-center gap-1 pr-1`}
              >
                <Icon className="w-3 h-3" />
                <span className="max-w-[120px] truncate text-xs">{ref.label}</span>
                <button
                  type="button"
                  onClick={() => setChatReferences(prev => prev.filter((_, i) => i !== index))}
                  className="ml-1 hover:bg-background/50 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Input Area */}
      {!isClosed && (
        <div className="flex items-end gap-2 pt-3 border-t mt-3 relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || images.length >= 5}
          >
            <ImageIcon className="w-5 h-5" />
          </Button>
          
          {/* Reference Attach Button - Only for non-admin users */}
          {!isAdmin && (
            <div className="relative">
              {/* Menu inicial com 3 opções */}
              <Popover open={referenceMenuOpen} onOpenChange={setReferenceMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isSending}
                    className={chatReferences.length > 0 ? "text-primary" : ""}
                  >
                    <Link2 className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="start">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-md transition-colors text-left"
                      onClick={() => {
                        setReferenceMenuOpen(false);
                        setSelectingReferenceType("commission");
                      }}
                    >
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span>Comissão</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-md transition-colors text-left"
                      onClick={() => {
                        setReferenceMenuOpen(false);
                        setSelectingReferenceType("referral");
                      }}
                    >
                      <UserPlus className="w-4 h-4 text-blue-600" />
                      <span>Indicação</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-md transition-colors text-left"
                      onClick={() => {
                        setReferenceMenuOpen(false);
                        setSelectingReferenceType("sub_affiliate");
                      }}
                    >
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>Sub-Afiliado</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Popover de seleção de item - usa Dialog/Drawer para mobile */}
              {selectingReferenceType && (
                <div className="absolute bottom-full left-0 mb-2 z-50">
                  <div className="bg-popover border rounded-md shadow-lg p-3 w-72">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">
                        Selecione {selectingReferenceType === "commission" ? "a comissão" : 
                                  selectingReferenceType === "referral" ? "a indicação" : "o sub-afiliado"}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setSelectingReferenceType(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <ReferenceItemSelector
                      type={selectingReferenceType}
                      selectedReferences={chatReferences}
                      onSelect={(ref) => {
                        setChatReferences(prev => [...prev, ref]);
                        setSelectingReferenceType(null);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <Textarea
            ref={messageInputRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              // Auto-resize textarea
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            placeholder="Digite sua mensagem... (Cole ou arraste imagens aqui)"
            className="flex-1 min-h-[40px] max-h-[120px] resize-none py-2"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isSending}
          />
          <Button
            onClick={sendMessage}
            disabled={isSending || (!message.trim() && images.length === 0 && chatReferences.length === 0)}
            size="icon"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-3 border-t mt-3">
        {isAdmin ? (
          <>
            {ticket.status !== "resolved" && ticket.status !== "closed" && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUpdatingStatus}
                      className="gap-1"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Marcar Solucionado
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Marcar como solucionado?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Confirma que este atendimento foi solucionado?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => updateTicketStatus("resolved", true)}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUpdatingStatus}
                      className="gap-1"
                    >
                      <XCircle className="w-4 h-4 text-red-500" />
                      Não Solucionado
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Marcar como não solucionado?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Confirma que este atendimento não foi solucionado?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => updateTicketStatus("resolved", false)}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            {ticket.status !== "closed" ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus}
                    className="gap-1"
                  >
                    <Clock className="w-4 h-4" />
                    Encerrar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar atendimento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirma que deseja encerrar este atendimento?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => updateTicketStatus("closed")}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus}
                    className="gap-1"
                  >
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    Reabrir Chamado
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reabrir atendimento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirma que deseja reabrir este atendimento?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => updateTicketStatus("open")}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        ) : (
          <>
            {ticket.status !== "closed" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus}
                    className="gap-1"
                  >
                    Encerrar Chamado
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar atendimento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirma que deseja encerrar este atendimento?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => updateTicketStatus("closed")}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {ticket.status === "closed" && !ticket.rating && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRatingDialogOpen(true)}
                className="gap-1"
              >
                <Star className="w-4 h-4" />
                Avaliar Atendimento
              </Button>
            )}
          </>
        )}
      </div>

      {/* Rating Dialog */}
      <TicketRatingDialog
        ticketId={ticket.id}
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        onSuccess={() => {
          onUpdate();
          onOpenChange(false);
        }}
      />

      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        imageUrl={previewImage}
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
      />

      {/* Reference Details Dialog */}
      <ReferenceDetailsDialog
        reference={selectedReference}
        open={referenceDetailsOpen}
        onOpenChange={setReferenceDetailsOpen}
      />
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[100dvh] max-h-[100dvh] rounded-none">
          <DrawerHeader className="pb-0">
            <DrawerTitle>Chamado</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 flex-1 overflow-hidden">
            {Content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[calc(100vh-80px)] h-[calc(100vh-80px)]">
        <DialogHeader>
          <DialogTitle>Chamado</DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
