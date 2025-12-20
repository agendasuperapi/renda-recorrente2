import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Unlock, Shield, Clock, AlertTriangle, Ban } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEnvironment } from "@/contexts/EnvironmentContext";

interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string | null;
  failed_count: number;
  last_failed_at: string | null;
  locked_until: string | null;
  is_permanently_blocked: boolean;
  block_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const AdminBlockedAccountsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const { environment } = useEnvironment();

  const { data: loginAttempts = [], isLoading } = useQuery({
    queryKey: ['admin-login-attempts', environment],
    queryFn: async () => {
      // Buscar emails de profiles do ambiente atual
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('email')
        .eq('environment', environment)
        .not('email', 'is', null);
      
      const environmentEmails = profilesData?.map(p => p.email?.toLowerCase()).filter(Boolean) || [];
      
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('last_failed_at', { ascending: false });

      if (error) throw error;
      
      // Filtrar apenas tentativas de login de emails do ambiente atual
      const filteredData = (data || []).filter(attempt => 
        environmentEmails.includes(attempt.email?.toLowerCase())
      );
      
      return filteredData as LoginAttempt[];
    }
  });

  const unblockMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.rpc('admin_unblock_login_account', {
        p_email: email
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-login-attempts'] });
      toast({
        title: "Conta desbloqueada",
        description: "O usuário pode tentar fazer login novamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao desbloquear",
        description: error.message,
      });
    }
  });

  const filteredAttempts = loginAttempts.filter(attempt =>
    attempt.email.toLowerCase().includes(search.toLowerCase()) ||
    attempt.ip_address?.toLowerCase().includes(search.toLowerCase())
  );

  const blockedCount = loginAttempts.filter(a => a.is_permanently_blocked).length;
  const lockedCount = loginAttempts.filter(a => 
    !a.is_permanently_blocked && a.locked_until && new Date(a.locked_until) > new Date()
  ).length;
  const totalAttempts = loginAttempts.reduce((sum, a) => sum + a.failed_count, 0);

  const getStatusBadge = (attempt: LoginAttempt) => {
    if (attempt.is_permanently_blocked) {
      return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" /> Bloqueado</Badge>;
    }
    if (attempt.locked_until && new Date(attempt.locked_until) > new Date()) {
      return <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700"><Clock className="h-3 w-3" /> Temporário</Badge>;
    }
    if (attempt.failed_count >= 3) {
      return <Badge variant="outline" className="gap-1 text-orange-600"><AlertTriangle className="h-3 w-3" /> Alerta</Badge>;
    }
    return <Badge variant="outline" className="gap-1">Normal</Badge>;
  };

  const formatLockTime = (lockedUntil: string | null) => {
    if (!lockedUntil) return "-";
    const lockDate = new Date(lockedUntil);
    if (lockDate <= new Date()) return "Expirado";
    return formatDistanceToNow(lockDate, { addSuffix: true, locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{blockedCount}</p>
                <p className="text-xs text-muted-foreground">Bloqueados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{lockedCount}</p>
                <p className="text-xs text-muted-foreground">Temporários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{loginAttempts.length}</p>
                <p className="text-xs text-muted-foreground">Registros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{totalAttempts}</p>
                <p className="text-xs text-muted-foreground">Tentativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Tentativas de Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isMobile ? (
            // Mobile Card Layout
            <div className="space-y-3">
              {filteredAttempts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado
                </p>
              ) : (
                filteredAttempts.map((attempt) => (
                  <Card key={attempt.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{attempt.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {attempt.ip_address || "IP desconhecido"}
                          </p>
                        </div>
                        {getStatusBadge(attempt)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div>
                          <p className="text-muted-foreground text-xs">Tentativas</p>
                          <p className="font-medium">{attempt.failed_count}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Bloqueio</p>
                          <p className="font-medium">{formatLockTime(attempt.locked_until)}</p>
                        </div>
                      </div>

                      {attempt.last_failed_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Última tentativa: {format(new Date(attempt.last_failed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      )}

                      {(attempt.is_permanently_blocked || (attempt.locked_until && new Date(attempt.locked_until) > new Date())) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full mt-3 gap-2">
                              <Unlock className="h-4 w-4" />
                              Desbloquear
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Desbloquear conta?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso irá remover todas as restrições de login para <strong>{attempt.email}</strong>. 
                                O contador de tentativas será zerado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => unblockMutation.mutate(attempt.email)}
                              >
                                Desbloquear
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            // Desktop Table Layout
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-center">Tentativas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bloqueio expira</TableHead>
                    <TableHead>Última tentativa</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="font-medium">{attempt.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {attempt.ip_address || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={attempt.failed_count >= 5 ? "destructive" : "secondary"}>
                            {attempt.failed_count}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(attempt)}</TableCell>
                        <TableCell>{formatLockTime(attempt.locked_until)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {attempt.last_failed_at 
                            ? format(new Date(attempt.last_failed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          {(attempt.is_permanently_blocked || (attempt.locked_until && new Date(attempt.locked_until) > new Date())) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1">
                                  <Unlock className="h-4 w-4" />
                                  Desbloquear
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Desbloquear conta?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Isso irá remover todas as restrições de login para <strong>{attempt.email}</strong>. 
                                    O contador de tentativas será zerado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => unblockMutation.mutate(attempt.email)}
                                  >
                                    Desbloquear
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};