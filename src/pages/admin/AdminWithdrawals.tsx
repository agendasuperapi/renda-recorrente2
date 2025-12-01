import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Calendar, CheckCircle, XCircle, Clock, Eye, RefreshCw, ImagePlus, Undo2 } from "lucide-react";
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
  };
};
type PaymentProofFile = {
  file: File;
  previewUrl: string;
  id: string;
};
export default function AdminWithdrawals() {
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
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Buscar estatísticas de saques
  const {
    data: stats
  } = useQuery({
    queryKey: ["withdrawals-stats"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("view_withdrawals_stats" as any).select("*").single();
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
        return 30; // fallback apenas em caso de erro real na query
      }

      const parsed = parseInt(data?.value ?? "30", 10);
      return Number.isNaN(parsed) ? 30 : parsed;
    }
  });

  // Buscar total de registros
  const {
    data: totalCount
  } = useQuery({
    queryKey: ["admin-withdrawals-count", debouncedSearch, statusFilter],
    queryFn: async () => {
      let query = supabase.from("withdrawals").select("id", {
        count: 'exact',
        head: true
      });
      if (debouncedSearch) {
        const {
          data: profilesData
        } = await supabase.from("profiles").select("id").or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,username.ilike.%${debouncedSearch}%`);
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
      const {
        count,
        error
      } = await query;
      if (error) throw error;
      return count || 0;
    }
  });
  const {
    data: withdrawals,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["admin-withdrawals", debouncedSearch, statusFilter, currentPage, pageSize],
    queryFn: async () => {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      let query = supabase.from("withdrawals").select(`
          *,
          profiles!withdrawals_affiliate_id_fkey (
            name,
            email,
            username
          )
        `).order("requested_date", {
        ascending: false
      }).range(from, to);
      if (debouncedSearch) {
        const {
          data: profilesData
        } = await supabase.from("profiles").select("id").or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,username.ilike.%${debouncedSearch}%`);
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
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      return (data || []) as unknown as Withdrawal[];
    }
  });
  const totalPages = Math.ceil((totalCount || 0) / pageSize);
  const {
    data: commissions
  } = useQuery({
    queryKey: ["withdrawal-commissions", selectedWithdrawal?.id],
    queryFn: async () => {
      if (!selectedWithdrawal?.commission_ids?.length) return [];
      const {
        data,
        error
      } = await supabase.from("commissions").select(`
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
      const updateData: any = {
        status
      };
      if (status === "approved") {
        // Se estava "paid" e está voltando para "approved", limpar dados de pagamento
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
      }
      const {
        error
      } = await supabase.from("withdrawals").update(updateData).eq("id", id);
      if (error) throw error;

      // Se foi aprovado ou pago, atualizar as comissões para 'withdrawn'
      if (status === "approved" || status === "paid") {
        if (withdrawal?.commission_ids?.length) {
          // Se está revertendo de "paid" para "approved", voltar comissões para "available"
          const commissionStatus = withdrawal.status === "paid" && status === "approved" ? "available" : "withdrawn";
          const commissionUpdate: any = {
            status: commissionStatus
          };

          // Se está revertendo, limpar o withdrawal_id
          if (commissionStatus === "available") {
            commissionUpdate.withdrawal_id = null;
          } else {
            commissionUpdate.withdrawal_id = id;
          }
          await supabase.from("commissions").update(commissionUpdate).in("id", withdrawal.commission_ids);
        }
      }
      return {
        status
      };
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: ["admin-withdrawals"]
      });
      toast({
        title: "Saque atualizado",
        description: "O status do saque foi atualizado com sucesso."
      });

      // Não fechar o dialog se foi aprovado (para permitir adicionar comprovantes)
      if (data.status !== "approved") {
        setDialogOpen(false);
      } else {
        // Atualizar o selectedWithdrawal com o novo status
        if (selectedWithdrawal) {
          setSelectedWithdrawal({
            ...selectedWithdrawal,
            status: "approved",
            approved_date: new Date().toISOString()
          });
        }
      }
      setRejectReason("");

      // Cleanup preview URLs apenas se o dialog for fechar
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
    // Cleanup previous preview URLs if exist
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
      // Cleanup when dialog closes
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
    updateWithdrawalMutation.mutate({
      id,
      status: "approved"
    });
  };
  const handlePaid = async (id: string) => {
    const proofUrls: string[] = [];
    if (paymentProofs.length > 0) {
      try {
        // Upload all files
        for (const proof of paymentProofs) {
          const fileExt = proof.file.name.split('.').pop();
          const fileName = `${id}-${Date.now()}-${proof.id}.${fileExt}`;
          const filePath = `${fileName}`;
          const {
            error: uploadError
          } = await supabase.storage.from('payment-proofs').upload(filePath, proof.file);
          if (uploadError) throw uploadError;
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);
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
    updateWithdrawalMutation.mutate({
      id,
      status: "approved"
    });
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
        label: "Pendente",
        variant: "secondary" as const,
        icon: Clock
      },
      approved: {
        label: "Aprovado",
        variant: "default" as const,
        icon: CheckCircle
      },
      paid: {
        label: "Pago",
        variant: "default" as const,
        icon: CheckCircle
      },
      rejected: {
        label: "Rejeitado",
        variant: "destructive" as const,
        icon: XCircle
      }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>;
  };
  return <div className="space-y-4 sm:space-y-6 sm:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Saques</h1>
        <p className="text-sm text-muted-foreground">Gerenciamento de solicitações de saque</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-3 grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitados</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData.totalPending.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData.totalApproved.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })}
            </div>
            <p className="text-xs text-muted-foreground">
              A serem pagos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData.totalPaid.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })}
            </div>
            <p className="text-xs text-muted-foreground">
              Total pago aos afiliados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Liberação</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData.totalAwaitingRelease.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })}
            </div>
            <p className="text-xs text-muted-foreground">
              Comissões à liberar depois de {commissionDays ?? 30} dias do pagamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData.totalRejected}
            </div>
            <p className="text-xs text-muted-foreground">
              Solicitações rejeitadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Todos os Saques</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4">
            <Input placeholder="Buscar por afiliado..." value={searchTerm} onChange={e => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }} className="w-full sm:max-w-sm" />
            <Select value={statusFilter} onValueChange={value => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Por página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="20">20 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? <div className="px-4 sm:px-0">
              <TableSkeleton columns={7} rows={10} />
            </div> : <>
              {/* Desktop Table */}
              <div className="hidden sm:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Solicitação</TableHead>
                      <TableHead>Afiliado</TableHead>
                      <TableHead>PIX</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Pagamento</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals && withdrawals.length > 0 ? withdrawals.map(withdrawal => <TableRow key={withdrawal.id}>
                          <TableCell className="text-xs">
                            {format(new Date(withdrawal.requested_date), "dd/MM/yy HH:mm", {
                      locale: ptBR
                    })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{withdrawal.profiles?.name || "N/A"}</span>
                              <span className="text-xs text-muted-foreground">{withdrawal.profiles?.email || "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-mono">{withdrawal.pix_key}</span>
                              <span className="text-xs text-muted-foreground uppercase">{withdrawal.pix_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {Number(withdrawal.amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    })}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(withdrawal.status)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {withdrawal.paid_date ? format(new Date(withdrawal.paid_date), "dd/MM/yy HH:mm", {
                      locale: ptBR
                    }) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(withdrawal)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>) : <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Nenhum saque encontrado
                        </TableCell>
                      </TableRow>}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3 px-3">
                {withdrawals && withdrawals.length > 0 ? withdrawals.map(withdrawal => <Card key={withdrawal.id} className="overflow-hidden">
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
                              {Number(withdrawal.amount).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                      })}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Solicitação</p>
                              <p className="font-medium">
                                {format(new Date(withdrawal.requested_date), "dd/MM/yy HH:mm", {
                          locale: ptBR
                        })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Pagamento</p>
                              <p className="font-medium">
                                {withdrawal.paid_date ? format(new Date(withdrawal.paid_date), "dd/MM/yy HH:mm", {
                          locale: ptBR
                        }) : "-"}
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
                    </Card>) : <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum saque encontrado
                  </div>}
              </div>
            </>}
          
          {/* Paginação */}
          {!isLoading && withdrawals && withdrawals.length > 0 && totalPages > 1 && <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-3 sm:px-6 py-4 border-t">
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
                return <PaginationItem key={pageNumber}>
                        <PaginationLink onClick={() => setCurrentPage(pageNumber)} isActive={currentPage === pageNumber} className="cursor-pointer">
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>;
              })}
                  
                  <PaginationItem>
                    <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>}
        </CardContent>
      </Card>

      {/* Dialog/Drawer de Detalhes */}
      {isMobile ? <Drawer open={dialogOpen} onOpenChange={handleDialogChange}>
          <DrawerContent className="max-h-[95vh]">
            <DrawerHeader>
              <DrawerTitle>Detalhes do Saque</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">
              {selectedWithdrawal && <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="commissions">
                  Comissões ({selectedWithdrawal.commission_ids?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Afiliado</p>
                    <p className="font-medium">{selectedWithdrawal.profiles?.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedWithdrawal.profiles?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedWithdrawal.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-bold text-lg">
                      {Number(selectedWithdrawal.amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Solicitação</p>
                    <p className="font-medium">
                      {format(new Date(selectedWithdrawal.requested_date), "dd/MM/yyyy HH:mm", {
                      locale: ptBR
                    })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Chave PIX</p>
                    <p className="font-mono text-sm">{selectedWithdrawal.pix_key}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo PIX</p>
                    <p className="uppercase">{selectedWithdrawal.pix_type}</p>
                  </div>
                  {selectedWithdrawal.approved_date && <div>
                      <p className="text-sm text-muted-foreground">Data Aprovação</p>
                      <p className="font-medium">
                        {format(new Date(selectedWithdrawal.approved_date), "dd/MM/yyyy HH:mm", {
                      locale: ptBR
                    })}
                      </p>
                    </div>}
                  {selectedWithdrawal.paid_date && <div>
                      <p className="text-sm text-muted-foreground">Data Pagamento</p>
                      <p className="font-medium">
                        {format(new Date(selectedWithdrawal.paid_date), "dd/MM/yyyy HH:mm", {
                      locale: ptBR
                    })}
                      </p>
                    </div>}
                  {selectedWithdrawal.rejected_reason && <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Motivo da Rejeição</p>
                      <p className="text-red-600">{selectedWithdrawal.rejected_reason}</p>
                    </div>}
                </div>

                {selectedWithdrawal.status === "pending" && <div className="space-y-2 pt-4 border-t">
                    <Textarea placeholder="Motivo da rejeição (se aplicável)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="min-h-[80px]" />
                  </div>}

                {(selectedWithdrawal.status === "approved" || selectedWithdrawal.status === "paid") && <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label htmlFor="payment-proof">
                        {selectedWithdrawal.status === "paid" ? "Comprovantes anexados" : "Anexar Comprovantes de Pagamento PIX"}
                      </Label>
                      {selectedWithdrawal.status !== "paid" && <div className="mt-2">
                          <input id="payment-proof" type="file" accept="image/*" multiple onChange={handleAddProof} className="hidden" />
                          <Button type="button" variant="outline" onClick={() => document.getElementById('payment-proof')?.click()} className="w-full">
                            <ImagePlus className="h-4 w-4 mr-2" />
                            Adicionar Comprovantes
                          </Button>
                        </div>}
                    </div>
                    
                    {/* Comprovantes - Unificado */}
                    {(paymentProofs.length > 0 && selectedWithdrawal.status !== "paid" || selectedWithdrawal.status === "paid" && selectedWithdrawal.payment_proof_url && selectedWithdrawal.payment_proof_url.length > 0) && <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Comprovantes de Pagamento ({paymentProofs.length > 0 ? paymentProofs.length : selectedWithdrawal.payment_proof_url?.length || 0})
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {/* Novos comprovantes para upload */}
                          {paymentProofs.length > 0 && selectedWithdrawal.status !== "paid" && paymentProofs.map(proof => <div key={proof.id} className="relative group">
                              <img src={proof.previewUrl} alt="Pré-visualização do comprovante" className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                        setViewerImageUrl(proof.previewUrl);
                        setImageViewerOpen(true);
                      }} />
                              <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveProof(proof.id)}>
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>)}
                          
                          {/* Comprovantes salvos */}
                          {selectedWithdrawal.status === "paid" && selectedWithdrawal.payment_proof_url && selectedWithdrawal.payment_proof_url.map((url, index) => <div key={index} className="relative">
                              <img src={url} alt={`Comprovante ${index + 1}`} className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                        setViewerImageUrl(url);
                        setImageViewerOpen(true);
                      }} />
                            </div>)}
                        </div>
                      </div>}
                    
                    {selectedWithdrawal.status === "paid" && (!selectedWithdrawal.payment_proof_url || selectedWithdrawal.payment_proof_url.length === 0) && <p className="text-xs text-muted-foreground">
                        Nenhum comprovante anexado
                      </p>}
                  </div>}

                <DialogFooter>
                  {selectedWithdrawal.status === "pending" && <>
                      <Button variant="destructive" onClick={() => handleReject(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejeitar
                      </Button>
                      <Button variant="default" onClick={() => handleApprove(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar
                      </Button>
                    </>}
                  {selectedWithdrawal.status === "approved" && <Button variant="default" onClick={() => handlePaid(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending || paymentProofs.length === 0}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Marcar como Pago
                    </Button>}
                  {selectedWithdrawal.status === "paid" && <Button variant="outline" onClick={() => handleRevert(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending}>
                      <Undo2 className="h-4 w-4 mr-2" />
                      Estornar Pagamento
                    </Button>}
                </DialogFooter>
              </TabsContent>

              <TabsContent value="commissions" className="space-y-4">
                {commissions && commissions.length > 0 ? <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Nível</TableHead>
                          <TableHead>Percentual</TableHead>
                          <TableHead>Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissions.map((commission: any) => <TableRow key={commission.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(commission.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR
                        })}
                            </TableCell>
                            <TableCell className="text-sm">
                              {commission.products?.nome || "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {commission.unified_users?.name || "N/A"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {commission.unified_users?.email || "N/A"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {commission.subscriptions?.plans?.name || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                N{commission.level || 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{commission.percentage}%</TableCell>
                            <TableCell className="font-semibold">
                              {Number(commission.amount).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        })}
                            </TableCell>
                          </TableRow>)}
                      </TableBody>
                    </Table>
                  </div> : <p className="text-center text-muted-foreground py-8">
                    Nenhuma comissão vinculada a este saque
                  </p>}
              </TabsContent>
            </Tabs>}
            </div>
          </DrawerContent>
        </Drawer> : <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Saque</DialogTitle>
            </DialogHeader>
            {selectedWithdrawal && <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="commissions">
                    Comissões ({selectedWithdrawal.commission_ids?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Afiliado</p>
                      <p className="font-medium">{selectedWithdrawal.profiles?.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedWithdrawal.profiles?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      {getStatusBadge(selectedWithdrawal.status)}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valor</p>
                      <p className="font-bold text-lg">
                        {Number(selectedWithdrawal.amount).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data Solicitação</p>
                      <p className="font-medium">
                        {format(new Date(selectedWithdrawal.requested_date), "dd/MM/yyyy HH:mm", {
                    locale: ptBR
                  })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Chave PIX</p>
                      <p className="font-mono text-sm">{selectedWithdrawal.pix_key}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo PIX</p>
                      <p className="uppercase">{selectedWithdrawal.pix_type}</p>
                    </div>
                    {selectedWithdrawal.approved_date && <div>
                        <p className="text-sm text-muted-foreground">Data Aprovação</p>
                        <p className="font-medium">
                          {format(new Date(selectedWithdrawal.approved_date), "dd/MM/yyyy HH:mm", {
                    locale: ptBR
                  })}
                        </p>
                      </div>}
                    {selectedWithdrawal.paid_date && <div>
                        <p className="text-sm text-muted-foreground">Data Pagamento</p>
                        <p className="font-medium">
                          {format(new Date(selectedWithdrawal.paid_date), "dd/MM/yyyy HH:mm", {
                    locale: ptBR
                  })}
                        </p>
                      </div>}
                    {selectedWithdrawal.rejected_reason && <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Motivo da Rejeição</p>
                        <p className="text-red-600">{selectedWithdrawal.rejected_reason}</p>
                      </div>}
                  </div>

                  {selectedWithdrawal.status === "pending" && <div className="space-y-2 pt-4 border-t">
                      <Textarea placeholder="Motivo da rejeição (se aplicável)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="min-h-[80px]" />
                    </div>}

                  {(selectedWithdrawal.status === "approved" || selectedWithdrawal.status === "paid") && <div className="space-y-4 pt-4 border-t">
                      <div>
                        <Label htmlFor="payment-proof">
                          {selectedWithdrawal.status === "paid" ? "Comprovantes anexados" : "Anexar Comprovantes de Pagamento PIX"}
                        </Label>
                        {selectedWithdrawal.status !== "paid" && <div className="mt-2">
                            <input id="payment-proof" type="file" accept="image/*" multiple onChange={handleAddProof} className="hidden" />
                            <Button type="button" variant="outline" onClick={() => document.getElementById('payment-proof')?.click()} className="w-full">
                              <ImagePlus className="h-4 w-4 mr-2" />
                              Adicionar Comprovantes
                            </Button>
                          </div>}
                      </div>
                      
                      {(paymentProofs.length > 0 && selectedWithdrawal.status !== "paid" || selectedWithdrawal.status === "paid" && selectedWithdrawal.payment_proof_url && selectedWithdrawal.payment_proof_url.length > 0) && <div className="space-y-2">
                          <p className="text-sm font-medium">
                            Comprovantes de Pagamento ({paymentProofs.length > 0 ? paymentProofs.length : selectedWithdrawal.payment_proof_url?.length || 0})
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {paymentProofs.length > 0 && selectedWithdrawal.status !== "paid" && paymentProofs.map(proof => <div key={proof.id} className="relative group">
                                <img src={proof.previewUrl} alt="Pré-visualização do comprovante" className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                      setViewerImageUrl(proof.previewUrl);
                      setImageViewerOpen(true);
                    }} />
                                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveProof(proof.id)}>
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </div>)}
                            
                            {selectedWithdrawal.status === "paid" && selectedWithdrawal.payment_proof_url && selectedWithdrawal.payment_proof_url.map((url, index) => <div key={index} className="relative">
                                <img src={url} alt={`Comprovante ${index + 1}`} className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                      setViewerImageUrl(url);
                      setImageViewerOpen(true);
                    }} />
                              </div>)}
                          </div>
                        </div>}
                      
                      {selectedWithdrawal.status === "paid" && (!selectedWithdrawal.payment_proof_url || selectedWithdrawal.payment_proof_url.length === 0) && <p className="text-xs text-muted-foreground">
                          Nenhum comprovante anexado
                        </p>}
                    </div>}

                  <DialogFooter>
                    {selectedWithdrawal.status === "pending" && <>
                        <Button variant="destructive" onClick={() => handleReject(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                        <Button variant="default" onClick={() => handleApprove(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar
                        </Button>
                      </>}
                    {selectedWithdrawal.status === "approved" && <Button variant="default" onClick={() => handlePaid(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending || paymentProofs.length === 0}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Marcar como Pago
                      </Button>}
                    {selectedWithdrawal.status === "paid" && <Button variant="outline" onClick={() => handleRevert(selectedWithdrawal.id)} disabled={updateWithdrawalMutation.isPending}>
                        <Undo2 className="h-4 w-4 mr-2" />
                        Estornar Pagamento
                      </Button>}
                  </DialogFooter>
                </TabsContent>

                <TabsContent value="commissions" className="space-y-4">
                  {commissions && commissions.length > 0 ? <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Nível</TableHead>
                            <TableHead>Percentual</TableHead>
                            <TableHead>Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commissions.map((commission: any) => <TableRow key={commission.id}>
                              <TableCell className="text-xs whitespace-nowrap">
                                {format(new Date(commission.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR
                      })}
                              </TableCell>
                              <TableCell className="text-sm">
                                {commission.products?.nome || "N/A"}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {commission.unified_users?.name || "N/A"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {commission.unified_users?.email || "N/A"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {commission.subscriptions?.plans?.name || "N/A"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  N{commission.level || 1}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{commission.percentage}%</TableCell>
                              <TableCell className="font-semibold">
                                {Number(commission.amount).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                      })}
                              </TableCell>
                            </TableRow>)}
                        </TableBody>
                      </Table>
                    </div> : <p className="text-center text-muted-foreground py-8">
                      Nenhuma comissão vinculada a este saque
                    </p>}
                </TabsContent>
              </Tabs>}
          </DialogContent>
        </Dialog>}

      {/* Dialog de Visualização de Imagem */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center bg-black/95">
            <img src={viewerImageUrl || ""} alt="Comprovante de pagamento em tamanho completo" className="max-w-full max-h-[95vh] object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}