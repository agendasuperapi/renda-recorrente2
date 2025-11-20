import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrivacy = async () => {
      const { data } = await supabase
        .from("legal_documents")
        .select("content")
        .eq("type", "privacy")
        .single();
      
      if (data) {
        setContent(data.content);
      }
      setLoading(false);
    };

    fetchPrivacy();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-6 text-foreground">Aviso de Privacidade</h1>
          
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <div 
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
