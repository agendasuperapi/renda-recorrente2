import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Clock, CheckCircle, AlertCircle, Search, User, HelpCircle, Lightbulb, MessageSquareWarning, DollarSign, Wrench, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TicketChatDialog } from "@/components/support/TicketChatDialog";
import { cn } from "@/lib/utils";

type TicketStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
type TicketType = "problema" | "sugestao" | "reclamacao" | "duvida" | "financeiro" | "tecnico" | "outro";
type TicketPriority = "baixa" | "normal" | "alta" | "urgente";

interface SupportTicket {
  id: string;
  user_id: string;
  ticket_number: number;
  ticket_type: TicketType;
  subject: string;
  status: TicketStatus;
  is_resolved: boolean | null;
  priority: TicketPriority;
  rating: number | null;
  rating_comment: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  assigned_admin_id: string | null;
  user?: {
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
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
  waiting_user: { label: "Aguardando Usuário", color: "bg-orange-500/20 text-orange-500", icon: AlertCircle },
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

export default function AdminSupport() {
  const { userId } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TicketType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ["admin-support-tickets", statusFilter, typeFilter, priorityFilter],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select(`
          *,
          user:profiles!support_tickets_user_id_fkey(name, email, avatar_url),
          assigned_admin:profiles!support_tickets_assigned_admin_id_fkey(name)
        `)
        .order("updated_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (typeFilter !== "all") {
        query = query.eq("ticket_type", typeFilter);
      }
      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter);
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
          const unreadCount = messages?.filter(m => !m.is_admin && !m.read_at).length || 0;

          return {
            ...ticket,
            last_message: lastMessage,
            unread_count: unreadCount,
          };
        })
      );

      return ticketsWithMessages as SupportTicket[];
    },
  });

  const filteredTickets = tickets?.filter((ticket) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      ticket.subject.toLowerCase().includes(search) ||
      ticket.user?.name?.toLowerCase().includes(search) ||
      ticket.user?.email?.toLowerCase().includes(search) ||
      String(ticket.ticket_number).includes(search)
    );
  });

  const openTicketsCount = tickets?.filter(t => t.status === "open").length || 0;
  const unassignedCount = tickets?.filter(t => !t.assigned_admin_id && t.status !== "closed").length || 0;
  const urgentCount = tickets?.filter(t => t.priority === "urgente" && !["resolved", "closed"].includes(t.status)).length || 0;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Central de Suporte</h1>
        <p className="text-muted-foreground">
          Gerencie todos os chamados de suporte
        </p>
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
                <p className="text-xs text-muted-foreground">Novos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <User className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unassignedCount}</p>
                <p className="text-xs text-muted-foreground">Sem Atribuição</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{urgentCount}</p>
                <p className="text-xs text-muted-foreground">Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por assunto, usuário ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="waiting_user">Aguardando Usuário</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="closed">Encerrados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TicketType | "all")}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {Object.entries(typeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TicketPriority | "all")}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(priorityConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredTickets?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">Nenhum chamado encontrado</h3>
              <p className="text-muted-foreground text-sm">
                Nenhum chamado corresponde aos filtros selecionados.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTickets?.map((ticket) => {
            const StatusIcon = statusConfig[ticket.status].icon;
            const TypeIcon = typeConfig[ticket.ticket_type].icon;

            return (
              <Card
                key={ticket.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  ticket.unread_count && ticket.unread_count > 0 && "border-primary/50",
                  ticket.priority === "urgente" && ticket.status !== "closed" && "border-red-500/50"
                )}
                onClick={() => setSelectedTicket(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{String(ticket.ticket_number).padStart(3, "0")}
                        </span>
                        <Badge className={cn("text-xs", statusConfig[ticket.status].color)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig[ticket.status].label}
                        </Badge>
                        <Badge className={cn("text-xs", priorityConfig[ticket.priority].color)}>
                          {priorityConfig[ticket.priority].label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <TypeIcon className="w-3 h-3 mr-1" />
                          {typeConfig[ticket.ticket_type].label}
                        </Badge>
                        {ticket.unread_count && ticket.unread_count > 0 && (
                          <Badge className="bg-destructive text-destructive-foreground text-xs">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {ticket.unread_count} nova{ticket.unread_count > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold truncate">{ticket.subject}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">{ticket.user?.name}</span>
                        {" • "}
                        <span>{ticket.user?.email}</span>
                      </p>
                      {ticket.last_message && (
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {ticket.last_message.is_admin ? "Admin: " : "Usuário: "}
                          {ticket.last_message.message || "[Imagem]"}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>
                          Criado: {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        <span>
                          Atualizado: {format(new Date(ticket.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        {ticket.assigned_admin ? (
                          <span className="text-primary">Atendido por: {ticket.assigned_admin.name}</span>
                        ) : (
                          <span className="text-orange-500">Sem atribuição</span>
                        )}
                      </div>
                    </div>
                    {ticket.rating && (
                      <div className="text-right">
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
                        {ticket.rating_comment && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                            "{ticket.rating_comment}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Chat Dialog */}
      {selectedTicket && (
        <TicketChatDialog
          ticket={selectedTicket}
          open={!!selectedTicket}
          onOpenChange={(open) => !open && setSelectedTicket(null)}
          onUpdate={() => refetch()}
          isAdmin={true}
          currentUserId={userId || ""}
        />
      )}
    </div>
  );
}
