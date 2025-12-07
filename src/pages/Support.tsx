import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MessageCircle, Clock, CheckCircle, AlertCircle, HelpCircle, Lightbulb, MessageSquareWarning, DollarSign, Wrench, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateTicketDialog } from "@/components/support/CreateTicketDialog";
import { TicketChatDialog } from "@/components/support/TicketChatDialog";
import { cn } from "@/lib/utils";

type TicketStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
type TicketType = "problema" | "sugestao" | "reclamacao" | "duvida" | "financeiro" | "tecnico" | "outro";
type TicketPriority = "baixa" | "normal" | "alta" | "urgente";

interface SupportTicket {
  id: string;
  ticket_number: number;
  ticket_type: TicketType;
  subject: string;
  status: TicketStatus;
  is_resolved: boolean | null;
  priority: TicketPriority;
  rating: number | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  assigned_admin_id: string | null;
  assigned_admin?: {
    name: string;
  } | null;
  last_message?: {
    message: string;
    is_admin: boolean;
    created_at: string;
  } | null;
  unread_count?: number;
}

const statusConfig: Record<TicketStatus, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "Aberto", color: "bg-blue-500/20 text-blue-500", icon: Clock },
  in_progress: { label: "Em Andamento", color: "bg-yellow-500/20 text-yellow-500", icon: MessageCircle },
  waiting_user: { label: "Aguardando Você", color: "bg-orange-500/20 text-orange-500", icon: AlertCircle },
  resolved: { label: "Resolvido", color: "bg-green-500/20 text-green-500", icon: CheckCircle },
  closed: { label: "Encerrado", color: "bg-muted text-muted-foreground", icon: CheckCircle },
};

const typeConfig: Record<TicketType, { label: string; icon: React.ElementType }> = {
  problema: { label: "Problema", icon: AlertCircle },
  sugestao: { label: "Sugestão", icon: Lightbulb },
  reclamacao: { label: "Reclamação", icon: MessageSquareWarning },
  duvida: { label: "Dúvida", icon: HelpCircle },
  financeiro: { label: "Financeiro", icon: DollarSign },
  tecnico: { label: "Técnico", icon: Wrench },
  outro: { label: "Outro", icon: MoreHorizontal },
};

const priorityConfig: Record<TicketPriority, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", color: "bg-blue-500/20 text-blue-500" },
  alta: { label: "Alta", color: "bg-orange-500/20 text-orange-500" },
  urgente: { label: "Urgente", color: "bg-red-500/20 text-red-500" },
};

export default function Support() {
  const { userId } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ["support-tickets", userId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select(`
          *,
          assigned_admin:profiles!support_tickets_assigned_admin_id_fkey(name)
        `)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch last message and unread count for each ticket
      const ticketsWithMessages = await Promise.all(
        (data || []).map(async (ticket) => {
          const { data: messages } = await supabase
            .from("support_messages")
            .select("message, is_admin, created_at, read_at")
            .eq("ticket_id", ticket.id)
            .order("created_at", { ascending: false })
            .limit(10);

          const lastMessage = messages?.[0] || null;
          const unreadCount = messages?.filter(m => m.is_admin && !m.read_at).length || 0;

          return {
            ...ticket,
            last_message: lastMessage,
            unread_count: unreadCount,
          };
        })
      );

      return ticketsWithMessages as SupportTicket[];
    },
    enabled: !!userId,
  });

  // Real-time subscription for message updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('support-messages-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  const openTicketsCount = tickets?.filter(t => !["resolved", "closed"].includes(t.status)).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Suporte</h1>
          <p className="text-muted-foreground">
            Abra chamados e acompanhe suas solicitações
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Chamado
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter("all")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tickets?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter("open")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openTicketsCount}</p>
                <p className="text-xs text-muted-foreground">Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter("waiting_user")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {tickets?.filter(t => t.status === "waiting_user").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Aguardando</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter("resolved")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {tickets?.filter(t => t.status === "resolved").length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Badges */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "Todos" },
          { value: "open", label: "Abertos" },
          { value: "in_progress", label: "Em Andamento" },
          { value: "waiting_user", label: "Aguardando Você" },
          { value: "resolved", label: "Resolvidos" },
          { value: "closed", label: "Encerrados" },
        ].map((filter) => (
          <Badge
            key={filter.value}
            variant={statusFilter === filter.value ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStatusFilter(filter.value as TicketStatus | "all")}
          >
            {filter.label}
          </Badge>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : tickets?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">Nenhum chamado encontrado</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {statusFilter === "all"
                  ? "Você ainda não abriu nenhum chamado de suporte."
                  : "Nenhum chamado encontrado com este filtro."}
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                Abrir Primeiro Chamado
              </Button>
            </CardContent>
          </Card>
        ) : (
          tickets?.map((ticket) => {
            const StatusIcon = statusConfig[ticket.status].icon;
            const TypeIcon = typeConfig[ticket.ticket_type].icon;

            return (
              <Card
                key={ticket.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  ticket.unread_count && ticket.unread_count > 0 && "border-primary/50"
                )}
                onClick={() => setSelectedTicket(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{String(ticket.ticket_number).padStart(3, "0")}
                        </span>
                        <Badge className={cn("text-xs", statusConfig[ticket.status].color)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[ticket.status].label}
                        </Badge>
                        {ticket.priority !== "normal" && (
                          <Badge className={cn("text-xs", priorityConfig[ticket.priority].color)}>
                            {priorityConfig[ticket.priority].label}
                          </Badge>
                        )}
                        {ticket.unread_count && ticket.unread_count > 0 && (
                          <Badge className="bg-destructive text-destructive-foreground text-xs">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {ticket.unread_count} nova{ticket.unread_count > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold truncate">{ticket.subject}</h3>
                      {ticket.last_message && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {ticket.last_message.is_admin ? "Suporte: " : "Você: "}
                          {ticket.last_message.message || "[Imagem]"}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TypeIcon className="w-3 h-3" />
                          {typeConfig[ticket.ticket_type].label}
                        </span>
                        <span>
                          {format(new Date(ticket.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {ticket.assigned_admin && (
                          <span>Atendido por: {ticket.assigned_admin.name}</span>
                        )}
                      </div>
                    </div>
                    {ticket.rating && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "text-lg",
                              i < ticket.rating! ? "text-yellow-500" : "text-muted-foreground/30"
                            )}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialogs */}
      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          refetch();
          setCreateDialogOpen(false);
        }}
      />

      {selectedTicket && (
        <TicketChatDialog
          ticket={selectedTicket}
          open={!!selectedTicket}
          onOpenChange={(open) => !open && setSelectedTicket(null)}
          onUpdate={() => refetch()}
          isAdmin={false}
        />
      )}
    </div>
  );
}
