import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DevModeAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DevModeAuthDialog = ({ open, onOpenChange, onSuccess }: DevModeAuthDialogProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Tentar autenticar com as credenciais fornecidas
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Credenciais inválidas");
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Erro ao autenticar");
        setLoading(false);
        return;
      }

      // Verificar se o usuário é super_admin
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .eq("role", "super_admin")
        .single();

      if (roleError || !roleData) {
        // Fazer logout imediatamente se não for admin
        await supabase.auth.signOut();
        setError("Acesso negado. Apenas administradores podem ativar o modo desenvolvedor.");
        setLoading(false);
        return;
      }

      // É super_admin - ativar modo desenvolvedor
      localStorage.setItem("devMode", "true");
      localStorage.setItem("devModeActivatedBy", authData.user.email || "");
      localStorage.setItem("devModeActivatedAt", new Date().toISOString());

      // Fazer logout para não manter sessão na landing page
      await supabase.auth.signOut();

      toast({
        title: "🔧 Modo Desenvolvedor Ativado",
        description: "Os formulários serão preenchidos automaticamente para testes",
        duration: 5000,
      });

      onSuccess();
      onOpenChange(false);
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error("Erro ao autenticar:", err);
      setError("Erro ao processar autenticação");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Modo Desenvolvedor</DialogTitle>
              <DialogDescription>
                Autenticação de administrador necessária
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dev-email">Email do administrador</Label>
            <Input
              id="dev-email"
              type="email"
              placeholder="admin@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dev-password">Senha</Label>
            <Input
              id="dev-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Autenticar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
