import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, X, Edit } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GradientConfig {
  block_name: string;
  color_start: string;
  color_end: string;
  intensity_start: number;
  intensity_end: number;
  gradient_start_position: number;
  text_color?: string;
  heading_color?: string;
  text_color_light?: string;
  text_color_dark?: string;
  heading_color_light?: string;
  heading_color_dark?: string;
}

interface AuthGradientEditorProps {
  blockName: string;
  initialConfig?: GradientConfig;
}

export const AuthGradientEditor = ({ blockName, initialConfig }: AuthGradientEditorProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  const defaultConfig: GradientConfig = initialConfig || {
    block_name: blockName,
    color_start: '#00bf63',
    color_end: '#00bf63',
    intensity_start: 10,
    intensity_end: 30,
    gradient_start_position: 0,
    text_color: '#000000',
    heading_color: '#000000',
    text_color_light: '#000000',
    text_color_dark: '#ffffff',
    heading_color_light: '#000000',
    heading_color_dark: '#ffffff',
  };

  const [colorStart, setColorStart] = useState(defaultConfig.color_start);
  const [colorEnd, setColorEnd] = useState(defaultConfig.color_end);
  const [intensityStart, setIntensityStart] = useState(defaultConfig.intensity_start);
  const [intensityEnd, setIntensityEnd] = useState(defaultConfig.intensity_end);
  const [gradientStartPos, setGradientStartPos] = useState(defaultConfig.gradient_start_position);
  const [textColor, setTextColor] = useState(defaultConfig.text_color || '#ffffff');
  const [headingColor, setHeadingColor] = useState(defaultConfig.heading_color || '#ffffff');
  const [textColorLight, setTextColorLight] = useState(defaultConfig.text_color_light || '#000000');
  const [textColorDark, setTextColorDark] = useState(defaultConfig.text_color_dark || '#ffffff');
  const [headingColorLight, setHeadingColorLight] = useState(defaultConfig.heading_color_light || '#000000');
  const [headingColorDark, setHeadingColorDark] = useState(defaultConfig.heading_color_dark || '#ffffff');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newConfig: GradientConfig = {
        block_name: blockName,
        color_start: colorStart,
        color_end: colorEnd,
        intensity_start: intensityStart,
        intensity_end: intensityEnd,
        gradient_start_position: gradientStartPos,
        text_color: textColor,
        heading_color: headingColor,
        text_color_light: textColorLight,
        text_color_dark: textColorDark,
        heading_color_light: headingColorLight,
        heading_color_dark: headingColorDark,
      };

      const { error } = await supabase
        .from('landing_block_gradients' as any)
        .upsert(newConfig, { onConflict: 'block_name' });

      if (error) throw error;

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['authGradientConfigs'] });

      toast.success('Gradiente salvo com sucesso!');
      setOpen(false);
    } catch (error: any) {
      console.error('Error saving gradient:', error);
      toast.error('Erro ao salvar gradiente: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Gradiente - {blockName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Preview */}
          <div className="space-y-2">
            <Label>Pré-visualização</Label>
            <div 
              className="h-32 rounded-lg border"
              style={{
                background: `linear-gradient(to bottom, ${colorStart}${Math.round((intensityStart / 100) * 255).toString(16).padStart(2, '0')} ${gradientStartPos}%, ${colorEnd}${Math.round((intensityEnd / 100) * 255).toString(16).padStart(2, '0')} 100%)`
              }}
            />
          </div>

          {/* Color Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="colorStart">Cor Inicial</Label>
              <div className="flex gap-2">
                <Input
                  id="colorStart"
                  type="color"
                  value={colorStart}
                  onChange={(e) => setColorStart(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colorStart}
                  onChange={(e) => setColorStart(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorEnd">Cor Final</Label>
              <div className="flex gap-2">
                <Input
                  id="colorEnd"
                  type="color"
                  value={colorEnd}
                  onChange={(e) => setColorEnd(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colorEnd}
                  onChange={(e) => setColorEnd(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Intensity Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Intensidade Inicial ({intensityStart}%)</Label>
              <Slider
                value={[intensityStart]}
                onValueChange={(value) => setIntensityStart(value[0])}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Intensidade Final ({intensityEnd}%)</Label>
              <Slider
                value={[intensityEnd]}
                onValueChange={(value) => setIntensityEnd(value[0])}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </div>

          {/* Gradient Position */}
          <div className="space-y-2">
            <Label>Posição de Início do Gradiente ({gradientStartPos}%)</Label>
            <Slider
              value={[gradientStartPos]}
              onValueChange={(value) => setGradientStartPos(value[0])}
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Text Colors */}
          <div className="space-y-4">
            <h3 className="font-semibold">Cores de Texto</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="textColorLight">Texto (Claro)</Label>
                <div className="flex gap-2">
                  <Input
                    id="textColorLight"
                    type="color"
                    value={textColorLight}
                    onChange={(e) => setTextColorLight(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={textColorLight}
                    onChange={(e) => setTextColorLight(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="textColorDark">Texto (Escuro)</Label>
                <div className="flex gap-2">
                  <Input
                    id="textColorDark"
                    type="color"
                    value={textColorDark}
                    onChange={(e) => setTextColorDark(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={textColorDark}
                    onChange={(e) => setTextColorDark(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="headingColorLight">Título (Claro)</Label>
                <div className="flex gap-2">
                  <Input
                    id="headingColorLight"
                    type="color"
                    value={headingColorLight}
                    onChange={(e) => setHeadingColorLight(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={headingColorLight}
                    onChange={(e) => setHeadingColorLight(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headingColorDark">Título (Escuro)</Label>
                <div className="flex gap-2">
                  <Input
                    id="headingColorDark"
                    type="color"
                    value={headingColorDark}
                    onChange={(e) => setHeadingColorDark(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={headingColorDark}
                    onChange={(e) => setHeadingColorDark(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
