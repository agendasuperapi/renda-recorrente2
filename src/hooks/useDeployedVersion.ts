import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/config/version";

/**
 * Hook que retorna a versão do app que já foi deployada com sucesso.
 * Enquanto uma versão está sendo deployada, mostra a última versão com status 'success'.
 * Isso evita mostrar versões pendentes para os usuários.
 */
export const useDeployedVersion = () => {
  const { data: deployedVersion, isLoading } = useQuery({
    queryKey: ["deployed-version"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_versions")
        .select("version, deploy_status")
        .eq("deploy_status", "success")
        .order("released_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar versão deployada:", error);
        return null;
      }

      return data?.version || null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
  });

  // Se não conseguir buscar a versão do banco, usa a versão do código como fallback
  // mas só se não estiver carregando (evita piscar)
  const version = isLoading ? null : (deployedVersion || APP_VERSION);

  return {
    version,
    isLoading,
    // Retorna a versão formatada com "v" na frente
    formattedVersion: version ? `v${version}` : null,
  };
};
