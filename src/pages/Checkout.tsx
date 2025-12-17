import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { EmbeddedCheckoutComponent } from "@/components/EmbeddedCheckout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logoVerde from "@/assets/logo-renda-verde.png";
import logoBranco from "@/assets/logo-renda-branco.png";
import { useTheme } from "next-themes";

interface CheckoutState {
  clientSecret: string;
  sessionId: string;
  planId: string;
  planName?: string;
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const state = location.state as CheckoutState | null;

  useEffect(() => {
    // Se não houver client_secret, redireciona de volta
    if (!state?.clientSecret) {
      navigate("/user/plan", { replace: true });
    }
  }, [state, navigate]);

  if (!state?.clientSecret) {
    return null;
  }

  const isDark = theme === "dark";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img
              src={isDark ? logoBranco : logoVerde}
              alt="Logo"
              className="h-8"
            />
          </div>
          {state.planName && (
            <span className="text-sm text-muted-foreground">
              Plano: <strong className="text-foreground">{state.planName}</strong>
            </span>
          )}
        </div>
      </header>

      {/* Checkout Container */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Finalizar Assinatura
            </h1>
            <p className="text-muted-foreground">
              Complete o pagamento de forma segura
            </p>
          </div>

          {/* Embedded Checkout */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <EmbeddedCheckoutComponent clientSecret={state.clientSecret} />
          </div>
        </div>
      </main>
    </div>
  );
}
