import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";

interface UsernameEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUsername: string;
  userId: string;
  onSuccess: () => void;
}

export function UsernameEditDialog({
  open,
  onOpenChange,
  currentUsername,
  userId,
  onSuccess,
}: UsernameEditDialogProps) {
  const { toast } = useToast();
  const [newUsername, setNewUsername] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [hasCoupons, setHasCoupons] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNewUsername("");
      setUsernameAvailable(null);
      checkForCoupons();
    }
  }, [open]);

  const checkForCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("affiliate_coupons")
        .select("id")
        .eq("affiliate_id", userId)
        .limit(1);

      if (error) throw error;
      setHasCoupons(data && data.length > 0);
    } catch (error) {
      console.error("Erro ao verificar cupons:", error);
    }
  };

  const normalizeUsername = (value: string) => {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    // Verifica se é o mesmo username atual
    if (username === currentUsername) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", userId)
        .maybeSingle();

      if (error) throw error;
      setUsernameAvailable(data === null);
    } catch (error) {
      console.error("Erro ao verificar username:", error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    const normalized = normalizeUsername(value);
    setNewUsername(normalized);

    if (normalized.length >= 3) {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(normalized);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setUsernameAvailable(null);
    }
  };

  const handleSave = async () => {
    if (!newUsername || newUsername.length < 3) {
      toast({
        title: "Username inválido",
        description: "O username deve ter pelo menos 3 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (usernameAvailable !== true) {
      toast({
        title: "Username indisponível",
        description: "Este username já está em uso",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Excluir todos os cupons do afiliado
      if (hasCoupons) {
        const { error: deleteCouponsError } = await supabase
          .from("affiliate_coupons")
          .delete()
          .eq("affiliate_id", userId);

        if (deleteCouponsError) throw deleteCouponsError;
      }

      // 2. Atualizar o username
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username: newUsername })
        .eq("id", userId);

      if (updateError) throw updateError;

      toast({
        title: "Username atualizado",
        description: hasCoupons
          ? "Seu username foi atualizado e todos os cupons foram excluídos. Você precisará ativá-los novamente."
          : "Seu username foi atualizado com sucesso!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao atualizar username:", error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Nome de Usuário</DialogTitle>
          <DialogDescription>
            Seu nome de usuário atual é: <strong>{currentUsername}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Label htmlFor="new-username">Novo Nome de Usuário</Label>
            <div className="relative">
              <Input
                id="new-username"
                value={newUsername}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="novousername"
                className={
                  usernameAvailable === false
                    ? "border-destructive"
                    : usernameAvailable === true
                    ? "border-green-500"
                    : ""
                }
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingUsername && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>
            {newUsername.length >= 3 && !checkingUsername && (
              <p
                className={`text-xs mt-1 ${
                  usernameAvailable === true
                    ? "text-green-600"
                    : usernameAvailable === false
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {usernameAvailable === true && "✓ Nome de usuário disponível"}
                {usernameAvailable === false && newUsername === currentUsername && "✗ Este é o seu nome de usuário atual"}
                {usernameAvailable === false && newUsername !== currentUsername && "✗ Nome de usuário já está em uso"}
              </p>
            )}
            {newUsername.length > 0 && newUsername.length < 3 && (
              <p className="text-xs mt-1 text-muted-foreground">Mínimo 3 caracteres</p>
            )}
          </div>

          {hasCoupons && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Você possui cupons cadastrados. Ao alterar seu nome de
                usuário, todos os seus cupons serão excluídos e você precisará ativá-los novamente.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || usernameAvailable !== true}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
