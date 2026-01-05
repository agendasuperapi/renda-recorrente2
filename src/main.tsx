import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import App from "./App.tsx";
import "./index.css";

// Configuração otimizada do QueryClient com cache inteligente
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - dados ficam "fresh" por 5min
      gcTime: 10 * 60 * 1000, // 10 minutos - garbage collection time (substituiu cacheTime)
      refetchOnWindowFocus: false, // Não re-fetch ao focar na janela
      retry: 1, // Tenta apenas 1 vez em caso de erro
    },
  },
});

// PWA: força verificação de atualização do service worker e permite atualizar com 1 clique
let updateSW: (reloadPage?: boolean) => Promise<void> = async () => {};
updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    toast({
      title: "Atualização disponível",
      description: "Clique em Atualizar para carregar a versão mais recente.",
      action: (
        <ToastAction altText="Atualizar" onClick={() => void updateSW(true)}>
          Atualizar
        </ToastAction>
      ),
    });
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
