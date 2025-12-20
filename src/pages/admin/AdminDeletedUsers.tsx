import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserX, Calendar, Mail, User, MessageSquare, ShieldAlert, Loader2, RefreshCw, History, CreditCard, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface DeletedUserRecord {
  id: string;
  name: string;
  deletion_reason: string | null;
  deleted_at: string;
  deleted_by: string | null;
  metadata: {
    deleted_by_admin?: boolean;
    [key: string]: unknown;
  } | null;
}

interface DeletedUser {
  user_id: string;
  email: string;
  records: DeletedUserRecord[];
  latestRecord: DeletedUserRecord;
  isProfileAnonymized: boolean;
  // Informações adicionais do histórico
  originalName: string | null;
  planName: string | null;
  planPrice: number | null;
  subscriptionStatus: string | null;
  createdAt: string | null;
  totalCommissions: number | null;
}

export default function AdminDeletedUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<DeletedUser | null>(null);
  const [isAnonymizing, setIsAnonymizing] = useState(false);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();

  const { data: deletedUsers, isLoading, refetch } = useQuery({
    queryKey: ['deleted-users', environment],
    queryFn: async () => {
      // Buscar deleted_users
      const { data: deletedData, error: deletedError } = await supabase
        .from('deleted_users')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (deletedError) throw deletedError;
      
      // Agrupar por user_id
      const groupedByUserId = new Map<string, {
        email: string;
        records: DeletedUserRecord[];
      }>();

      deletedData?.forEach(record => {
        if (!groupedByUserId.has(record.user_id)) {
          groupedByUserId.set(record.user_id, {
            email: record.email,
            records: []
          });
        }
        groupedByUserId.get(record.user_id)!.records.push({
          id: record.id,
          name: record.name,
          deletion_reason: record.deletion_reason,
          deleted_at: record.deleted_at,
          deleted_by: record.deleted_by,
          metadata: record.metadata as DeletedUserRecord['metadata']
        });
      });

      // Buscar profiles correspondentes para verificar status real de anonimização E filtrar por environment
      const userIds = Array.from(groupedByUserId.keys());
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, created_at, environment')
        .in('id', userIds)
        .eq('environment', environment);
      
      // Criar mapa de profiles para lookup rápido
      const profilesMap = new Map(profilesData?.map(p => [p.id, { name: p.name, createdAt: p.created_at }]) || []);
      
      // Buscar subscriptions para obter plano
      const { data: subscriptionsData } = await supabase
        .from('subscriptions')
        .select('user_id, status, plan_id, plans(name, price)')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      // Criar mapa de subscriptions (última subscription por user)
      const subscriptionsMap = new Map<string, { status: string; planName: string | null; planPrice: number | null }>();
      subscriptionsData?.forEach(sub => {
        if (!subscriptionsMap.has(sub.user_id)) {
          subscriptionsMap.set(sub.user_id, {
            status: sub.status,
            planName: (sub.plans as any)?.name || null,
            planPrice: (sub.plans as any)?.price || null
          });
        }
      });

      // Buscar total de comissões
      const { data: commissionsData } = await supabase
        .from('commissions')
        .select('affiliate_id, amount')
        .in('affiliate_id', userIds);

      // Agrupar comissões por usuário
      const commissionsMap = new Map<string, number>();
      commissionsData?.forEach(comm => {
        const current = commissionsMap.get(comm.affiliate_id) || 0;
        commissionsMap.set(comm.affiliate_id, current + Number(comm.amount));
      });

      // Construir resultado final - apenas para profiles que existem no ambiente selecionado
      const result: DeletedUser[] = [];
      const profileUserIds = new Set(profilesData?.map(p => p.id) || []);
      
      groupedByUserId.forEach((data, user_id) => {
        // Só incluir se o profile existe no ambiente selecionado
        if (!profileUserIds.has(user_id)) return;
        
        // Ordenar records por data (mais recente primeiro)
        data.records.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
        const latestRecord = data.records[0];
        const profileInfo = profilesMap.get(user_id);
        const subInfo = subscriptionsMap.get(user_id);

        // Encontrar o nome original (não ##EXCLUÍDO##)
        const originalName = data.records.find(r => r.name !== '##EXCLUÍDO##')?.name || null;

        result.push({
          user_id,
          email: data.email,
          records: data.records,
          latestRecord,
          isProfileAnonymized: profileInfo?.name === '##EXCLUÍDO##' || !profileInfo,
          originalName,
          planName: subInfo?.planName || null,
          planPrice: subInfo?.planPrice || null,
          subscriptionStatus: subInfo?.status || null,
          createdAt: profileInfo?.createdAt || null,
          totalCommissions: commissionsMap.get(user_id) || null
        });
      });

      // Ordenar por data de exclusão mais recente
      result.sort((a, b) => new Date(b.latestRecord.deleted_at).getTime() - new Date(a.latestRecord.deleted_at).getTime());

      return result;
    },
  });

  const filteredUsers = deletedUsers?.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.latestRecord.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.latestRecord.deletion_reason?.toLowerCase().includes(searchLower) ||
      user.originalName?.toLowerCase().includes(searchLower)
    );
  });

  // Usuários não anonimizados (profile.name não é ##EXCLUÍDO##)
  const nonAnonymizedUsers = deletedUsers?.filter(user => 
    !user.isProfileAnonymized
  ) || [];

  const handleAnonymizeUser = async (userId: string) => {
    setIsAnonymizing(true);
    try {
      // Anonimizar o profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: '##EXCLUÍDO##',
          email: null,
          phone: null,
          cpf: null,
          birth_date: null,
          avatar_url: null,
          pix_key: null,
          pix_type: null,
          street: null,
          number: null,
          complement: null,
          neighborhood: null,
          city: null,
          state: null,
          cep: null,
          instagram: null,
          facebook: null,
          tiktok: null,
          youtube: null,
          twitter: null,
          linkedin: null,
          username: `deleted_${Date.now()}`,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Atualizar todos os registros em deleted_users para este usuário
      const { error: deletedError } = await supabase
        .from('deleted_users')
        .update({
          name: '##EXCLUÍDO##',
          metadata: {
            manually_anonymized: true,
            anonymized_at: new Date().toISOString(),
          }
        })
        .eq('user_id', userId);

      if (deletedError) throw deletedError;

      toast.success("Usuário anonimizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['deleted-users'] });
      setSelectedUser(null);
    } catch (error) {
      console.error('Erro ao anonimizar:', error);
      toast.error("Erro ao anonimizar usuário");
    } finally {
      setIsAnonymizing(false);
    }
  };

  const handleAnonymizeAll = async () => {
    setIsAnonymizing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const user of nonAnonymizedUsers) {
      try {
        // Anonimizar o profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: '##EXCLUÍDO##',
            email: null,
            phone: null,
            cpf: null,
            birth_date: null,
            avatar_url: null,
            pix_key: null,
            pix_type: null,
            street: null,
            number: null,
            complement: null,
            neighborhood: null,
            city: null,
            state: null,
            cep: null,
            instagram: null,
            facebook: null,
            tiktok: null,
            youtube: null,
            twitter: null,
            linkedin: null,
            username: `deleted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            deleted_at: new Date().toISOString(),
          })
          .eq('id', user.user_id);

        if (profileError) throw profileError;

        // Atualizar todos os registros em deleted_users para este usuário
        const { error: deletedError } = await supabase
          .from('deleted_users')
          .update({
            name: '##EXCLUÍDO##',
            metadata: {
              manually_anonymized: true,
              anonymized_at: new Date().toISOString(),
            }
          })
          .eq('user_id', user.user_id);

        if (deletedError) throw deletedError;

        successCount++;
      } catch (error) {
        console.error(`Erro ao anonimizar ${user.user_id}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} usuário(s) anonimizado(s) com sucesso`);
    }
    if (errorCount > 0) {
      toast.error(`Falha ao anonimizar ${errorCount} usuário(s)`);
    }
    if (successCount === 0 && errorCount === 0) {
      toast.info("Nenhum usuário para anonimizar");
    }

    queryClient.invalidateQueries({ queryKey: ['deleted-users'] });
    setIsAnonymizing(false);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getDisplayName = (user: DeletedUser) => {
    if (user.latestRecord.name !== '##EXCLUÍDO##') {
      return user.latestRecord.name;
    }
    if (user.originalName) {
      return user.originalName;
    }
    return '##EXCLUÍDO##';
  };

  return (
    <div className="space-y-4">
      <ScrollAnimation animation="fade-up">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Usuários Excluídos
            </CardTitle>
            <CardDescription>
              Histórico de contas excluídas com motivos e metadados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alerta de usuários não anonimizados */}
            {nonAnonymizedUsers.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium">
                    {nonAnonymizedUsers.length} usuário(s) não anonimizado(s)
                  </span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={isAnonymizing}
                    >
                      {isAnonymizing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Anonimizar Todos
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Anonimizar todos os usuários?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso irá anonimizar permanentemente os dados de {nonAnonymizedUsers.length} usuário(s).
                        Nomes serão substituídos por "##EXCLUÍDO##" e dados pessoais serão removidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleAnonymizeAll}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, email ou motivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                title="Atualizar lista"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : filteredUsers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário excluído encontrado
              </div>
            ) : isMobile ? (
              // Mobile card layout
              <div className="space-y-3">
                {filteredUsers?.map((user) => (
                  <Card 
                    key={user.user_id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedUser(user)}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{getDisplayName(user)}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!user.isProfileAnonymized && (
                            <Badge variant="destructive" className="text-xs">Não anonimizado</Badge>
                          )}
                          {user.latestRecord.metadata?.deleted_by_admin && (
                            <Badge variant="secondary" className="text-xs">Admin</Badge>
                          )}
                        </div>
                      </div>
                      {user.planName && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          {user.planName}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(user.latestRecord.deleted_at)}
                      </div>
                      {user.latestRecord.deletion_reason && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {user.latestRecord.deletion_reason}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Desktop table layout
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => (
                      <TableRow 
                        key={user.user_id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          <div>
                            {getDisplayName(user)}
                            {user.originalName && user.latestRecord.name === '##EXCLUÍDO##' && (
                              <span className="text-xs text-muted-foreground ml-1">(antigo)</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.planName ? (
                            <Badge variant="outline">{user.planName}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {user.latestRecord.deletion_reason || "-"}
                        </TableCell>
                        <TableCell>{formatDate(user.latestRecord.deleted_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {!user.isProfileAnonymized && (
                              <Badge variant="destructive">Não anonimizado</Badge>
                            )}
                            {user.latestRecord.metadata?.deleted_by_admin ? (
                              <Badge variant="secondary">Admin</Badge>
                            ) : (
                              <Badge variant="outline">Usuário</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedUser(user)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Total: {filteredUsers?.length || 0} usuário(s) excluído(s)
            </p>
          </CardContent>
        </Card>
      </ScrollAnimation>

      {/* Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Detalhes da Exclusão
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre a conta excluída
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Nome atual</p>
                    <p className="font-medium">{selectedUser.latestRecord.name}</p>
                    {selectedUser.originalName && selectedUser.originalName !== selectedUser.latestRecord.name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Nome original: <span className="font-medium text-foreground">{selectedUser.originalName}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                </div>

                {selectedUser.planName && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Plano</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{selectedUser.planName}</p>
                        {selectedUser.planPrice && (
                          <Badge variant="outline">
                            R$ {selectedUser.planPrice.toFixed(2).replace('.', ',')}
                          </Badge>
                        )}
                        {selectedUser.subscriptionStatus && (
                          <Badge variant={selectedUser.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                            {selectedUser.subscriptionStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedUser.totalCommissions !== null && selectedUser.totalCommissions > 0 && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Comissões</p>
                      <p className="font-medium">
                        R$ {selectedUser.totalCommissions.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                )}

                {selectedUser.createdAt && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                      <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data da Exclusão</p>
                    <p className="font-medium">{formatDate(selectedUser.latestRecord.deleted_at)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Motivo</p>
                    <p className="font-medium">
                      {selectedUser.latestRecord.deletion_reason || "Não informado"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Origem</p>
                  {selectedUser.latestRecord.metadata?.deleted_by_admin ? (
                    <Badge variant="secondary">Excluído por Administrador</Badge>
                  ) : (
                    <Badge variant="outline">Excluído pelo próprio usuário</Badge>
                  )}
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-2">ID do Usuário</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {selectedUser.user_id}
                  </code>
                </div>

                {/* Histórico de registros de exclusão */}
                {selectedUser.records.length > 1 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Histórico de Registros ({selectedUser.records.length})</p>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedUser.records.map((record, index) => (
                        <div key={record.id} className="p-2 bg-muted/50 rounded text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{record.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(record.deleted_at)}
                            </span>
                          </div>
                          {record.deletion_reason && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {record.deletion_reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botão de anonimizar se não estiver anonimizado */}
                {!selectedUser.isProfileAnonymized && (
                  <div className="pt-4 border-t">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          className="w-full"
                          disabled={isAnonymizing}
                        >
                          {isAnonymizing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ShieldAlert className="h-4 w-4 mr-2" />
                          )}
                          Anonimizar Este Usuário
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Anonimizar este usuário?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso irá substituir o nome por "##EXCLUÍDO##" e remover todos os dados pessoais do perfil.
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleAnonymizeUser(selectedUser.user_id)}>
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
