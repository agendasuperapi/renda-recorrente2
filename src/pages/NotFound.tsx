import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isReservedRoute } from "@/config/reservedRoutes";
import { Loader2 } from "lucide-react";

const PRODUCT_ID = "bb582482-b006-47b8-b6ea-a6944d8cfdfd";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkCoupon = async () => {
      // Extrair código do path (remover "/" inicial)
      const potentialCoupon = location.pathname.slice(1);

      // Ignorar paths vazios ou com "/" múltiplos (sub-rotas)
      if (!potentialCoupon || potentialCoupon.includes('/')) {
        setIsChecking(false);
        return;
      }

      // Não verificar rotas reservadas
      if (isReservedRoute(potentialCoupon)) {
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await (supabase as any).rpc('validate_coupon', {
          p_coupon_code: potentialCoupon.toUpperCase(),
          p_product_id: PRODUCT_ID
        });

        if (!error && data && Array.isArray(data) && data.length > 0) {
          // Cupom válido - salvar e redirecionar para a landing
          const couponResult = data[0];
          localStorage.setItem('lastUsedCoupon', JSON.stringify({
            code: potentialCoupon.toUpperCase(),
            custom_code: couponResult.custom_code || null,
            data: couponResult
          }));
          
          // Marcar que veio de um cupom na URL para forçar aplicação imediata
          sessionStorage.setItem('couponFromUrl', 'true');

          navigate('/', { replace: true });
          return;
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error checking coupon:', error);
        }
      }

      // Cupom não existe - redirecionar para landing page
      navigate('/', { replace: true });
    };

    checkCoupon();
  }, [location.pathname, navigate]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Página não encontrada</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Voltar para a página inicial
        </a>
      </div>
    </div>
  );
};

export default NotFound;
