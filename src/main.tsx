import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
