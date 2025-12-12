import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
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

const ClientProfile = ({ userId, email }: { userId: string | null; email?: string | null }) => {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId, email],
    queryFn: async () => {
      if (userId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (!error && data) return data;
      }
      
      if (email) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", email)
          .maybeSingle();
        if (!error && data) return data;
      }
      
      return null;
    },
    enabled: !!userId || !!email,
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

const PlanInfo = ({ userId, email }: { userId: string | null; email?: string | null }) => {
  const { data: subscription, isLoading: loadingSubscription } = useQuery({
    queryKey: ["user-subscription", userId, email],
    queryFn: async () => {
      if (userId) {
        const { data, error } = await supabase
          .from("subscriptions")
          .select(`
            *,
            plans (
              name,
              price,
              billing_period
            )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) return data;
      }
      
      if (email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        
        if (profile) {
          const { data, error } = await supabase
            .from("subscriptions")
            .select(`
              *,
              plans (
                name,
                price,
                billing_period
              )
            `)
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!error && data) return data;
        }
      }
      
      return null;
    },
    enabled: !!userId || !!email,
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

export default function AdminStripeEventsContent() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
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
  const [sortColumn, setSortColumn] = useState<string | null>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"compact" | "full">("compact");
  const [showFilters, setShowFilters] = useState(false);

  const { data: stripeEvents, isLoading, refetch } = useQuery({
    queryKey: ["stripe-events", debouncedSearch, page, pageSize, eventTypeFilter, dateFrom, dateTo, showCancelAtPeriodEnd, environmentFilter, sortColumn, sortDirection],
    queryFn: async () => {
      let query = supabase
        .from("stripe_events")
        .select("*", { count: "exact" });
      
      if (debouncedSearch) {
        query = query.or(`event_type.ilike.%${debouncedSearch}%,customer_email.ilike.%${debouncedSearch}%,stripe_customer_id.ilike.%${debouncedSearch}%,stripe_subscription_id.ilike.%${debouncedSearch}%`);
      }
      
      if (eventTypeFilter !== "all") {
        query = query.eq("event_type", eventTypeFilter);
      }

      if (environmentFilter !== "all") {
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
      
      if (showCancelAtPeriodEnd) {
        query = query.eq("cancel_at_period_end", true);
      }

      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === "asc" });
      }
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await query.range(from, to);
      
      if (error) throw error;
      return { data, count };
    },
  });

  const { data: eventTypes } = useQuery({
    queryKey: ["stripe-event-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stripe_events")
        .select("event_type")
        .order("event_type");
      
      if (error) throw error;
      
      const uniqueTypes = [...new Set(data?.map(e => e.event_type))];
      return uniqueTypes;
    },
  });

  const { data: subscriptionDetails, isLoading: loadingSubscription } = useQuery({
    queryKey: ["subscription-details", selectedSubscriptionId],
    queryFn: async () => {
      if (!selectedSubscriptionId) return null;
      
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plans (
            name,
            price,
            billing_period
          )
        `)
        .eq("stripe_subscription_id", selectedSubscriptionId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSubscriptionId,
  });

  const totalPages = Math.ceil((stripeEvents?.count || 0) / pageSize);

  const handleViewDetails = (event: any) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência",
    });
  };

  const handleSubscriptionClick = (subscriptionId: string) => {
    setSelectedSubscriptionId(subscriptionId);
    setSubscriptionDialogOpen(true);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
    }
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const getStatusIcon = (eventType: string) => {
    if (eventType.includes("succeeded") || eventType.includes("created") || eventType.includes("paid")) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (eventType.includes("failed") || eventType.includes("deleted") || eventType.includes("canceled")) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    } else if (eventType.includes("pending") || eventType.includes("updated")) {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <Database className="w-4 h-4 text-muted-foreground" />;
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/\./g, " → ").replace(/_/g, " ");
  };

  const renderEventDetailsContent = () => {
    if (!selectedEvent) return null;
    
    return (
      <Tabs defaultValue="event" className="w-full">
        <TabsList className="grid grid-cols-3 gap-2 bg-muted/50 p-1.5 rounded-xl mb-4">
          <TabsTrigger value="event" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border rounded-lg">
            <Code className="w-4 h-4 mr-2" />
            Evento
          </TabsTrigger>
          <TabsTrigger value="client" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border rounded-lg">
            <User className="w-4 h-4 mr-2" />
            Cliente
          </TabsTrigger>
          <TabsTrigger value="plan" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border rounded-lg">
            <CreditCard className="w-4 h-4 mr-2" />
            Plano
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="event" forceMount className="data-[state=inactive]:hidden">
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedEvent.event_type)}
                    <p className="text-sm">{selectedEvent.event_type}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ambiente</p>
                  <Badge variant={selectedEvent.environment === 'production' ? 'default' : 'secondary'}>
                    {selectedEvent.environment || 'test'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data</p>
                  <p className="text-sm">{format(new Date(selectedEvent.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedEvent.customer_email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer ID</p>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-mono truncate max-w-[150px]">{selectedEvent.stripe_customer_id || "-"}</p>
                    {selectedEvent.stripe_customer_id && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(selectedEvent.stripe_customer_id)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subscription ID</p>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-mono truncate max-w-[150px]">{selectedEvent.stripe_subscription_id || "-"}</p>
                    {selectedEvent.stripe_subscription_id && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(selectedEvent.stripe_subscription_id)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {selectedEvent.cancel_at_period_end && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    ⚠️ Cancelamento agendado para o final do período
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Payload</p>
                <ScrollArea className="h-[200px]">
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="client" forceMount className="data-[state=inactive]:hidden">
          <ClientProfile userId={selectedEvent.user_id} email={selectedEvent.customer_email} />
        </TabsContent>
        
        <TabsContent value="plan" forceMount className="data-[state=inactive]:hidden">
          <PlanInfo userId={selectedEvent.user_id} email={selectedEvent.customer_email} />
        </TabsContent>
      </Tabs>
    );
  };

  const renderSubscriptionDetailsContent = () => {
    if (loadingSubscription) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Carregando detalhes da assinatura...
          </div>
        </div>
      );
    }

    if (!subscriptionDetails) {
      return (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          Nenhum detalhe de assinatura encontrado.
        </div>
      );
    }

    const plan = subscriptionDetails.plans as any;
    const hasCancellation = subscriptionDetails.cancel_at || subscriptionDetails.cancelled_at || subscriptionDetails.cancel_at_period_end;

    return (
      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-6">
          {hasCancellation && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-destructive mb-2">Cancelamento Detectado</h4>
                    {subscriptionDetails.cancel_at_period_end && (
                      <p className="text-sm text-muted-foreground mb-2">
                        A assinatura será cancelada ao final do período atual
                      </p>
                    )}
                    {subscriptionDetails.cancel_at && (
                      <div className="text-sm">
                        <span className="font-medium">Cancelamento agendado para: </span>
                        <span className="text-destructive">
                          {format(new Date(subscriptionDetails.cancel_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    {subscriptionDetails.cancelled_at && (
                      <div className="text-sm">
                        <span className="font-medium">Cancelado em: </span>
                        <span className="text-destructive">
                          {format(new Date(subscriptionDetails.cancelled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    {subscriptionDetails.cancellation_details && (
                      <div className="mt-3 space-y-1 text-sm">
                        {(subscriptionDetails.cancellation_details as any).reason && (
                          <div>
                            <span className="font-medium">Motivo: </span>
                            <span>{(subscriptionDetails.cancellation_details as any).reason}</span>
                          </div>
                        )}
                        {(subscriptionDetails.cancellation_details as any).comment && (
                          <div>
                            <span className="font-medium">Comentário: </span>
                            <span>{(subscriptionDetails.cancellation_details as any).comment}</span>
                          </div>
                        )}
                        {(subscriptionDetails.cancellation_details as any).feedback && (
                          <div>
                            <span className="font-medium">Feedback: </span>
                            <span>{(subscriptionDetails.cancellation_details as any).feedback}</span>
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
              <p className="text-sm font-medium text-muted-foreground">Stripe Subscription ID</p>
              <div className="flex items-center gap-1">
                <p className="text-sm font-mono truncate">{subscriptionDetails.stripe_subscription_id}</p>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(subscriptionDetails.stripe_subscription_id)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Plano</p>
              <p className="text-lg font-semibold">{plan?.name || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={subscriptionDetails.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                {subscriptionDetails.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valor</p>
              <p className="text-lg font-semibold">
                {plan?.price ? `R$ ${Number(plan.price).toFixed(2)}` : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Período</p>
              <p className="text-sm">{plan?.billing_period || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ambiente</p>
              <Badge variant={subscriptionDetails.environment === 'production' ? 'default' : 'secondary'} className="mt-1">
                {subscriptionDetails.environment || 'test'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Início do Período</p>
              <p className="text-sm">
                {subscriptionDetails.current_period_start 
                  ? format(new Date(subscriptionDetails.current_period_start), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fim do Período</p>
              <p className="text-sm">
                {subscriptionDetails.current_period_end 
                  ? format(new Date(subscriptionDetails.current_period_end), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Criado em</p>
              <p className="text-sm">
                {subscriptionDetails.created_at 
                  ? format(new Date(subscriptionDetails.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Atualizado em</p>
              <p className="text-sm">
                {subscriptionDetails.updated_at 
                  ? format(new Date(subscriptionDetails.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    );
  };

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por tipo, email, customer ID..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
        <SelectTrigger>
          <SelectValue placeholder="Tipo de evento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {eventTypes?.map((type: string) => (
            <SelectItem key={type} value={type}>{type}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
        <SelectTrigger>
          <SelectValue placeholder="Ambiente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="production">Produção</SelectItem>
          <SelectItem value="test">Teste</SelectItem>
        </SelectContent>
      </Select>
      
      <div className="grid grid-cols-2 gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "De"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} initialFocus />
          </PopoverContent>
        </Popover>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Até"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} initialFocus />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex items-center justify-between">
        <ToggleGroup type="single" value={showCancelAtPeriodEnd ? "cancel" : ""} onValueChange={(value) => setShowCancelAtPeriodEnd(value === "cancel")}>
          <ToggleGroupItem value="cancel" aria-label="Mostrar cancelamentos" className="text-xs">
            <AlertCircle className="w-4 h-4 mr-1" />
            Cancelamentos
          </ToggleGroupItem>
        </ToggleGroup>
        
        <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
          <SelectTrigger className="w-[100px]">
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

      <Button variant="outline" className="w-full" onClick={() => refetch()}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Atualizar
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Barra de controle mobile/tablet */}
      <div className="flex items-center justify-between lg:hidden">
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FiltersContent />
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === "full" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("full")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "compact" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("compact")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtros desktop */}
      <Card className="hidden lg:block">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por tipo, email, customer ID..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
      <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Tipo de evento" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
                <SelectItem value="all">Todos os tipos</SelectItem>
          {eventTypes?.map((type: string) => (
            <SelectItem key={type} value={type}>{type}</SelectItem>
          ))}
              </SelectContent>
            </Select>

            <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Ambiente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
                <SelectItem value="test">Teste</SelectItem>
              </SelectContent>
            </Select>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "De"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} initialFocus />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Até"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} initialFocus />
              </PopoverContent>
            </Popover>
            
            <ToggleGroup type="single" value={showCancelAtPeriodEnd ? "cancel" : ""} onValueChange={(value) => setShowCancelAtPeriodEnd(value === "cancel")}>
              <ToggleGroupItem value="cancel" aria-label="Mostrar cancelamentos">
                <AlertCircle className="w-4 h-4 mr-1" />
                Cancelamentos
              </ToggleGroupItem>
            </ToggleGroup>
            
            <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "full" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("full")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "compact" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("compact")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      {isLoading ? (
        isMobile ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <TableSkeleton columns={viewMode === "full" ? 7 : 5} rows={10} />
        )
      ) : isMobile ? (
        <div className="space-y-3">
          {stripeEvents?.data?.map((event: any) => (
            viewMode === "compact" ? (
              <Card key={event.id} className="transition-all duration-300 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10">
                          {getStatusIcon(event.event_type)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{event.customer_email || "N/A"}</p>
                        <p className="text-xs text-muted-foreground truncate">{event.event_type}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleViewDetails(event)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card key={event.id} className="transition-all duration-300 hover:shadow-md">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(event.event_type)}
                      <span className="text-sm font-medium">{formatEventType(event.event_type)}</span>
                    </div>
                    <Badge variant={event.environment === 'production' ? 'default' : 'secondary'} className="text-xs">
                      {event.environment || 'test'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="truncate">{event.customer_email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p>{format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                  {event.stripe_subscription_id && (
                    <Button variant="link" className="h-auto p-0 text-xs" onClick={() => handleSubscriptionClick(event.stripe_subscription_id)}>
                      Ver assinatura
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewDetails(event)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Ver detalhes
                  </Button>
                </CardContent>
              </Card>
            )
          ))}
        </div>
      ) : viewMode === "compact" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("event_type")}>
                    <div className="flex items-center">Tipo <SortIcon column="event_type" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("customer_email")}>
                    <div className="flex items-center">Email <SortIcon column="customer_email" /></div>
                  </TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
                    <div className="flex items-center">Data <SortIcon column="created_at" /></div>
                  </TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stripeEvents?.data?.map((event: any) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(event.event_type)}
                        <span className="truncate max-w-[200px]">{event.event_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{event.customer_email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={event.environment === 'production' ? 'default' : 'secondary'}>
                        {event.environment || 'test'}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(event)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("event_type")}>
                    <div className="flex items-center">Tipo <SortIcon column="event_type" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("customer_email")}>
                    <div className="flex items-center">Email <SortIcon column="customer_email" /></div>
                  </TableHead>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
                    <div className="flex items-center">Data <SortIcon column="created_at" /></div>
                  </TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stripeEvents?.data?.map((event: any) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(event.event_type)}
                        <span className="truncate max-w-[200px]">{formatEventType(event.event_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{event.customer_email || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs truncate max-w-[120px]">{event.stripe_customer_id || "-"}</span>
                        {event.stripe_customer_id && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(event.stripe_customer_id)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.stripe_subscription_id ? (
                        <Button variant="link" className="h-auto p-0 font-mono text-xs" onClick={() => handleSubscriptionClick(event.stripe_subscription_id)}>
                          {event.stripe_subscription_id.substring(0, 20)}...
                        </Button>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={event.environment === 'production' ? 'default' : 'secondary'}>
                        {event.environment || 'test'}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(event.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(event)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, stripeEvents?.count || 0)} de {stripeEvents?.count || 0}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog/Drawer para detalhes do evento */}
      {isMobile ? (
        <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Detalhes do Evento</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              {renderEventDetailsContent()}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Evento</DialogTitle>
            </DialogHeader>
            {renderEventDetailsContent()}
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog/Drawer para detalhes da assinatura */}
      {isMobile ? (
        <Drawer open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Detalhes da Assinatura</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              {renderSubscriptionDetailsContent()}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Assinatura</DialogTitle>
            </DialogHeader>
            {renderSubscriptionDetailsContent()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
