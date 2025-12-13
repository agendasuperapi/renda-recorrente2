import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserX, Calendar, Mail, User, MessageSquare, ShieldAlert, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

interface DeletedUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  deletion_reason: string | null;
  deleted_at: string;
  deleted_by: string | null;
  metadata: {
    deleted_by_admin?: boolean;
    [key: string]: unknown;
  } | null;
}

export default function AdminDeletedUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<DeletedUser | null>(null);
  const [isAnonymizing, setIsAnonymizing] = useState(false);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const { data: deletedUsers, isLoading } = useQuery({
    queryKey: ['deleted-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deleted_users')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      return data as DeletedUser[];
    },
  });

  const filteredUsers = deletedUsers?.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.deletion_reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Usuários não anonimizados (nome não é ##EXCLUÍDO##)
  const nonAnonymizedUsers = deletedUsers?.filter(user => 
    user.name !== "##EXCLUÍDO##"
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

      // Atualizar o registro em deleted_users
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

    console.log('Iniciando anonimização de', nonAnonymizedUsers.length, 'usuários');

    for (const user of nonAnonymizedUsers) {
      try {
        console.log('Anonimizando usuário:', user.user_id, user.name);
        
        // Anonimizar o profile
        const { error: profileError, data: profileData } = await supabase
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
          .eq('id', user.user_id)
          .select();

        console.log('Profile update result:', { profileError, profileData });

        if (profileError) {
          console.error('Profile error:', profileError);
          throw profileError;
        }

        // Atualizar o registro em deleted_users
        const { error: deletedError, data: deletedData } = await supabase
          .from('deleted_users')
          .update({
            name: '##EXCLUÍDO##',
            metadata: {
              ...(user.metadata || {}),
              manually_anonymized: true,
              anonymized_at: new Date().toISOString(),
            }
          })
          .eq('user_id', user.user_id)
          .select();

        console.log('Deleted users update result:', { deletedError, deletedData });

        if (deletedError) {
          console.error('Deleted users error:', deletedError);
          throw deletedError;
        }

        successCount++;
      } catch (error) {
        console.error(`Erro ao anonimizar ${user.user_id}:`, error);
        errorCount++;
      }
    }

    console.log('Resultado final:', { successCount, errorCount });

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

  const isUserAnonymized = (user: DeletedUser) => user.name === "##EXCLUÍDO##";

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome, email ou motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
                    key={user.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedUser(user)}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isUserAnonymized(user) && (
                            <Badge variant="destructive" className="text-xs">Não anonimizado</Badge>
                          )}
                          {user.metadata?.deleted_by_admin && (
                            <Badge variant="secondary" className="text-xs">Admin</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(user.deleted_at)}
                      </div>
                      {user.deletion_reason && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {user.deletion_reason}
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
                      <TableHead>Motivo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Origem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => (
                      <TableRow 
                        key={user.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedUser(user)}
                      >
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {user.deletion_reason || "-"}
                        </TableCell>
                        <TableCell>{formatDate(user.deleted_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {!isUserAnonymized(user) && (
                              <Badge variant="destructive">Não anonimizado</Badge>
                            )}
                            {user.metadata?.deleted_by_admin ? (
                              <Badge variant="secondary">Admin</Badge>
                            ) : (
                              <Badge variant="outline">Usuário</Badge>
                            )}
                          </div>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Detalhes da Exclusão
            </DialogTitle>
            <DialogDescription>
              Informações sobre a conta excluída
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{selectedUser.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data da Exclusão</p>
                    <p className="font-medium">{formatDate(selectedUser.deleted_at)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Motivo</p>
                    <p className="font-medium">
                      {selectedUser.deletion_reason || "Não informado"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Origem</p>
                  {selectedUser.metadata?.deleted_by_admin ? (
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

                {/* Botão de anonimizar se não estiver anonimizado */}
                {!isUserAnonymized(selectedUser) && (
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
