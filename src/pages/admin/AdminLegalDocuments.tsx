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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data: terms } = await supabase
      .from("legal_documents")
      .select("content")
      .eq("type", "terms")
      .single();

    const { data: privacy } = await supabase
      .from("legal_documents")
      .select("content")
      .eq("type", "privacy")
      .single();

    if (terms) setTermsContent(terms.content);
    if (privacy) setPrivacyContent(privacy.content);
    setLoading(false);
  };

  const handleSaveTerms = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("legal_documents")
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
      .from("legal_documents")
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

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Termos e Privacidade</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Termos e Privacidade</h1>
      
      <Tabs defaultValue="terms" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="terms">Termos de Uso</TabsTrigger>
          <TabsTrigger value="privacy">Aviso de Privacidade</TabsTrigger>
        </TabsList>

        <TabsContent value="terms">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="terms">Conteúdo dos Termos de Uso</Label>
                <Textarea
                  id="terms"
                  value={termsContent}
                  onChange={(e) => setTermsContent(e.target.value)}
                  className="mt-2 min-h-[500px] font-mono text-sm"
                  placeholder="Digite o conteúdo dos Termos de Uso..."
                />
              </div>
              <Button onClick={handleSaveTerms} disabled={saving}>
                {saving ? "Salvando..." : "Salvar Termos de Uso"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="privacy">Conteúdo do Aviso de Privacidade</Label>
                <Textarea
                  id="privacy"
                  value={privacyContent}
                  onChange={(e) => setPrivacyContent(e.target.value)}
                  className="mt-2 min-h-[500px] font-mono text-sm"
                  placeholder="Digite o conteúdo do Aviso de Privacidade..."
                />
              </div>
              <Button onClick={handleSavePrivacy} disabled={saving}>
                {saving ? "Salvando..." : "Salvar Aviso de Privacidade"}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLegalDocuments;
