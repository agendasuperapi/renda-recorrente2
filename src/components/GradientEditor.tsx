import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface GradientConfig {
  block_name: string;
  color_start: string;
  color_end: string;
  intensity_start: number;
  intensity_end: number;
  gradient_start_position: number;
}

interface GradientEditorProps {
  blockName: string;
  config: GradientConfig;
  onSave: (config: GradientConfig) => void;
}

export const GradientEditor = ({ blockName, config, onSave }: GradientEditorProps) => {
  const [colorStart, setColorStart] = useState(config.color_start);
  const [colorEnd, setColorEnd] = useState(config.color_end);
  const [intensityStart, setIntensityStart] = useState(config.intensity_start);
  const [intensityEnd, setIntensityEnd] = useState(config.intensity_end);
  const [gradientStartPos, setGradientStartPos] = useState(config.gradient_start_position);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('landing_block_gradients' as any)
        .upsert({
          block_name: blockName,
          color_start: colorStart,
          color_end: colorEnd,
          intensity_start: intensityStart,
          intensity_end: intensityEnd,
          gradient_start_position: gradientStartPos,
        });

      if (error) throw error;

      toast.success('Gradiente salvo com sucesso!');
      onSave({
        block_name: blockName,
        color_start: colorStart,
        color_end: colorEnd,
        intensity_start: intensityStart,
        intensity_end: intensityEnd,
        gradient_start_position: gradientStartPos,
      });
    } catch (error) {
      console.error('Error saving gradient:', error);
      toast.error('Erro ao salvar gradiente');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="fixed right-4 top-20 w-80 z-50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-sm">Editor de Gradiente: {blockName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="color-start" className="text-xs">Cor Inicial</Label>
          <div className="flex gap-2">
            <Input
              id="color-start"
              type="color"
              value={colorStart}
              onChange={(e) => setColorStart(e.target.value)}
              className="w-16 h-8"
            />
            <Input
              type="text"
              value={colorStart}
              onChange={(e) => setColorStart(e.target.value)}
              className="flex-1 text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color-end" className="text-xs">Cor Final</Label>
          <div className="flex gap-2">
            <Input
              id="color-end"
              type="color"
              value={colorEnd}
              onChange={(e) => setColorEnd(e.target.value)}
              className="w-16 h-8"
            />
            <Input
              type="text"
              value={colorEnd}
              onChange={(e) => setColorEnd(e.target.value)}
              className="flex-1 text-xs"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Intensidade Inicial: {intensityStart}%</Label>
          <Slider
            value={[intensityStart]}
            onValueChange={(value) => setIntensityStart(value[0])}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Intensidade Final: {intensityEnd}%</Label>
          <Slider
            value={[intensityEnd]}
            onValueChange={(value) => setIntensityEnd(value[0])}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Posição Início: {gradientStartPos}%</Label>
          <Slider
            value={[gradientStartPos]}
            onValueChange={(value) => setGradientStartPos(value[0])}
            min={0}
            max={100}
            step={10}
            className="w-full"
          />
        </div>

        <div 
          className="h-12 rounded"
          style={{
            background: `linear-gradient(to bottom, ${colorStart}${Math.round(intensityStart * 2.55).toString(16).padStart(2, '0')} ${gradientStartPos}%, ${colorEnd}${Math.round(intensityEnd * 2.55).toString(16).padStart(2, '0')} 100%)`
          }}
        />

        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="w-full"
          size="sm"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Gradiente
        </Button>
      </CardContent>
    </Card>
  );
};
