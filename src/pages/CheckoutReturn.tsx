import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Home } from "lucide-react";
import logoVerde from "@/assets/logo-renda-verde.png";
import logoBranco from "@/assets/logo-renda-branco.png";
import { useTheme } from "next-themes";

type CheckoutStatus = "loading" | "success" | "failed";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [status, setStatus] = useState<CheckoutStatus>("loading");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setStatus("failed");
      return;
    }

    // Verificar se usuário está autenticado e aguardar processamento
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Se não está autenticado, aguarda um pouco e verifica novamente
        setTimeout(checkSession, 1000);
        return;
      }

      // Usuário autenticado, checkout foi bem-sucedido
      // Atualizar status do pending_checkout se existir
      await supabase
        .from("pending_checkouts")
        .update({ status: "completed" })
        .eq("stripe_session_id", sessionId);

      setStatus("success");

      // Redirecionar para dashboard após 3 segundos
      setTimeout(() => {
        navigate("/user/dashboard?success=true", { replace: true });
      }, 3000);
    };

    checkSession();
  }, [sessionId, navigate]);

  const isDark = theme === "dark";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <img
        src={isDark ? logoBranco : logoVerde}
        alt="Logo"
        className="h-12 mb-8"
      />

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              </div>
              <CardTitle>Processando...</CardTitle>
              <CardDescription>
                Aguarde enquanto confirmamos seu pagamento
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4">
                <CheckCircle2 className="h-16 w-16 text-primary" />
              </div>
              <CardTitle className="text-primary">Pagamento Confirmado!</CardTitle>
              <CardDescription>
                Sua assinatura foi ativada com sucesso
              </CardDescription>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="mx-auto mb-4">
                <XCircle className="h-16 w-16 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Erro no Pagamento</CardTitle>
              <CardDescription>
                Não foi possível processar seu pagamento
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="text-center">
          {status === "success" && (
            <p className="text-muted-foreground mb-4">
              Você será redirecionado automaticamente para o dashboard...
            </p>
          )}

          {status === "failed" && (
            <p className="text-muted-foreground mb-4">
              Por favor, tente novamente ou entre em contato com o suporte.
            </p>
          )}

          <Button
            onClick={() => navigate("/user/dashboard")}
            className="w-full"
            disabled={status === "loading"}
          >
            <Home className="h-4 w-4 mr-2" />
            Ir para o Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
