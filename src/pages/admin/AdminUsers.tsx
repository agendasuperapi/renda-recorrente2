import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, ChevronLeft, ChevronRight, Eye, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, X, Save, Calendar } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const WEEKDAYS = [
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editedBlockMessage, setEditedBlockMessage] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [withdrawalDay, setWithdrawalDay] = useState<number | null>(null);
  const [isEditingWithdrawal, setIsEditingWithdrawal] = useState(false);
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", debouncedSearch, statusFilter, currentPage, itemsPerPage, sortColumn, sortDirection],
    queryFn: async () => {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("view_admin_users")
        .select("*", { count: "exact" })
        .order(sortColumn, { ascending: sortDirection === "asc" })
        .range(from, to);

      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,username.ilike.%${debouncedSearch}%,affiliate_code.ilike.%${debouncedSearch}%`
        );
      }

      if (statusFilter === "active") {
        query = query.eq("is_blocked", false);
      } else if (statusFilter === "blocked") {
        query = query.eq("is_blocked", true);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      
      return { users: data || [], total: count || 0 };
    },
  });

  const users = usersData?.users || [];
  const totalCount = usersData?.total || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["user-activities", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", selectedUser.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUser?.id,
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewDetails = (user: any) => {
    setSelectedUser(user);
    setIsBlocked(user.is_blocked || false);
    setEditedBlockMessage(user.blocked_message || "");
    setWithdrawalDay(user.withdrawal_day);
    setIsEditingWithdrawal(false);
    setIsDetailsOpen(true);
  };

  const updateBlockStatusMutation = useMutation({
    mutationFn: async ({ userId, isBlocked, message }: { userId: string; isBlocked: boolean; message?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("profiles")
        .update({
          is_blocked: isBlocked,
          blocked_message: message || null,
          blocked_at: isBlocked ? new Date().toISOString() : null,
          blocked_by: isBlocked ? user?.id : null,
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Status do usuário atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating user status:", error);
      toast.error("Erro ao atualizar status do usuário");
    },
  });

  const updateWithdrawalDayMutation = useMutation({
    mutationFn: async (newDay: number) => {
      if (!selectedUser) throw new Error("User ID not found");
      
      const { error } = await supabase
        .from("profiles")
        .update({ withdrawal_day: newDay })
        .eq("id", selectedUser.id);
      
      if (error) throw error;
    },
    onSuccess: (_, newDay) => {
      toast.success("Dia de saque atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUser({ ...selectedUser, withdrawal_day: newDay });
      setIsEditingWithdrawal(false);
    },
    onError: (error) => {
      console.error("Error updating withdrawal day:", error);
      toast.error("Erro ao atualizar dia de saque");
    },
  });

  const handleSaveBlockStatus = () => {
    if (!selectedUser) return;
    
    if (isBlocked && !editedBlockMessage.trim()) {
      toast.error("Por favor, insira uma mensagem de bloqueio");
      return;
    }

    updateBlockStatusMutation.mutate({
      userId: selectedUser.id,
      isBlocked: isBlocked,
      message: editedBlockMessage,
    });
  };

  const handleSaveWithdrawalDay = () => {
    if (withdrawalDay !== null && withdrawalDay !== undefined) {
      updateWithdrawalDayMutation.mutate(withdrawalDay);
    }
  };

  const getWeekdayLabel = (day: number | null) => {
    if (day === null || day === undefined) return "-";
    return WEEKDAYS.find(w => w.value === day)?.label || "-";
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestão de Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie todos os afiliados e administradores
            </p>
          </div>
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Adicionar Usuário
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email, username ou código..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="blocked">Bloqueados</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 por página</SelectItem>
                    <SelectItem value="10">10 por página</SelectItem>
                    <SelectItem value="25">25 por página</SelectItem>
                    <SelectItem value="50">50 por página</SelectItem>
                    <SelectItem value="100">100 por página</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleResetFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar filtros
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("name")} className="h-8 p-0 hover:bg-transparent">
                      Nome
                      <SortIcon column="name" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("email")} className="h-8 p-0 hover:bg-transparent">
                      Email
                      <SortIcon column="email" />
                    </Button>
                  </TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("created_at")} className="h-8 p-0 hover:bg-transparent">
                      Cadastro
                      <SortIcon column="created_at" />
                    </Button>
                  </TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>{user.username || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "super_admin" ? "default" : "secondary"}>
                          {user.role === "super_admin" ? "Admin" : "Afiliado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_blocked ? "destructive" : "default"}>
                          {user.is_blocked ? "Bloqueado" : "Ativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {users && users.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} usuários
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Detalhes do Usuário</DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="h-[calc(90vh-8rem)] pr-4">
              {selectedUser && (
                <div className="space-y-6">
                  {/* Informações Básicas */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Informações Básicas</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Nome</p>
                        <p className="font-medium">{selectedUser.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Username</p>
                        <p className="font-medium">{selectedUser.username || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedUser.email || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Telefone</p>
                        <p className="font-medium">{selectedUser.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">CPF</p>
                        <p className="font-medium">{selectedUser.cpf || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                        <p className="font-medium">
                          {selectedUser.birth_date ? format(new Date(selectedUser.birth_date), "dd/MM/yyyy") : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gênero</p>
                        <p className="font-medium">{selectedUser.gender || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cadastro</p>
                        <p className="font-medium">
                          {selectedUser.created_at ? format(new Date(selectedUser.created_at), "dd/MM/yyyy HH:mm") : "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Endereço */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Endereço</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Rua</p>
                        <p className="font-medium">{selectedUser.street || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Número</p>
                        <p className="font-medium">{selectedUser.number || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Complemento</p>
                        <p className="font-medium">{selectedUser.complement || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bairro</p>
                        <p className="font-medium">{selectedUser.neighborhood || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">CEP</p>
                        <p className="font-medium">{selectedUser.cep || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cidade</p>
                        <p className="font-medium">{selectedUser.city || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Estado</p>
                        <p className="font-medium">{selectedUser.state || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* PIX */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Informações PIX e Saque</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo de Chave</p>
                        <p className="font-medium">{selectedUser.pix_type || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Chave PIX</p>
                        <p className="font-medium">{selectedUser.pix_key || "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground mb-2">Dia de Saque</p>
                        {isEditingWithdrawal ? (
                          <div className="flex gap-2">
                            <select
                              value={withdrawalDay ?? ""}
                              onChange={(e) => setWithdrawalDay(Number(e.target.value))}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">Selecione...</option>
                              {WEEKDAYS.map((day) => (
                                <option key={day.value} value={day.value}>
                                  {day.label}
                                </option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              onClick={handleSaveWithdrawalDay}
                              disabled={updateWithdrawalDayMutation.isPending}
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsEditingWithdrawal(false);
                                setWithdrawalDay(selectedUser.withdrawal_day);
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{getWeekdayLabel(selectedUser.withdrawal_day)}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsEditingWithdrawal(true)}
                            >
                              Editar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Redes Sociais */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Redes Sociais</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Instagram</p>
                        <p className="font-medium">{selectedUser.instagram || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Facebook</p>
                        <p className="font-medium">{selectedUser.facebook || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">TikTok</p>
                        <p className="font-medium">{selectedUser.tiktok || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Controle de Bloqueio */}
                  {selectedUser?.role !== "super_admin" && (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Controle de Bloqueio</h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <Label htmlFor="block-status">Status de Bloqueio</Label>
                              <p className="text-sm text-muted-foreground">
                                {isBlocked ? "Usuário está bloqueado" : "Usuário está ativo"}
                              </p>
                            </div>
                            <Switch
                              id="block-status"
                              checked={isBlocked}
                              onCheckedChange={setIsBlocked}
                            />
                          </div>

                          {isBlocked && (
                            <div className="space-y-2">
                              <Label htmlFor="blockMessage">Mensagem de Bloqueio</Label>
                              <Textarea
                                id="blockMessage"
                                placeholder="Digite a mensagem que será exibida ao usuário..."
                                value={editedBlockMessage}
                                onChange={(e) => setEditedBlockMessage(e.target.value)}
                                rows={4}
                              />
                            </div>
                          )}

                          <Button 
                            onClick={handleSaveBlockStatus}
                            className="w-full"
                            disabled={updateBlockStatusMutation.isPending}
                          >
                            {updateBlockStatusMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                          </Button>

                          {selectedUser?.blocked_at && (
                            <p className="text-xs text-muted-foreground text-center">
                              Bloqueado em: {format(new Date(selectedUser.blocked_at), "dd/MM/yyyy HH:mm")}
                            </p>
                          )}
                        </div>
                      </div>

                      <Separator />
                    </>
                  )}

                  {/* Histórico de Atividades */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Histórico de Atividades</h3>
                    {activitiesLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : activities && activities.length > 0 ? (
                      <div className="space-y-3">
                        {activities.map((activity) => (
                          <div key={activity.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{activity.activity_type}</p>
                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(activity.created_at), "dd/MM/yyyy HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma atividade registrada
                      </p>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default AdminUsers;
