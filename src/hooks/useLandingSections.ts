import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LandingSection {
  id: string;
  section_key: string;
  section_name: string;
  is_active: boolean;
  order_position: number;
}

export const useLandingSections = () => {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_sections')
        .select('*')
        .order('order_position');
      
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching landing sections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const toggleSection = async (sectionKey: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('landing_sections')
        .update({ is_active: isActive })
        .eq('section_key', sectionKey);
      
      if (error) throw error;

      setSections(prev => prev.map(s => 
        s.section_key === sectionKey ? { ...s, is_active: isActive } : s
      ));

      toast({
        title: isActive ? "Seção ativada" : "Seção desativada",
        description: `A seção foi ${isActive ? "ativada" : "desativada"} com sucesso.`,
      });
    } catch (error) {
      console.error('Error toggling section:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da seção.",
        variant: "destructive",
      });
    }
  };

  const isSectionActive = (sectionKey: string): boolean => {
    const section = sections.find(s => s.section_key === sectionKey);
    return section?.is_active ?? true;
  };

  const getSectionName = (sectionKey: string): string => {
    const section = sections.find(s => s.section_key === sectionKey);
    return section?.section_name ?? sectionKey;
  };

  return {
    sections,
    loading,
    toggleSection,
    isSectionActive,
    getSectionName,
    refetch: fetchSections,
  };
};
