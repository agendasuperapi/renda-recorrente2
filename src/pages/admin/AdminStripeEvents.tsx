import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, CheckCircle, XCircle, Clock, Copy, Filter, AlertCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Database, RefreshCw, User, CreditCard, Code, ArrowUpDown, ArrowUp, ArrowDown, LayoutList, LayoutGrid } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ClientProfile = ({ userId }: { userId: string | null }) => {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          Carregando dados do cliente...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Nenhum dado de cliente encontrado.
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[50vh]">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Nome</p>
          <p className="text-sm">{profile.name || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Username</p>
          <p className="text-sm">{profile.username || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Telefone</p>
          <p className="text-sm">{profile.phone || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">CPF</p>
          <p className="text-sm">{profile.cpf || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p>
          <p className="text-sm">
            {profile.birth_date 
              ? format(new Date(profile.birth_date), "dd/MM/yyyy", { locale: ptBR })
              : "-"}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Gênero</p>
          <p className="text-sm">{profile.gender || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">CEP</p>
          <p className="text-sm">{profile.cep || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Rua</p>
          <p className="text-sm">{profile.street || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Número</p>
          <p className="text-sm">{profile.number || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Complemento</p>
          <p className="text-sm">{profile.complement || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Bairro</p>
          <p className="text-sm">{profile.neighborhood || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Cidade</p>
          <p className="text-sm">{profile.city || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Estado</p>
          <p className="text-sm">{profile.state || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Instagram</p>
          <p className="text-sm">{profile.instagram || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Facebook</p>
          <p className="text-sm">{profile.facebook || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">TikTok</p>
          <p className="text-sm">{profile.tiktok || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Código de Afiliado</p>
          <p className="text-sm font-mono">{profile.affiliate_code || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Código de Indicação</p>
          <p className="text-sm font-mono">{profile.referrer_code || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Tipo de PIX</p>
          <p className="text-sm">{profile.pix_type || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Chave PIX</p>
          <p className="text-sm">{profile.pix_key || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Cadastrado em</p>
          <p className="text-sm">
            {profile.created_at 
              ? format(new Date(profile.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
              : "-"}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Atualizado em</p>
          <p className="text-sm">
            {profile.updated_at 
              ? format(new Date(profile.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
              : "-"}
          </p>
        </div>
      </div>
    </ScrollArea>
  );
};

const PlanInfo = ({ userId }: { userId: string | null }) => {
  const { data: subscription, isLoading: loadingSubscription } = useQuery({
    queryKey: ["user-subscription", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plans (
            name,
            price,
            billing_period,
            commission_percentage
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: commission } = useQuery({
    queryKey: ["user-commission", subscription?.id],
    queryFn: async () => {
      if (!subscription?.id) return null;
      const { data, error } = await supabase
        .from("commissions")
        .select("amount, percentage, status, created_at")
        .eq("subscription_id", subscription.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!subscription?.id,
  });

  if (loadingSubscription) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          Carregando dados do plano...
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Nenhum plano encontrado para este cliente.
      </div>
    );
  }

  const plan = subscription.plans as any;
  const hasCancellation = subscription.cancel_at || subscription.cancelled_at || subscription.cancel_at_period_end;

  return (
    <ScrollArea className="max-h-[50vh]">
      <div className="space-y-6">
        {hasCancellation && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-destructive mb-2">Cancelamento Solicitado</h4>
                  {subscription.cancel_at_period_end && (
                    <p className="text-sm text-muted-foreground mb-2">
                      A assinatura será cancelada ao final do período atual
                    </p>
                  )}
                  {subscription.cancel_at && (
                    <div className="text-sm">
                      <span className="font-medium">Cancelamento agendado para: </span>
                      <span className="text-destructive">
                        {format(new Date(subscription.cancel_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {subscription.cancelled_at && (
                    <div className="text-sm">
                      <span className="font-medium">Cancelado em: </span>
                      <span className="text-destructive">
                        {format(new Date(subscription.cancelled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {subscription.cancellation_details && (
                    <div className="mt-3 space-y-1 text-sm">
                      {(subscription.cancellation_details as any).reason && (
                        <div>
                          <span className="font-medium">Motivo: </span>
                          <span>{(subscription.cancellation_details as any).reason}</span>
                        </div>
                      )}
                      {(subscription.cancellation_details as any).comment && (
                        <div>
                          <span className="font-medium">Comentário: </span>
                          <span>{(subscription.cancellation_details as any).comment}</span>
                        </div>
                      )}
                      {(subscription.cancellation_details as any).feedback && (
                        <div>
                          <span className="font-medium">Feedback: </span>
                          <span>{(subscription.cancellation_details as any).feedback}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Plano</p>
            <p className="text-lg font-semibold">{plan?.name || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="mt-1">
              {subscription.status}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Valor do Plano</p>
            <p className="text-lg font-semibold">
              {plan?.price ? `R$ ${Number(plan.price).toFixed(2)}` : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Período</p>
            <p className="text-sm">{plan?.billing_period || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Início do Período</p>
            <p className="text-sm">
              {subscription.current_period_start 
                ? format(new Date(subscription.current_period_start), "dd/MM/yyyy", { locale: ptBR })
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Fim do Período</p>
            <p className="text-sm">
              {subscription.current_period_end 
                ? format(new Date(subscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Comissão (%)</p>
            <p className="text-sm font-semibold text-primary">
              {plan?.commission_percentage ? `${plan.commission_percentage}%` : "-"}
            </p>
          </div>
          {commission && (
            <>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Comissão</p>
                <p className="text-sm font-semibold text-primary">
                  R$ {Number(commission.amount).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status Comissão</p>
                <Badge variant="outline" className="mt-1">
                  {commission.status}
                </Badge>
              </div>
            </>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Ambiente</p>
            <Badge variant={subscription.environment === 'production' ? 'default' : 'secondary'} className="mt-1">
              {subscription.environment || 'test'}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Criado em</p>
            <p className="text-sm">
              {subscription.created_at 
                ? format(new Date(subscription.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Atualizado em</p>
            <p className="text-sm">
              {subscription.updated_at 
                ? format(new Date(subscription.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                : "-"}
            </p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

const AdminStripeEvents = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCancelAtPeriodEnd, setShowCancelAtPeriodEnd] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"compact" | "full">("compact");

  const { data: eventsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["stripe-events", debouncedSearch, showCancelAtPeriodEnd, page, pageSize, eventTypeFilter, dateFrom, dateTo, environmentFilter, sortColumn, sortDirection],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("view_admin_stripe_events")
        .select("*", { count: "exact" })
        .order(sortColumn, { ascending: sortDirection === "asc" })
        .range(from, to);

      if (debouncedSearch) {
        query = query.or(
          `event_id.ilike.%${debouncedSearch}%,event_type.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,user_name.ilike.%${debouncedSearch}%,stripe_subscription_id.ilike.%${debouncedSearch}%`
        );
      }

      if (eventTypeFilter && eventTypeFilter !== "all") {
        query = query.eq("event_type", eventTypeFilter);
      }

      if (environmentFilter && environmentFilter !== "all") {
        query = query.eq("environment", environmentFilter);
      }

      if (dateFrom) {
        query = query.gte("created_at", dateFrom.toISOString());
      }

      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;
      
      // Filtrar client-side para cancel_at_period_end
      let filteredData = data;
      if (showCancelAtPeriodEnd && data) {
        filteredData = data.filter((event: any) => 
          event.event_type === 'customer.subscription.updated' && 
          (event.event_data as any)?.cancel_at_period_end === true
        );
      }
      
      return { events: filteredData, total: count || 0 };
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev ?? { events: [], total: 0 },
  });

  const events = eventsData?.events || [];
  const totalCount = eventsData?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription", selectedSubscriptionId],
    queryFn: async () => {
      if (!selectedSubscriptionId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("stripe_subscription_id", selectedSubscriptionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSubscriptionId && subscriptionDialogOpen,
  });

  const handleViewDetails = (event: any) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleViewSubscription = (stripeSubscriptionId: string) => {
    setSelectedSubscriptionId(stripeSubscriptionId);
    setSubscriptionDialogOpen(true);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleCopyJson = () => {
    if (selectedEvent) {
      navigator.clipboard.writeText(JSON.stringify(selectedEvent.event_data, null, 2));
      toast({
        title: "Copiado!",
        description: "JSON copiado para a área de transferência",
      });
    }
  };

  const getStatusBadge = (processed: boolean) => {
    if (processed) {
      return (
        <Badge variant="default" className="bg-success text-success-foreground">
          <CheckCircle className="w-3 h-3 mr-1" />
          Processado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  const getEventTypeBadge = (eventType: string) => {
    const colors: Record<string, string> = {
      "checkout.session.completed": "bg-primary text-primary-foreground",
      "customer.subscription.created": "bg-success text-success-foreground",
      "customer.subscription.updated": "bg-info text-info-foreground",
      "customer.subscription.deleted": "bg-destructive text-destructive-foreground",
      "customer.subscription.trial_will_end": "bg-warning text-warning-foreground",
      "invoice.paid": "bg-success text-success-foreground",
      "invoice.payment_failed": "bg-destructive text-destructive-foreground",
      "payment_method.attached": "bg-warning text-white",
      "customer.created": "bg-secondary text-secondary-foreground",
    };

    return (
      <Badge className={colors[eventType] || "bg-muted"}>
        {eventType}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Eventos Stripe</h1>
        <p className="text-muted-foreground">
          Monitore todos os eventos recebidos do Stripe via webhooks
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID do evento, Subscription ID, tipo, email..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                type="text"
                autoComplete="off"
              />
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Ambiente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos ambientes</SelectItem>
                  <SelectItem value="test">Teste</SelectItem>
                  <SelectItem value="production">Produção</SelectItem>
                </SelectContent>
              </Select>

              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo de evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="checkout.session.completed">Checkout Completed</SelectItem>
                  <SelectItem value="customer.subscription.created">Subscription Created</SelectItem>
                  <SelectItem value="customer.subscription.updated">Subscription Updated</SelectItem>
                  <SelectItem value="customer.subscription.deleted">Subscription Deleted</SelectItem>
                  <SelectItem value="invoice.paid">Invoice Paid</SelectItem>
                  <SelectItem value="invoice.payment_failed">Invoice Failed</SelectItem>
                  <SelectItem value="payment_method.attached">Payment Method</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 flex-1 sm:flex-none justify-start">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="truncate">
                      {dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "Data inicial"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 flex-1 sm:flex-none justify-start">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="truncate">
                      {dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "Data final"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={showCancelAtPeriodEnd ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCancelAtPeriodEnd(!showCancelAtPeriodEnd)}
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Cancelamento Agendado</span>
                  <span className="sm:hidden">Cancelados</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="gap-2"
                  disabled={isFetching}
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Atualizar</span>
                </Button>

                {(dateFrom || dateTo || eventTypeFilter !== "all" || environmentFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom(undefined);
                      setDateTo(undefined);
                      setEventTypeFilter("all");
                      setEnvironmentFilter("all");
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>

              {/* View Mode Toggle - Hidden on mobile */}
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as "compact" | "full")}
                className="flex bg-muted/50 rounded-lg p-1"
              >
                <ToggleGroupItem 
                  value="compact" 
                  aria-label="Layout compacto"
                  className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
                >
                  <LayoutList className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="full" 
                  aria-label="Layout completo"
                  className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
                >
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && !eventsData ? (
            <TableSkeleton title="Eventos Stripe" columns={7} rows={10} showSearch />
          ) : (
            <>
              {/* Mobile Compact View */}
              <div className={cn(
                "sm:hidden rounded-md border",
                viewMode !== "compact" && "hidden"
              )}>
                {isFetching && !isLoading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Buscando...
                    </div>
                  </div>
                )}
                {events && events.length > 0 ? (
                  <div className="divide-y">
                    {events.map((event) => (
                      <div key={event.id} className="flex items-center gap-3 p-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            {getEventTypeBadge(event.event_type)}
                          </div>
                          <p className="text-sm truncate">{event.email || "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {(event as any).stripe_subscription_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewSubscription((event as any).stripe_subscription_id)}
                            >
                              <Database className="w-4 h-4 text-primary" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDetails(event)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum evento encontrado
                  </div>
                )}
              </div>

              {/* Mobile Full Cards View */}
              <div className={cn(
                "sm:hidden space-y-3",
                viewMode !== "full" && "hidden"
              )}>
                {isFetching && !isLoading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Buscando...
                    </div>
                  </div>
                )}
                {events && events.length > 0 ? (
                  events.map((event) => (
                    <Card key={event.id} className="overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        {/* Header with Type Badge and Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {getEventTypeBadge(event.event_type)}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(event.processed)}
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm font-medium truncate">{event.email || "-"}</p>
                        </div>

                        {/* Date and Reason Row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Data</p>
                            <p className="text-sm">
                              {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Reason</p>
                            <p className="text-sm truncate">{(event as any).reason || "-"}</p>
                          </div>
                        </div>

                        {/* Cancellation Badge */}
                        {event.event_type === 'customer.subscription.updated' && 
                        (event.event_data as any)?.cancel_at_period_end === true && (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertCircle className="w-3 h-3" />
                            Cancelamento Agendado
                          </Badge>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {(event as any).stripe_subscription_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSubscription((event as any).stripe_subscription_id)}
                              className="flex-1 gap-2"
                            >
                              <Database className="w-4 h-4 text-primary" />
                              Subscription
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(event)}
                            className="flex-1 gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Detalhes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum evento encontrado
                  </div>
                )}
              </div>

              {/* Desktop/Tablet Table View - Compact Mode */}
              <div className={cn(
                "hidden sm:block rounded-md border relative",
                viewMode !== "compact" && "sm:hidden"
              )}>
                {isFetching && !isLoading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Buscando...
                    </div>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("event_type")} className="h-8 p-0 hover:bg-transparent">
                          Tipo
                          <SortIcon column="event_type" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("email")} className="h-8 p-0 hover:bg-transparent">
                          Email
                          <SortIcon column="email" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("created_at")} className="h-8 p-0 hover:bg-transparent">
                          Data
                          <SortIcon column="created_at" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events && events.length > 0 ? (
                      events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            {getEventTypeBadge(event.event_type)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {event.email || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(event as any).stripe_subscription_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewSubscription((event as any).stripe_subscription_id)}
                                  title="Ver dados da subscription"
                                >
                                  <Database className="w-4 h-4 text-primary" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewDetails(event)}
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground py-8"
                        >
                          Nenhum evento encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Desktop/Tablet Table View - Full Mode */}
              <div className={cn(
                "hidden sm:block rounded-md border relative",
                viewMode !== "full" && "sm:hidden"
              )}>
                {isFetching && !isLoading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Buscando...
                    </div>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("event_type")} className="h-8 p-0 hover:bg-transparent">
                          Tipo
                          <SortIcon column="event_type" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("email")} className="h-8 p-0 hover:bg-transparent">
                          Email
                          <SortIcon column="email" />
                        </Button>
                      </TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("created_at")} className="h-8 p-0 hover:bg-transparent">
                          Data
                          <SortIcon column="created_at" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("processed")} className="h-8 p-0 hover:bg-transparent">
                          Status
                          <SortIcon column="processed" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-center">Cancelamento</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events && events.length > 0 ? (
                      events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            {getEventTypeBadge(event.event_type)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {event.email || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {(event as any).reason || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(event.processed)}
                          </TableCell>
                          <TableCell className="text-center">
                            {event.event_type === 'customer.subscription.updated' && 
                            (event.event_data as any)?.cancel_at_period_end === true && (
                              <div className="flex justify-center">
                                <Badge variant="destructive" className="gap-1 text-xs">
                                  <AlertCircle className="w-3 h-3" />
                                  Agendado
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(event as any).stripe_subscription_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewSubscription((event as any).stripe_subscription_id)}
                                  title="Ver dados da subscription"
                                >
                                  <Database className="w-4 h-4 text-primary" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewDetails(event)}
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground py-8"
                        >
                          Nenhum evento encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t">
            <span className="text-sm text-muted-foreground text-center sm:text-left">
              {events.length > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, totalCount)} de {totalCount}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Anterior</span>
              </Button>

              <span className="text-sm text-muted-foreground px-2">
                {page}/{totalPages || 1}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
              >
                <span className="hidden sm:inline mr-1">Próxima</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">Itens:</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-info/5 border-info/20">
          <CardHeader>
            <CardTitle className="text-sm">Sobre os Eventos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Os eventos são recebidos automaticamente via webhooks</p>
            <p>• Todos os eventos são armazenados para auditoria</p>
            <p>• Os eventos processados são marcados automaticamente</p>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20">
          <CardHeader>
            <CardTitle className="text-sm">Tipos de Eventos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>checkout.session.completed</strong> - Pagamento concluído</p>
            <p>• <strong>subscription.created/updated</strong> - Assinatura criada/atualizada</p>
            <p>• <strong>invoice.paid/failed</strong> - Fatura paga/falhada</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <Tabs defaultValue="event" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="event">
                  <Database className="w-4 h-4 mr-2" />
                  Detalhes do Evento
                </TabsTrigger>
                <TabsTrigger value="json">
                  <Code className="w-4 h-4 mr-2" />
                  Evento Json
                </TabsTrigger>
                <TabsTrigger value="client" disabled={!selectedEvent.user_id}>
                  <User className="w-4 h-4 mr-2" />
                  Cliente
                </TabsTrigger>
                <TabsTrigger value="plan" disabled={!selectedEvent.user_id}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Plano
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="event" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Event ID</p>
                    <p className="text-sm font-mono break-all">{selectedEvent.event_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                    <div className="mt-1">{getEventTypeBadge(selectedEvent.event_type)}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedEvent.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data</p>
                    <p className="text-sm">
                      {format(new Date(selectedEvent.created_at), "dd/MM/yyyy HH:mm:ss", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedEvent.processed)}</div>
                  </div>
                  {selectedEvent.user_id && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">User ID</p>
                      <p className="text-sm font-mono text-xs break-all">{selectedEvent.user_id}</p>
                    </div>
                  )}
                  {selectedEvent.event_type === 'customer.subscription.updated' && 
                   (selectedEvent.event_data as any)?.cancel_at_period_end && (
                    <div className="col-span-2">
                      <Badge variant="destructive" className="gap-1">
                        <Clock className="w-3 h-3" />
                        Cancelamento Agendado para o Final do Período
                      </Badge>
                    </div>
                  )}
                  {selectedEvent.event_type === 'customer.subscription.updated' && 
                   (selectedEvent.event_data as any)?.cancel_at_period_end && 
                   (selectedEvent.event_data as any)?.cancellation_details && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Detalhes do Cancelamento
                      </p>
                      <div className="max-h-[200px] w-full overflow-y-auto overflow-x-hidden rounded-md border bg-muted/50 p-4">
                        <pre className="text-xs whitespace-pre-wrap break-words w-full">
                          {JSON.stringify((selectedEvent.event_data as any).cancellation_details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="json" className="space-y-4 mt-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      JSON Completo do Evento
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyJson}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <div className="max-h-[500px] w-full overflow-y-auto overflow-x-hidden rounded-md border bg-muted/50 p-4">
                    <pre className="text-xs whitespace-pre-wrap break-all w-full overflow-wrap-anywhere">
                      {JSON.stringify(selectedEvent.event_data, null, 2)}
                    </pre>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="client" className="space-y-4 mt-4">
                <ClientProfile userId={selectedEvent.user_id} />
              </TabsContent>
              
              <TabsContent value="plan" className="space-y-4 mt-4">
                <PlanInfo userId={selectedEvent.user_id} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes da Subscription</DialogTitle>
          </DialogHeader>
          {subscriptionData ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Subscription ID</p>
                    <p className="text-sm font-mono text-xs break-all">{subscriptionData.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Stripe Subscription ID</p>
                    <p className="text-sm font-mono text-xs break-all">{subscriptionData.stripe_subscription_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                    <p className="text-sm font-mono text-xs break-all">{subscriptionData.user_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Plan ID</p>
                    <p className="text-sm font-mono text-xs break-all">{subscriptionData.plan_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={subscriptionData.status === 'active' ? 'default' : 'secondary'}>
                      {subscriptionData.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ambiente</p>
                    <Badge variant={subscriptionData.environment === 'production' ? 'default' : 'secondary'}>
                      {subscriptionData.environment || 'test'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Início do Período</p>
                    <p className="text-sm">
                      {subscriptionData.current_period_start 
                        ? format(new Date(subscriptionData.current_period_start), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fim do Período</p>
                    <p className="text-sm">
                      {subscriptionData.current_period_end 
                        ? format(new Date(subscriptionData.current_period_end), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"}
                    </p>
                  </div>
                  {subscriptionData.trial_end && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Fim do Trial</p>
                      <p className="text-sm">
                        {format(new Date(subscriptionData.trial_end), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  {subscriptionData.cancel_at && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cancelamento Agendado</p>
                      <p className="text-sm text-destructive">
                        {format(new Date(subscriptionData.cancel_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  {subscriptionData.cancelled_at && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cancelado em</p>
                      <p className="text-sm">
                        {format(new Date(subscriptionData.cancelled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  {(subscriptionData as any).cancellation_details && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Detalhes do Cancelamento (JSON)
                      </p>
                      <div className="max-h-[200px] w-full overflow-y-auto overflow-x-hidden rounded-md border bg-muted/50 p-4">
                        <pre className="text-xs whitespace-pre-wrap break-words w-full">
                          {JSON.stringify((subscriptionData as any).cancellation_details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Criado em</p>
                    <p className="text-sm">
                      {format(new Date(subscriptionData.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Atualizado em</p>
                    <p className="text-sm">
                      {format(new Date(subscriptionData.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {subscriptionData.payment_method_data && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Dados do Método de Pagamento
                    </p>
                    <div className="max-h-[200px] w-full overflow-y-auto overflow-x-hidden rounded-md border bg-muted/50 p-4">
                      <pre className="text-xs whitespace-pre-wrap break-words w-full">
                        {JSON.stringify(subscriptionData.payment_method_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Carregando dados da subscription...
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStripeEvents;
