import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
  const [newUsername, setNewUsername] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [hasCoupons, setHasCoupons] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
    if (!username || username.length < 6) {
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
        .rpc("check_username_availability" as any, {
          p_username: username,
          p_user_id: userId
        });

      if (error) throw error;
      setUsernameAvailable(data === true);
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

    if (normalized.length >= 6) {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(normalized);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setUsernameAvailable(null);
    }
  };

  const handleSaveClick = () => {
    if (!newUsername || newUsername.length < 6) {
      toast({
        title: "Username inválido",
        description: "O username deve ter pelo menos 6 caracteres",
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

    setShowConfirmDialog(true);
  };

  const handleSave = async () => {
    setShowConfirmDialog(false);
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

  const formContent = (
    <div className="space-y-4 py-4 px-4 md:px-6 lg:px-0">
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
        {newUsername.length >= 6 && !checkingUsername && (
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
        {newUsername.length > 0 && newUsername.length < 6 && (
          <p className="text-xs mt-1 text-muted-foreground">Mínimo 6 caracteres</p>
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
  );

  const footerContent = (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
        Cancelar
      </Button>
      <Button onClick={handleSaveClick} disabled={loading || usernameAvailable !== true}>
        Salvar
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="rounded-t-[20px]">
            <DrawerHeader className="text-center">
              <DrawerTitle>Editar Nome de Usuário</DrawerTitle>
              <DrawerDescription>
                Seu nome de usuário atual é: <strong>{currentUsername}</strong>
              </DrawerDescription>
            </DrawerHeader>
            {formContent}
            <DrawerFooter className="pt-2">
              {footerContent}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alteração de username</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja alterar seu nome de usuário de <strong>{currentUsername}</strong> para <strong>{newUsername}</strong>?
                {hasCoupons && (
                  <>
                    <br /><br />
                    <span className="text-destructive font-semibold">
                      Todos os seus cupons serão excluídos e você precisará ativá-los novamente.
                    </span>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSave}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nome de Usuário</DialogTitle>
            <DialogDescription>
              Seu nome de usuário atual é: <strong>{currentUsername}</strong>
            </DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            {footerContent}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de username</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar seu nome de usuário de <strong>{currentUsername}</strong> para <strong>{newUsername}</strong>?
              {hasCoupons && (
                <>
                  <br /><br />
                  <span className="text-destructive font-semibold">
                    Todos os seus cupons serão excluídos e você precisará ativá-los novamente.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
