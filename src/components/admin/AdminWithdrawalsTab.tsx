import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Calendar, CheckCircle, XCircle, Clock, Eye, RefreshCw, ImagePlus, Undo2, X, FileText, Percent, SlidersHorizontal, LayoutList, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PixQRCode } from "@/components/PixQRCode";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { AnimatedTableRow } from "@/components/AnimatedTableRow";

type Withdrawal = {
  id: string;
  affiliate_id: string;
  amount: number;
  status: string;
  pix_key: string;
  pix_type: string;
  requested_date: string;
  approved_date: string | null;
  paid_date: string | null;
  rejected_reason: string | null;
  approved_by: string | null;
  commission_ids: string[];
  payment_proof_url: string[];
  created_at: string;
  profiles?: {
    name: string;
    email: string;
    username: string;
    avatar_url: string | null;
  };
};

type PaymentProofFile = {
  file: File;
  previewUrl: string;
  id: string;
};

export function AdminWithdrawalsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [paymentProofs, setPaymentProofs] = useState<PaymentProofFile[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"compact" | "complete">("compact");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Buscar estatísticas de saques
  const { data: stats } = useQuery({
    queryKey: ["withdrawals-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("view_withdrawals_stats" as any).select("*").single();
      if (error) throw error;
      return data as unknown as {
        total_pending: number;
        total_approved: number;
        total_paid: number;
        total_rejected_count: number;
        total_awaiting_release: number;
      };
    }
  });

  const { data: commissionDays } = useQuery({
    queryKey: ["commission-release-days"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "commission_days_to_available")
        .single();

      if (error) {
        console.error("Erro ao buscar commission_days_to_available:", error);
        return 30;
      }

      const parsed = parseInt(data?.value ?? "30", 10);
      return Number.isNaN(parsed) ? 30 : parsed;
    }
  });

  // Buscar total de registros
  const { data: totalCount } = useQuery({
    queryKey: ["admin-withdrawals-count", debouncedSearch, statusFilter],
    queryFn: async () => {
      let query = supabase.from("withdrawals").select("id", {
        count: 'exact',
        head: true
      });
      if (debouncedSearch) {
        const { data: profilesData } = await supabase.from("profiles").select("id").or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,username.ilike.%${debouncedSearch}%`);
        if (profilesData && profilesData.length > 0) {
          const profileIds = profilesData.map(p => p.id);
          query = query.in("affiliate_id", profileIds);
        } else {
          return 0;
        }
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    }
  });

  const { data: withdrawals, isLoading, refetch } = useQuery({
    queryKey: ["admin-withdrawals", debouncedSearch, statusFilter, currentPage, pageSize],
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase.from("withdrawals").select(`
          *,
          profiles!withdrawals_affiliate_id_fkey (
            name,
            email,
            username,
            avatar_url
          )
        `).order("requested_date", {
        ascending: false
      }).range(from, to);
      if (debouncedSearch) {
        const { data: profilesData } = await supabase.from("profiles").select("id").or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,username.ilike.%${debouncedSearch}%`);
        if (profilesData && profilesData.length > 0) {
          const profileIds = profilesData.map(p => p.id);
          query = query.in("affiliate_id", profileIds);
        } else {
          return [];
        }
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Withdrawal[];
    }
  });

  const totalPages = Math.ceil((totalCount || 0) / pageSize);

  const { data: commissions } = useQuery({
    queryKey: ["withdrawal-commissions", selectedWithdrawal?.id],
    queryFn: async () => {
      if (!selectedWithdrawal?.commission_ids?.length) return [];
      const { data, error } = await supabase.from("commissions").select(`
          *,
          products:product_id (
            nome
          ),
          unified_users:unified_user_id (
            name,
            email
          ),
          subscriptions:subscription_id (
            plans:plan_id (
              name
            )
          )
        `).in("id", selectedWithdrawal.commission_ids).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedWithdrawal?.commission_ids?.length
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      rejectedReason,
      paymentProofUrl
    }: {
      id: string;
      status: string;
      rejectedReason?: string;
      paymentProofUrl?: string[] | null;
    }) => {
      const withdrawal = withdrawals?.find(w => w.id === id);
      const updateData: any = { status };
      if (status === "approved") {
        if (withdrawal?.status === "paid") {
          updateData.paid_date = null;
          updateData.payment_proof_url = null;
        } else {
          updateData.approved_date = new Date().toISOString();
          updateData.approved_by = (await supabase.auth.getUser()).data.user?.id;
        }
      } else if (status === "paid") {
        updateData.paid_date = new Date().toISOString();
        if (paymentProofUrl) {
          updateData.payment_proof_url = paymentProofUrl;
        }
      } else if (status === "rejected") {
        updateData.rejected_reason = rejectedReason;
      } else if (status === "pending") {
        updateData.approved_date = null;
        updateData.approved_by = null;
      }
      const { error } = await supabase.from("withdrawals").update(updateData).eq("id", id);
      if (error) throw error;

      if (withdrawal?.commission_ids?.length) {
        if (status === "approved" || status === "paid") {
          const commissionStatus = withdrawal.status === "paid" && status === "approved" ? "available" : "withdrawn";
          const commissionUpdate: any = { status: commissionStatus };
          if (commissionStatus === "available") {
            commissionUpdate.withdrawal_id = null;
          } else {
            commissionUpdate.withdrawal_id = id;
          }
          await supabase.from("commissions").update(commissionUpdate).in("id", withdrawal.commission_ids);
        } else if (status === "pending") {
          await supabase.from("commissions").update({
            status: "available",
            withdrawal_id: null
          }).in("id", withdrawal.commission_ids);
        }
      }
      return { status };
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast({
        title: "Saque atualizado",
        description: "O status do saque foi atualizado com sucesso."
      });

      if (data.status !== "approved") {
        setDialogOpen(false);
      } else {
        if (selectedWithdrawal) {
          setSelectedWithdrawal({
            ...selectedWithdrawal,
            status: "approved",
            approved_date: new Date().toISOString()
          });
        }
      }
      setRejectReason("");

      if (data.status !== "approved") {
        paymentProofs.forEach(proof => URL.revokeObjectURL(proof.previewUrl));
        setPaymentProofs([]);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar saque",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleViewDetails = (withdrawal: Withdrawal) => {
    paymentProofs.forEach(proof => URL.revokeObjectURL(proof.previewUrl));
    setPaymentProofs([]);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedWithdrawal(withdrawal);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      paymentProofs.forEach(proof => URL.revokeObjectURL(proof.previewUrl));
      setPaymentProofs([]);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setRejectReason("");
    }
  };

  const handleAddProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newProofs: PaymentProofFile[] = Array.from(files).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      id: crypto.randomUUID()
    }));
    setPaymentProofs(prev => [...prev, ...newProofs]);
  };

  const handleRemoveProof = (id: string) => {
    setPaymentProofs(prev => {
      const proofToRemove = prev.find(p => p.id === id);
      if (proofToRemove) {
        URL.revokeObjectURL(proofToRemove.previewUrl);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const handleApprove = (id: string) => {
    updateWithdrawalMutation.mutate({ id, status: "approved" });
  };

  const handlePaid = async (id: string) => {
    const proofUrls: string[] = [];
    if (paymentProofs.length > 0) {
      try {
        for (const proof of paymentProofs) {
          const fileExt = proof.file.name.split('.').pop();
          const fileName = `${id}-${Date.now()}-${proof.id}.${fileExt}`;
          const filePath = `${fileName}`;
          const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(filePath, proof.file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);
          proofUrls.push(publicUrl);
        }
      } catch (error: any) {
        toast({
          title: "Erro ao fazer upload",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
    }
    updateWithdrawalMutation.mutate({
      id,
      status: "paid",
      paymentProofUrl: proofUrls.length > 0 ? proofUrls : null
    });
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive"
      });
      return;
    }
    updateWithdrawalMutation.mutate({
      id,
      status: "rejected",
      rejectedReason: rejectReason
    });
  };

  const handleRevert = (id: string) => {
    updateWithdrawalMutation.mutate({ id, status: "approved" });
  };

  const handleRevertApproval = (id: string) => {
    updateWithdrawalMutation.mutate({ id, status: "pending" });
  };

  const statsData = {
    totalPending: stats?.total_pending || 0,
    totalApproved: stats?.total_approved || 0,
    totalPaid: stats?.total_paid || 0,
    totalRejected: stats?.total_rejected_count || 0,
    totalAwaitingRelease: stats?.total_awaiting_release || 0
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: "Aguardando aprovação",
        variant: "secondary" as const,
        icon: Clock,
        className: "bg-warning/20 text-warning-foreground border-warning/30"
      },
      approved: {
        label: "Aprovado",
        variant: "default" as const,
        icon: CheckCircle,
        className: ""
      },
      paid: {
        label: "Pago",
        variant: "default" as const,
        icon: CheckCircle,
        className: ""
      },
      rejected: {
        label: "Rejeitado",
        variant: "destructive" as const,
        icon: XCircle,
        className: ""
      }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <ScrollAnimation animation="fade-up" delay={0} threshold={0.05}>
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solicitados</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.totalPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
            </CardContent>
          </Card>
        </ScrollAnimation>

        <ScrollAnimation animation="fade-up" delay={50} threshold={0.05}>
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.totalApproved.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              <p className="text-xs text-muted-foreground">A serem pagos</p>
            </CardContent>
          </Card>
        </ScrollAnimation>

        <ScrollAnimation animation="fade-up" delay={100} threshold={0.05}>
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagos</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.totalPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              <p className="text-xs text-muted-foreground">Total pago aos afiliados</p>
            </CardContent>
          </Card>
        </ScrollAnimation>

        <ScrollAnimation animation="fade-up" delay={150} threshold={0.05}>
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Liberação</CardTitle>
              <Calendar className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.totalAwaitingRelease.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              <p className="text-xs text-muted-foreground">
                Comissões à liberar depois de {commissionDays ?? 30} dias do pagamento
              </p>
            </CardContent>
          </Card>
        </ScrollAnimation>

        <ScrollAnimation animation="fade-up" delay={200} threshold={0.05}>
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.totalRejected}</div>
              <p className="text-xs text-muted-foreground">Solicitações rejeitadas</p>
            </CardContent>
          </Card>
        </ScrollAnimation>
      </div>

      {/* Mobile Control Bar */}
      <div className="flex items-center justify-between lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </Button>
        <ToggleGroup
          type="single"
          value={layoutMode}
          onValueChange={(value) => value && setLayoutMode(value as "compact" | "complete")}
          className="border rounded-lg"
        >
          <ToggleGroupItem value="compact" aria-label="Modo compacto" className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <LayoutList className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="complete" aria-label="Modo completo" className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Filtros */}
      <Card className={`${!showFilters ? 'hidden lg:block' : ''} bg-transparent border-0 shadow-none lg:bg-card lg:border lg:shadow-sm rounded-none lg:rounded-lg`}>
        <CardContent className="!p-0 lg:!p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:flex gap-2 sm:gap-4">
            <Input placeholder="Buscar por afiliado..." value={searchTerm} onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }} className="w-full lg:max-w-sm" />
            <Select value={statusFilter} onValueChange={value => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pageSize.toString()} onValueChange={value => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Por página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="20">20 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full lg:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="bg-transparent border-0 shadow-none lg:bg-card lg:border lg:shadow-sm rounded-none lg:rounded-lg">
        <CardContent className="!p-0 lg:!p-6">
          {isLoading ? (
            <div className="px-4 lg:px-0">
              <TableSkeleton columns={7} rows={10} />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Data Solicitação</TableHead>
                      <TableHead>Afiliado</TableHead>
                      <TableHead className="hidden lg:table-cell">PIX</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden xl:table-cell whitespace-nowrap">Data Pagamento</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals && withdrawals.length > 0 ? withdrawals.map((withdrawal, index) => (
                      <AnimatedTableRow key={withdrawal.id} delay={index * 50}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(withdrawal.requested_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[180px]">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={withdrawal.profiles?.avatar_url || ""} alt={withdrawal.profiles?.name} />
                              <AvatarFallback className="text-xs">
                                {withdrawal.profiles?.name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-sm truncate">{withdrawal.profiles?.name || "N/A"}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[180px]">{withdrawal.profiles?.email || "N/A"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col">
                            <span className="text-xs font-mono">{withdrawal.pix_key}</span>
                            <span className="text-xs text-muted-foreground uppercase">{withdrawal.pix_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold whitespace-nowrap">
                          {Number(withdrawal.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                        <TableCell className="hidden xl:table-cell text-xs whitespace-nowrap">
                          {withdrawal.paid_date ? format(new Date(withdrawal.paid_date), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(withdrawal)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </AnimatedTableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Nenhum saque encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {withdrawals && withdrawals.length > 0 ? withdrawals.map((withdrawal, index) => (
                  layoutMode === "compact" ? (
                    <ScrollAnimation key={withdrawal.id} animation="fade-up" delay={index * 50} threshold={0.05}>
                      <Card className={`overflow-hidden transition-all duration-300 hover:shadow-md ${withdrawal.status === 'pending' ? 'bg-warning/5 border-warning/20' : ''}`}>
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{withdrawal.profiles?.name || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(withdrawal.requested_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                              <p className="font-semibold text-primary whitespace-nowrap">
                                {Number(withdrawal.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              {getStatusBadge(withdrawal.status)}
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleViewDetails(withdrawal)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </ScrollAnimation>
                  ) : (
                    <ScrollAnimation key={withdrawal.id} animation="fade-up" delay={index * 50} threshold={0.05}>
                      <Card className={`overflow-hidden transition-all duration-300 hover:shadow-md ${withdrawal.status === 'pending' ? 'bg-warning/5 border-warning/20' : ''}`}>
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm">{withdrawal.profiles?.name || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">{withdrawal.profiles?.email || "N/A"}</p>
                              </div>
                              {getStatusBadge(withdrawal.status)}
                            </div>
                            
                            <div className="flex justify-between items-center py-2 border-t border-b">
                              <span className="text-xs text-muted-foreground">Valor</span>
                              <span className="font-bold text-base">
                                {Number(withdrawal.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">Solicitação</p>
                                <p className="font-medium">
                                  {format(new Date(withdrawal.requested_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Pagamento</p>
                                <p className="font-medium">
                                  {withdrawal.paid_date ? format(new Date(withdrawal.paid_date), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                                </p>
                              </div>
                            </div>

                            <div className="pt-2">
                              <p className="text-xs text-muted-foreground">PIX</p>
                              <p className="font-mono text-xs">{withdrawal.pix_key}</p>
                              <p className="text-xs text-muted-foreground uppercase">{withdrawal.pix_type}</p>
                            </div>

                            <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => handleViewDetails(withdrawal)}>
                              <Eye className="h-3 w-3 mr-2" />
                              Ver Detalhes
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </ScrollAnimation>
                  )
                )) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum saque encontrado
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Paginação */}
          {!isLoading && withdrawals && withdrawals.length > 0 && totalPages > 1 && (
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 px-3 lg:px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalCount || 0)} de {totalCount || 0} registros
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = idx + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = idx + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + idx;
                    } else {
                      pageNumber = currentPage - 2 + idx;
                    }
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink onClick={() => setCurrentPage(pageNumber)} isActive={currentPage === pageNumber} className="cursor-pointer">
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer Dialog */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setImageViewerOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            {viewerImageUrl && (
              <img src={viewerImageUrl} alt="Visualização" className="w-full h-auto max-h-[80vh] object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog/Drawer */}
      {isMobile ? (
        <Drawer open={dialogOpen} onOpenChange={handleDialogChange}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="border-b pb-3">
              <DrawerTitle>Detalhes do Saque</DrawerTitle>
            </DrawerHeader>
            {selectedWithdrawal && (
              <div className="overflow-y-auto px-4 pb-4 flex-1">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mt-3">
                    <TabsTrigger value="details" className="gap-2 text-xs">
                      <FileText className="h-3 w-3" />
                      Detalhes
                    </TabsTrigger>
                    <TabsTrigger value="commissions" className="gap-2 text-xs">
                      <Percent className="h-3 w-3" />
                      Comissões ({selectedWithdrawal.commission_ids?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-3">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 pb-3 border-b">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedWithdrawal.profiles?.avatar_url || ""} alt={selectedWithdrawal.profiles?.name} />
                          <AvatarFallback className="text-xs">
                            {selectedWithdrawal.profiles?.name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{selectedWithdrawal.profiles?.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{selectedWithdrawal.profiles?.email}</p>
                        </div>
                        {getStatusBadge(selectedWithdrawal.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Valor</p>
                          <p className="font-bold text-primary">
                            {Number(selectedWithdrawal.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Solicitação</p>
                          <p className="text-xs">{format(new Date(selectedWithdrawal.requested_date), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                        </div>
                        {selectedWithdrawal.approved_date && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Aprovação</p>
                            <p className="text-xs">{format(new Date(selectedWithdrawal.approved_date), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                          </div>
                        )}
                        {selectedWithdrawal.paid_date && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Pagamento</p>
                            <p className="text-xs">{format(new Date(selectedWithdrawal.paid_date), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                          </div>
                        )}
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-0.5">Chave PIX ({selectedWithdrawal.pix_type})</p>
                          <p className="font-mono text-sm">{selectedWithdrawal.pix_key}</p>
                        </div>
                        {selectedWithdrawal.rejected_reason && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground mb-0.5">Motivo Rejeição</p>
                            <p className="text-destructive text-xs">{selectedWithdrawal.rejected_reason}</p>
                          </div>
                        )}
                      </div>

                      {selectedWithdrawal.status === "approved" && (
                        <div className="pt-3 border-t">
                          <PixQRCode
                            pixKey={selectedWithdrawal.pix_key}
                            pixType={selectedWithdrawal.pix_type}
                            amount={Number(selectedWithdrawal.amount)}
                            recipientName={selectedWithdrawal.profiles?.name || "Afiliado"}
                            transactionId={selectedWithdrawal.id}
                          />
                        </div>
                      )}
                    </div>

                    {selectedWithdrawal.status === "pending" && (
                      <Textarea 
                        placeholder="Motivo da rejeição (se aplicável)" 
                        value={rejectReason} 
                        onChange={e => setRejectReason(e.target.value)} 
                        className="min-h-[60px] mt-3" 
                      />
                    )}

                    {(selectedWithdrawal.status === "approved" || selectedWithdrawal.status === "paid") && (
                      <div className="space-y-2 pt-2 border-t mt-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">
                            {selectedWithdrawal.status === "paid" ? "Comprovantes" : "Anexar Comprovantes"}
                          </Label>
                          {selectedWithdrawal.status !== "paid" && (
                            <>
                              <input id="payment-proof-mobile" type="file" accept="image/*" multiple onChange={handleAddProof} className="hidden" />
                              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('payment-proof-mobile')?.click()}>
                                <ImagePlus className="h-3 w-3 mr-1" />
                                Adicionar
                              </Button>
                            </>
                          )}
                        </div>
                        
                        {(paymentProofs.length > 0 || (selectedWithdrawal.status === "paid" && selectedWithdrawal.payment_proof_url?.length)) && (
                          <div className="grid grid-cols-4 gap-2">
                            {paymentProofs.length > 0 && selectedWithdrawal.status !== "paid" && paymentProofs.map(proof => (
                              <div key={proof.id} className="relative group">
                                <img src={proof.previewUrl} alt="Comprovante" className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80" onClick={() => { setViewerImageUrl(proof.previewUrl); setImageViewerOpen(true); }} />
                                <Button type="button" variant="destructive" size="icon" className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveProof(proof.id)}>
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {selectedWithdrawal.status === "paid" && selectedWithdrawal.payment_proof_url?.map((url, index) => (
                              <img key={index} src={url} alt={`Comprovante ${index + 1}`} className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80" onClick={() => { setViewerImageUrl(url); setImageViewerOpen(true); }} />
                            ))}
                          </div>
                        )}
                        
                        {selectedWithdrawal.status === "paid" && !selectedWithdrawal.payment_proof_url?.length && (
                          <p className="text-xs text-muted-foreground">Nenhum comprovante</p>
                        )}
                      </div>
                    )}

                    <DrawerFooter className="px-0 pt-3">
                      {selectedWithdrawal.status === "pending" && (
                        <div className="flex gap-2 w-full">
                          <Button variant="destructive" onClick={() => handleReject(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending} className="flex-1">
                            <XCircle className="h-4 w-4 mr-2" />
                            Rejeitar
                          </Button>
                          <Button variant="default" onClick={() => handleApprove(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending} className="flex-1">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprovar
                          </Button>
                        </div>
                      )}
                      {selectedWithdrawal.status === "approved" && (
                        <div className="flex gap-2 w-full">
                          <Button variant="outline" onClick={() => handleRevertApproval(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending} className="flex-1">
                            <Undo2 className="h-4 w-4 mr-2" />
                            Estornar
                          </Button>
                          <Button variant="default" onClick={() => handlePaid(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending || paymentProofs.length === 0} className="flex-1">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Marcar Pago
                          </Button>
                        </div>
                      )}
                      {selectedWithdrawal.status === "paid" && (
                        <Button variant="outline" onClick={() => handleRevert(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending} className="w-full">
                          <Undo2 className="h-4 w-4 mr-2" />
                          Estornar Pagamento
                        </Button>
                      )}
                    </DrawerFooter>
                  </TabsContent>

                  <TabsContent value="commissions" className="mt-3">
                    {commissions && commissions.length > 0 ? (
                      <div className="space-y-2">
                        {commissions.map((commission: any) => (
                          <Card key={commission.id} className="p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{commission.unified_users?.name || "N/A"}</p>
                                <p className="text-xs text-muted-foreground truncate">{commission.unified_users?.email || "N/A"}</p>
                              </div>
                              <Badge variant="secondary" className="text-xs">N{commission.level || 1}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">Produto</p>
                                <p className="font-medium truncate">{commission.products?.nome || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Plano</p>
                                <p className="font-medium truncate">{commission.subscriptions?.plans?.name || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">%</p>
                                <p className="font-medium">{commission.percentage}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Valor</p>
                                <p className="font-semibold text-primary">
                                  {Number(commission.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Nenhuma comissão vinculada</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Saque</DialogTitle>
            </DialogHeader>
            {selectedWithdrawal && (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Detalhes
                  </TabsTrigger>
                  <TabsTrigger value="commissions" className="gap-2">
                    <Percent className="h-4 w-4" />
                    Comissões ({selectedWithdrawal.commission_ids?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-3">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b">
                      <Avatar 
                        className={`h-11 w-11 ${selectedWithdrawal.profiles?.avatar_url ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all' : ''}`}
                        onClick={() => {
                          if (selectedWithdrawal.profiles?.avatar_url) {
                            setViewerImageUrl(selectedWithdrawal.profiles.avatar_url);
                            setImageViewerOpen(true);
                          }
                        }}
                      >
                        <AvatarImage src={selectedWithdrawal.profiles?.avatar_url || ""} alt={selectedWithdrawal.profiles?.name} />
                        <AvatarFallback>
                          {selectedWithdrawal.profiles?.name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{selectedWithdrawal.profiles?.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{selectedWithdrawal.profiles?.email}</p>
                      </div>
                      {getStatusBadge(selectedWithdrawal.status)}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Valor</p>
                        <p className="font-bold text-primary">
                          {Number(selectedWithdrawal.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Solicitação</p>
                        <p className="text-xs">{format(new Date(selectedWithdrawal.requested_date), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                      </div>
                      {selectedWithdrawal.approved_date && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Aprovação</p>
                          <p className="text-xs">{format(new Date(selectedWithdrawal.approved_date), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                        </div>
                      )}
                      {selectedWithdrawal.paid_date && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Pagamento</p>
                          <p className="text-xs">{format(new Date(selectedWithdrawal.paid_date), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                        </div>
                      )}
                      <div className="col-span-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Chave PIX ({selectedWithdrawal.pix_type})</p>
                        <p className="font-mono text-sm">{selectedWithdrawal.pix_key}</p>
                      </div>
                      {selectedWithdrawal.rejected_reason && (
                        <div className="col-span-3">
                          <p className="text-xs text-muted-foreground mb-0.5">Motivo Rejeição</p>
                          <p className="text-destructive text-xs">{selectedWithdrawal.rejected_reason}</p>
                        </div>
                      )}
                    </div>

                    {selectedWithdrawal.status === "approved" && (
                      <div className="pt-3 border-t">
                        <PixQRCode
                          pixKey={selectedWithdrawal.pix_key}
                          pixType={selectedWithdrawal.pix_type}
                          amount={Number(selectedWithdrawal.amount)}
                          recipientName={selectedWithdrawal.profiles?.name || "Afiliado"}
                          transactionId={selectedWithdrawal.id}
                        />
                      </div>
                    )}
                  </div>

                  {selectedWithdrawal.status === "pending" && (
                    <Textarea 
                      placeholder="Motivo da rejeição (se aplicável)" 
                      value={rejectReason} 
                      onChange={e => setRejectReason(e.target.value)} 
                      className="min-h-[60px]" 
                    />
                  )}

                  {(selectedWithdrawal.status === "approved" || selectedWithdrawal.status === "paid") && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">
                          {selectedWithdrawal.status === "paid" ? "Comprovantes" : "Anexar Comprovantes"}
                        </Label>
                        {selectedWithdrawal.status !== "paid" && (
                          <>
                            <input id="payment-proof" type="file" accept="image/*" multiple onChange={handleAddProof} className="hidden" />
                            <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('payment-proof')?.click()}>
                              <ImagePlus className="h-3 w-3 mr-1" />
                              Adicionar
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {(paymentProofs.length > 0 || (selectedWithdrawal.status === "paid" && selectedWithdrawal.payment_proof_url?.length)) && (
                        <div className="grid grid-cols-5 gap-2">
                          {paymentProofs.length > 0 && selectedWithdrawal.status !== "paid" && paymentProofs.map(proof => (
                            <div key={proof.id} className="relative group">
                              <img src={proof.previewUrl} alt="Comprovante" className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80" onClick={() => { setViewerImageUrl(proof.previewUrl); setImageViewerOpen(true); }} />
                              <Button type="button" variant="destructive" size="icon" className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveProof(proof.id)}>
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {selectedWithdrawal.status === "paid" && selectedWithdrawal.payment_proof_url?.map((url, index) => (
                            <img key={index} src={url} alt={`Comprovante ${index + 1}`} className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80" onClick={() => { setViewerImageUrl(url); setImageViewerOpen(true); }} />
                          ))}
                        </div>
                      )}
                      
                      {selectedWithdrawal.status === "paid" && !selectedWithdrawal.payment_proof_url?.length && (
                        <p className="text-xs text-muted-foreground">Nenhum comprovante</p>
                      )}
                    </div>
                  )}

                  <DialogFooter>
                    {selectedWithdrawal.status === "pending" && (
                      <>
                        <Button variant="destructive" onClick={() => handleReject(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                        <Button variant="default" onClick={() => handleApprove(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar
                        </Button>
                      </>
                    )}
                    {selectedWithdrawal.status === "approved" && (
                      <>
                        <Button variant="outline" onClick={() => handleRevertApproval(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending}>
                          <Undo2 className="h-4 w-4 mr-2" />
                          Estornar Aprovação
                        </Button>
                        <Button variant="default" onClick={() => handlePaid(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending || paymentProofs.length === 0}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Marcar como Pago
                        </Button>
                      </>
                    )}
                    {selectedWithdrawal.status === "paid" && (
                      <Button variant="outline" onClick={() => handleRevert(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending}>
                        <Undo2 className="h-4 w-4 mr-2" />
                        Estornar Pagamento
                      </Button>
                    )}
                  </DialogFooter>
                </TabsContent>

                <TabsContent value="commissions" className="space-y-4">
                  {commissions && commissions.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs">Produto/Plano</TableHead>
                            <TableHead className="text-xs">Cliente</TableHead>
                            <TableHead className="text-xs">Nível/%</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commissions.map((commission: any) => (
                            <TableRow key={commission.id}>
                              <TableCell className="text-xs whitespace-nowrap py-2">
                                {format(new Date(commission.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium">{commission.products?.nome || "N/A"}</span>
                                  <span className="text-xs text-muted-foreground">{commission.subscriptions?.plans?.name || "N/A"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium truncate max-w-[120px]">{commission.unified_users?.name || "N/A"}</span>
                                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{commission.unified_users?.email || "N/A"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-1">
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">N{commission.level || 1}</Badge>
                                  <span className="text-xs text-muted-foreground">{commission.percentage}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-xs text-right py-2">
                                {Number(commission.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhuma comissão vinculada</p>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
