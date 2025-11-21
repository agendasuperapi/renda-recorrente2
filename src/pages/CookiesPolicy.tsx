import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";

const CookiesPolicy = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

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
          </div>
        )}
      </main>
    </div>
  );
};

export default CookiesPolicy;
