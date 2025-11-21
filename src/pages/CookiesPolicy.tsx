import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const savePreferences = (newPreferences: CookiePreferences) => {
    localStorage.setItem("cookiePreferences", JSON.stringify(newPreferences));
    setPreferences(newPreferences);
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
    setShowPreferences(false);
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
                className="text-primary hover:text-primary/80 p-0 h-auto font-normal"
              >
                Consulte as Preferências de cookies
              </Button>
            </div>
          </div>
        )}
      </main>

      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preferências de Cookies</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="necessary">Cookies Necessários</Label>
                <p className="text-sm text-muted-foreground">Essenciais para o funcionamento</p>
              </div>
              <Switch id="necessary" checked={true} disabled />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="functional">Cookies Funcionais</Label>
                <p className="text-sm text-muted-foreground">Melhoram a experiência</p>
              </div>
              <Switch
                id="functional"
                checked={preferences.functional}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, functional: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analytics">Cookies de Análise</Label>
                <p className="text-sm text-muted-foreground">Ajudam a melhorar o site</p>
              </div>
              <Switch
                id="analytics"
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing">Cookies de Marketing</Label>
                <p className="text-sm text-muted-foreground">Para anúncios relevantes</p>
              </div>
              <Switch
                id="marketing"
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, marketing: checked })
                }
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPreferences(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCustom}>
              Salvar Preferências
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CookiesPolicy;
