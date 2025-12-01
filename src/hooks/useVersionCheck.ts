import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/config/version";

interface VersionCheckResult {
  hasUpdate: boolean;
  newVersion: string | null;
  currentVersion: string;
}

export const useVersionCheck = () => {
  const [versionInfo, setVersionInfo] = useState<VersionCheckResult>({
    hasUpdate: false,
    newVersion: null,
    currentVersion: APP_VERSION,
  });

  const checkVersion = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("app_versions")
        .select("version")
        .order("released_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching version:", error);
        return;
      }

      // Se não há dados no banco, precisa registrar a versão atual
      if (!data) {
        setVersionInfo({
          hasUpdate: true,
          newVersion: null,
          currentVersion: APP_VERSION,
        });
        return;
      }

      const latestVersion = data.version;
      const hasUpdate = latestVersion !== APP_VERSION;

      setVersionInfo({
        hasUpdate,
        newVersion: hasUpdate ? latestVersion : null,
        currentVersion: APP_VERSION,
      });
    } catch (error) {
      console.error("Error checking version:", error);
    }
  };

  useEffect(() => {
    checkVersion();

    // Check every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return versionInfo;
};
