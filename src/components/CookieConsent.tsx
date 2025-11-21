import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Cookie } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const CookieConsent = () => {
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, can't be disabled
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("cookieConsent", JSON.stringify(prefs));
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    savePreferences(allAccepted);
  };

  const rejectOptional = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    savePreferences(onlyNecessary);
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
        <div className="container max-w-7xl mx-auto p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-base mb-1">Este site usa cookies</h3>
                <p className="text-sm text-muted-foreground">
                  Usamos cookies para melhorar sua experiência, personalizar conteúdo e analisar nosso tráfego. 
                  Ao clicar em "Aceitar todos", você concorda com nosso uso de cookies.{" "}
                  <button
                    onClick={() => navigate("/cookies")}
                    className="text-primary hover:underline inline"
                  >
                    Saiba mais
                  </button>
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowSettings(true)}
                className="w-full sm:w-auto"
              >
                Configurar
              </Button>
              <Button
                variant="outline"
                onClick={rejectOptional}
                className="w-full sm:w-auto"
              >
                Rejeitar opcionais
              </Button>
              <Button
                onClick={acceptAll}
                className="w-full sm:w-auto"
              >
                Aceitar todos
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurações de Cookies</DialogTitle>
            <DialogDescription>
              Gerencie suas preferências de cookies. Os cookies necessários são sempre habilitados 
              pois são essenciais para o funcionamento do site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Necessary Cookies */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="necessary" className="font-semibold text-base">
                    Cookies Necessários
                  </Label>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Sempre ativos
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Estes cookies são essenciais para o funcionamento do site e não podem ser desativados. 
                  Eles permitem navegação básica e acesso a áreas seguras.
                </p>
              </div>
              <Switch
                id="necessary"
                checked={true}
                disabled
                className="mt-1"
              />
            </div>

            {/* Functional Cookies */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b">
              <div className="flex-1">
                <Label htmlFor="functional" className="font-semibold text-base">
                  Cookies Funcionais
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Permitem que o site lembre suas escolhas e forneça recursos aprimorados, 
                  como preferências de idioma e personalização de interface.
                </p>
              </div>
              <Switch
                id="functional"
                checked={preferences.functional}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, functional: checked })
                }
                className="mt-1"
              />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b">
              <div className="flex-1">
                <Label htmlFor="analytics" className="font-semibold text-base">
                  Cookies de Análise
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Nos ajudam a entender como os visitantes interagem com o site, 
                  coletando informações anônimas sobre páginas visitadas e erros encontrados.
                </p>
              </div>
              <Switch
                id="analytics"
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
                className="mt-1"
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="marketing" className="font-semibold text-base">
                  Cookies de Marketing
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Usados para rastrear visitantes em sites e exibir anúncios relevantes. 
                  Também limitam o número de vezes que você vê um anúncio.
                </p>
              </div>
              <Switch
                id="marketing"
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, marketing: checked })
                }
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={rejectOptional} className="w-full sm:w-auto">
              Rejeitar opcionais
            </Button>
            <Button onClick={saveCustom} className="w-full sm:w-auto">
              Salvar preferências
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
