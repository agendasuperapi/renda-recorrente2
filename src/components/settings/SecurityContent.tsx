import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, Shield, Trash2, AlertTriangle, ChevronDown } from "lucide-react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logActivity } from "@/lib/activityLogger";

const passwordSchema = z.object({
  newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export const SecurityContent = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Account deletion state
  const [deletionReason, setDeletionReason] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteSectionOpen, setIsDeleteSectionOpen] = useState(false);

  // Check if user is super_admin
  const { data: userRole } = useQuery({
    queryKey: ["user-role", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user role:", error);
      }
      return data?.role || null;
    },
    enabled: !!userId,
  });

  // Get active subscription
  const { data: subscription } = useQuery({
    queryKey: ["active-subscription", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          id,
          status,
          cancel_at_period_end,
          current_period_start,
          current_period_end,
          plan_id,
          plans:plan_id (name)
        `)
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }
      return data;
    },
    enabled: !!userId,
  });

  const isSuperAdmin = userRole === "super_admin";
  const hasActivePlan = subscription && !subscription.cancel_at_period_end;
  const planName = (subscription?.plans as any)?.name || "Plano";
  const periodEnd = subscription?.current_period_end 
    ? format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  const handleChangePassword = async () => {
    try {
      const validation = passwordSchema.safeParse({ newPassword, confirmPassword });
      
      if (!validation.success) {
        const errors = validation.error.errors;
        toast.error(errors[0].message);
        return;
      }

      setIsLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        if (error.message.includes("same_password")) {
          toast.error("A nova senha deve ser diferente da senha atual");
        } else {
          toast.error("Erro ao alterar senha: " + error.message);
        }
        return;
      }

      // Registrar atividade
      if (userId) {
        await logActivity({
          userId,
          activityType: 'password_changed',
          description: 'Senha alterada com sucesso',
          category: 'security'
        });
      }

      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast.error("Erro ao alterar senha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "EXCLUIR") {
      toast.error("Digite EXCLUIR para confirmar");
      return;
    }

    if (!deletionReason.trim()) {
      toast.error("Informe o motivo da exclusão");
      return;
    }

    setIsDeleting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const response = await supabase.functions.invoke("delete-user-account", {
        body: { deletion_reason: deletionReason.trim() },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao excluir conta");
      }

      if (response.data?.error) {
        if (response.data.has_active_plan) {
          toast.error("Você possui um plano ativo. Cancele antes de excluir a conta.");
        } else {
          toast.error(response.data.error);
        }
        return;
      }

      toast.success("Conta excluída com sucesso. Você será redirecionado.");
      
      // Sign out and redirect
      await supabase.auth.signOut();
      navigate("/");
      
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Erro ao excluir conta. Tente novamente.");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setConfirmText("");
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Card: Alterar Senha */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Segurança da Conta</CardTitle>
          </div>
          <CardDescription>
            Gerencie a segurança da sua conta alterando sua senha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Alterar Senha</span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                onClick={handleChangePassword} 
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full sm:w-auto"
              >
                {isLoading ? "Alterando..." : "Alterar Senha"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card: Excluir Conta - Hidden for super_admin */}
      {!isSuperAdmin && (
        <Collapsible open={isDeleteSectionOpen} onOpenChange={setIsDeleteSectionOpen}>
          <Card className="border-destructive/50">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-destructive" />
                    <CardTitle className="text-destructive">Excluir Conta</CardTitle>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isDeleteSectionOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardHeader className="pt-0">
                <CardDescription>
                  Exclua permanentemente sua conta e todos os dados pessoais associados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasActivePlan ? (
                  <Alert variant="destructive" className="border-orange-500/50 bg-orange-500/10">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <AlertDescription className="text-foreground">
                      <div className="space-y-2">
                        <p className="font-semibold">Você possui um plano ativo</p>
                        <p>
                          <strong>Plano:</strong> {planName}<br />
                          <strong>Válido até:</strong> {periodEnd}
                        </p>
                        <p>
                          Para excluir sua conta, primeiro cancele seu plano ativo. 
                          Vá na aba <strong>Meu Plano</strong> e clique em <strong>Gerenciar Assinatura</strong>.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate("/settings?tab=plan")}
                          className="mt-2"
                        >
                          Ir para Meu Plano
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Alert variant="destructive" className="bg-destructive/10">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Atenção:</strong> Esta ação é irreversível. Ao excluir sua conta:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Seus dados pessoais serão anonimizados</li>
                          <li>Você será deslogado imediatamente</li>
                          <li><strong>Comissões de recorrências futuras</strong> das suas indicações serão perdidas</li>
                          <li><strong>Comissões pendentes</strong> que ainda não foram liberadas serão perdidas</li>
                          <li><strong>Saldo de comissões</strong> disponível que não foi solicitado será perdido</li>
                          <li>Caso faça um novo cadastro, <strong>não será possível recuperar suas indicações</strong></li>
                          <li>O histórico de comissões será mantido (sem dados pessoais)</li>
                          <li>Você poderá criar uma nova conta com o mesmo email</li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="deletionReason">Motivo da exclusão *</Label>
                      <Textarea
                        id="deletionReason"
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value)}
                        placeholder="Por favor, informe o motivo pelo qual deseja excluir sua conta..."
                        className="min-h-[100px]"
                      />
                    </div>

                    <Button 
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={!deletionReason.trim()}
                      className="w-full sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Minha Conta
                    </Button>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Tem certeza que deseja excluir sua conta?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Esta ação é <strong>IRREVERSÍVEL</strong>. Ao confirmar:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Seus dados pessoais serão anonimizados permanentemente</li>
                <li>Você será deslogado imediatamente</li>
                <li>Não será possível recuperar sua conta</li>
              </ul>
              <div className="pt-4">
                <Label htmlFor="confirmDelete">
                  Para confirmar, digite <strong>EXCLUIR</strong> abaixo:
                </Label>
                <Input
                  id="confirmDelete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="EXCLUIR"
                  className="mt-2"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={confirmText !== "EXCLUIR" || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir Permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
