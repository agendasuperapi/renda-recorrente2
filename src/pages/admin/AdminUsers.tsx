import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const itemsPerPage = 10;

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        role: rolesMap.get(profile.id) || "afiliado"
      })) || [];

      // Sort admins first, then by created_at desc
      return usersWithRoles.sort((a, b) => {
        if (a.role === "super_admin" && b.role !== "super_admin") return -1;
        if (a.role !== "super_admin" && b.role === "super_admin") return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
  });

  const filteredUsers = users?.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.affiliate_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil((filteredUsers?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers?.slice(startIndex, endIndex);

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
    setIsDetailsOpen(true);
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
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">Filtros</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Cadastro</TableHead>
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
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : paginatedUsers && paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.username || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "super_admin" ? "default" : "secondary"}>
                          {user.role === "super_admin" ? "Admin" : "Afiliado"}
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {filteredUsers && filteredUsers.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredUsers.length)} de {filteredUsers.length} usuários
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
                    <h3 className="text-lg font-semibold mb-3">Informações PIX</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo de Chave</p>
                        <p className="font-medium">{selectedUser.pix_type || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Chave PIX</p>
                        <p className="font-medium">{selectedUser.pix_key || "-"}</p>
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
