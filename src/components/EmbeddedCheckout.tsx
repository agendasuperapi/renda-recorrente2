import { useCallback, useEffect, useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface EmbeddedCheckoutProps {
  clientSecret: string;
}

let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = async (): Promise<Stripe | null> => {
  if (!stripePromise) {
    stripePromise = (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-stripe-config");
        if (error || !data?.publishableKey) {
          console.error("Erro ao buscar config do Stripe:", error);
          return null;
        }
        return loadStripe(data.publishableKey);
      } catch (err) {
        console.error("Erro ao carregar Stripe:", err);
        return null;
      }
    })();
  }
  return stripePromise;
};

export function EmbeddedCheckoutComponent({ clientSecret }: EmbeddedCheckoutProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStripe().then((stripeInstance) => {
      setStripe(stripeInstance);
      setLoading(false);
    });
  }, []);

  if (loading || !stripe) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider
        stripe={stripe}
        options={{ clientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
