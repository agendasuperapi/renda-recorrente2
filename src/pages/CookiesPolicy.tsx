import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

const CookiesPolicy = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(() => {
    const saved = localStorage.getItem("cookiePreferences");
    return saved
      ? JSON.parse(saved)
      : { necessary: true, functional: false, analytics: false, marketing: false };
  });

  useEffect(() => {
    fetchCookiesPolicy();
  }, []);

  const fetchCookiesPolicy = async () => {
    const { data } = await supabase
      .from("legal_documents" as any)
      .select("content")
      .eq("type", "cookies")
      .maybeSingle() as any;

    if (data) {
      setContent(data.content);
    }
    setLoading(false);
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("cookieConsent", JSON.stringify(prefs));
    setShowPreferences(false);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Política de Cookies</h1>
        
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {content}
            </div>
            <div className="mt-8 pt-6 border-t border-border">
              <Button
                variant="link"
                onClick={() => setShowPreferences(true)}
                className="text-foreground hover:text-foreground/80 p-0 h-auto font-normal"
              >
                Consulte as Preferências de cookies
              </Button>
            </div>
          </div>
        )}
      </main>

      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
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
    </div>
  );
};

export default CookiesPolicy;
