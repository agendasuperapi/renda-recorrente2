import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminLegalDocuments = () => {
  const { toast } = useToast();
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");
  const [cookiesContent, setCookiesContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data: terms } = await supabase
      .from("legal_documents" as any)
      .select("content")
      .eq("type", "terms")
      .maybeSingle() as any;

    const { data: privacy } = await supabase
      .from("legal_documents" as any)
      .select("content")
      .eq("type", "privacy")
      .maybeSingle() as any;

    const { data: cookies } = await supabase
      .from("legal_documents" as any)
      .select("content")
      .eq("type", "cookies")
      .maybeSingle() as any;

    if (terms) setTermsContent(terms.content);
    if (privacy) setPrivacyContent(privacy.content);
    if (cookies) setCookiesContent(cookies.content);
    setLoading(false);
  };

  const handleSaveTerms = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("legal_documents" as any)
      .update({ content: termsContent, updated_at: new Date().toISOString() })
      .eq("type", "terms");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    } else {
      toast({
        title: "Termos atualizados",
        description: "Os Termos de Uso foram salvos com sucesso!",
      });
    }
    setSaving(false);
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("legal_documents" as any)
      .update({ content: privacyContent, updated_at: new Date().toISOString() })
      .eq("type", "privacy");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    } else {
      toast({
        title: "Privacidade atualizada",
        description: "O Aviso de Privacidade foi salvo com sucesso!",
      });
    }
    setSaving(false);
  };

  const handleSaveCookies = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("legal_documents" as any)
      .update({ content: cookiesContent, updated_at: new Date().toISOString() })
      .eq("type", "cookies");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    } else {
      toast({
        title: "Cookies atualizada",
        description: "A Política de Cookies foi salva com sucesso!",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-3 p-2 md:p-0">
        <h1 className="text-2xl md:text-3xl font-bold">Termos e Privacidade</h1>
        <p className="text-sm md:text-base text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6 p-2 md:p-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Termos e Privacidade</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie os documentos legais da plataforma
        </p>
      </div>
      
      <Tabs defaultValue="terms" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="terms" className="text-xs md:text-sm px-2 md:px-4 py-2">
            Termos
          </TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs md:text-sm px-2 md:px-4 py-2">
            Privacidade
          </TabsTrigger>
          <TabsTrigger value="cookies" className="text-xs md:text-sm px-2 md:px-4 py-2">
            Cookies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="terms" className="mt-3 md:mt-6">
          <Card className="p-3 md:p-6">
            <div className="space-y-3 md:space-y-4">
              <div>
                <Label htmlFor="terms" className="text-sm md:text-base">
                  Conteúdo dos Termos de Uso
                </Label>
                <Textarea
                  id="terms"
                  value={termsContent}
                  onChange={(e) => setTermsContent(e.target.value)}
                  className="mt-2 h-[calc(100vh-320px)] md:h-[calc(100vh-280px)] font-mono text-xs md:text-sm resize-none"
                  placeholder="Digite o conteúdo dos Termos de Uso..."
                />
              </div>
              <Button 
                onClick={handleSaveTerms} 
                disabled={saving}
                className="w-full md:w-auto"
              >
                {saving ? "Salvando..." : "Salvar Termos de Uso"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="mt-3 md:mt-6">
          <Card className="p-3 md:p-6">
            <div className="space-y-3 md:space-y-4">
              <div>
                <Label htmlFor="privacy" className="text-sm md:text-base">
                  Conteúdo do Aviso de Privacidade
                </Label>
                <Textarea
                  id="privacy"
                  value={privacyContent}
                  onChange={(e) => setPrivacyContent(e.target.value)}
                  className="mt-2 h-[calc(100vh-320px)] md:h-[calc(100vh-280px)] font-mono text-xs md:text-sm resize-none"
                  placeholder="Digite o conteúdo do Aviso de Privacidade..."
                />
              </div>
              <Button 
                onClick={handleSavePrivacy} 
                disabled={saving}
                className="w-full md:w-auto"
              >
                {saving ? "Salvando..." : "Salvar Aviso de Privacidade"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="cookies" className="mt-3 md:mt-6">
          <Card className="p-3 md:p-6">
            <div className="space-y-3 md:space-y-4">
              <div>
                <Label htmlFor="cookies" className="text-sm md:text-base">
                  Conteúdo da Política de Cookies
                </Label>
                <Textarea
                  id="cookies"
                  value={cookiesContent}
                  onChange={(e) => setCookiesContent(e.target.value)}
                  className="mt-2 h-[calc(100vh-320px)] md:h-[calc(100vh-280px)] font-mono text-xs md:text-sm resize-none"
                  placeholder="Digite o conteúdo da Política de Cookies..."
                />
              </div>
              <Button 
                onClick={handleSaveCookies} 
                disabled={saving}
                className="w-full md:w-auto"
              >
                {saving ? "Salvando..." : "Salvar Política de Cookies"}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLegalDocuments;
