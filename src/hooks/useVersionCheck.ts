import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/config/version";

interface VersionCheckResult {
  hasUpdate: boolean;
  newVersion: string | null;
  currentVersion: string;
  isCurrentVersionRegistered: boolean;
  isChecking: boolean;
}

export const useVersionCheck = () => {
  const [versionInfo, setVersionInfo] = useState<VersionCheckResult>({
    hasUpdate: false,
    newVersion: null,
    currentVersion: APP_VERSION,
    isCurrentVersionRegistered: true,
    isChecking: true,
  });

  const checkVersion = async () => {
    setVersionInfo(prev => ({ ...prev, isChecking: true }));
    try {
      // Check if current version exists in database
      const { data: currentVersionData, error: currentVersionError } = await (supabase as any)
        .from("app_versions")
        .select("version")
        .eq("version", APP_VERSION)
        .maybeSingle();

      if (currentVersionError) {
        console.error("Error checking current version:", currentVersionError);
      }

      const isCurrentVersionRegistered = !!currentVersionData;

      // Get latest version
      const { data, error } = await (supabase as any)
        .from("app_versions")
        .select("version")
        .order("released_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching version:", error);
        setVersionInfo(prev => ({ ...prev, isChecking: false }));
        return;
      }

      // Se não há dados no banco, precisa registrar a versão atual
      if (!data) {
        setVersionInfo({
          hasUpdate: true,
          newVersion: null,
          currentVersion: APP_VERSION,
          isCurrentVersionRegistered: false,
          isChecking: false,
        });
        return;
      }

      const latestVersion = data.version;
      const hasUpdate = latestVersion !== APP_VERSION;

      setVersionInfo({
        hasUpdate,
        newVersion: hasUpdate ? latestVersion : null,
        currentVersion: APP_VERSION,
        isCurrentVersionRegistered,
        isChecking: false,
      });
    } catch (error) {
      console.error("Error checking version:", error);
      setVersionInfo(prev => ({ ...prev, isChecking: false }));
    }
  };

  useEffect(() => {
    checkVersion();

    // Check every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { ...versionInfo, checkVersion };
};
