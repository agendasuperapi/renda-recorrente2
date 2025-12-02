import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Settings2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BackgroundConfig {
  colorStart: string;
  colorEnd: string;
  intensityStart: number;
  intensityEnd: number;
  gradientPosition: number;
  applyMobile: boolean;
  applyTablet: boolean;
  applyDesktop: boolean;
}

const defaultConfig: BackgroundConfig = {
  colorStart: "#00bf63",
  colorEnd: "#00bf63",
  intensityStart: 5,
  intensityEnd: 15,
  gradientPosition: 0,
  applyMobile: true,
  applyTablet: true,
  applyDesktop: true,
};

interface BackgroundConfigEditorProps {
  onConfigSaved?: () => void;
}

export function BackgroundConfigEditor({ onConfigSaved }: BackgroundConfigEditorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BackgroundConfig>(defaultConfig);

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'bg_color_start',
          'bg_color_end',
          'bg_intensity_start',
          'bg_intensity_end',
          'bg_gradient_position',
          'bg_apply_mobile',
          'bg_apply_tablet',
          'bg_apply_desktop'
        ]);

      if (error) throw error;

      if (data && data.length > 0) {
        const settings: Record<string, string> = {};
        data.forEach(item => {
          settings[item.key] = item.value;
        });

        setConfig({
          colorStart: settings.bg_color_start || defaultConfig.colorStart,
          colorEnd: settings.bg_color_end || defaultConfig.colorEnd,
          intensityStart: parseInt(settings.bg_intensity_start || String(defaultConfig.intensityStart)),
          intensityEnd: parseInt(settings.bg_intensity_end || String(defaultConfig.intensityEnd)),
          gradientPosition: parseInt(settings.bg_gradient_position || String(defaultConfig.gradientPosition)),
          applyMobile: settings.bg_apply_mobile !== 'false',
          applyTablet: settings.bg_apply_tablet !== 'false',
          applyDesktop: settings.bg_apply_desktop !== 'false',
        });
      }
    } catch (error) {
      console.error('Error loading background config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const settings = [
        { key: 'bg_color_start', value: config.colorStart, description: 'Cor inicial do gradiente de fundo' },
        { key: 'bg_color_end', value: config.colorEnd, description: 'Cor final do gradiente de fundo' },
        { key: 'bg_intensity_start', value: String(config.intensityStart), description: 'Intensidade inicial do gradiente' },
        { key: 'bg_intensity_end', value: String(config.intensityEnd), description: 'Intensidade final do gradiente' },
        { key: 'bg_gradient_position', value: String(config.gradientPosition), description: 'Posição de início do gradiente' },
        { key: 'bg_apply_mobile', value: String(config.applyMobile), description: 'Aplicar em dispositivos móveis' },
        { key: 'bg_apply_tablet', value: String(config.applyTablet), description: 'Aplicar em tablets' },
        { key: 'bg_apply_desktop', value: String(config.applyDesktop), description: 'Aplicar em computadores' },
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(setting, { onConflict: 'key' });

        if (error) throw error;
      }

      // Dispatch event to notify components of the change
      window.dispatchEvent(new CustomEvent('background-config-change'));

      toast({
        title: "Configurações salvas",
        description: "O fundo das páginas foi personalizado com sucesso",
      });

      onConfigSaved?.();
      setOpen(false);
    } catch (error) {
      console.error('Error saving background config:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Generate preview gradient
  const getPreviewGradient = () => {
    const startAlpha = config.intensityStart / 100;
    const endAlpha = config.intensityEnd / 100;
    return `linear-gradient(to bottom, ${hexToRgba(config.colorStart, startAlpha)} ${config.gradientPosition}%, ${hexToRgba(config.colorEnd, endAlpha)} 100%)`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Configurar Fundo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar Fundo das Páginas</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div 
                className="h-32 rounded-lg border flex items-center justify-center text-muted-foreground"
                style={{ background: getPreviewGradient() }}
              >
                <span className="bg-card/80 backdrop-blur-sm px-3 py-1 rounded text-sm">
                  Preview do Gradiente
                </span>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="colorStart">Cor Inicial</Label>
                <div className="flex gap-2">
                  <Input
                    id="colorStart"
                    type="color"
                    value={config.colorStart}
                    onChange={(e) => setConfig({ ...config, colorStart: e.target.value })}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={config.colorStart}
                    onChange={(e) => setConfig({ ...config, colorStart: e.target.value })}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="colorEnd">Cor Final</Label>
                <div className="flex gap-2">
                  <Input
                    id="colorEnd"
                    type="color"
                    value={config.colorEnd}
                    onChange={(e) => setConfig({ ...config, colorEnd: e.target.value })}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={config.colorEnd}
                    onChange={(e) => setConfig({ ...config, colorEnd: e.target.value })}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Intensities */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Intensidade Inicial</Label>
                  <span className="text-sm text-muted-foreground">{config.intensityStart}%</span>
                </div>
                <Slider
                  value={[config.intensityStart]}
                  onValueChange={([value]) => setConfig({ ...config, intensityStart: value })}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Intensidade Final</Label>
                  <span className="text-sm text-muted-foreground">{config.intensityEnd}%</span>
                </div>
                <Slider
                  value={[config.intensityEnd]}
                  onValueChange={([value]) => setConfig({ ...config, intensityEnd: value })}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            {/* Gradient Position */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Início do Gradiente</Label>
                <span className="text-sm text-muted-foreground">{config.gradientPosition}%</span>
              </div>
              <Slider
                value={[config.gradientPosition]}
                onValueChange={([value]) => setConfig({ ...config, gradientPosition: value })}
                min={0}
                max={100}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Define a partir de qual ponto (do topo) o gradiente começa a aparecer
              </p>
            </div>

            {/* Device Selection */}
            <div className="space-y-3">
              <Label>Aplicar em</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={config.applyMobile}
                    onCheckedChange={(checked) => setConfig({ ...config, applyMobile: !!checked })}
                  />
                  <span className="text-sm">📱 Celular</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={config.applyTablet}
                    onCheckedChange={(checked) => setConfig({ ...config, applyTablet: !!checked })}
                  />
                  <span className="text-sm">📱 Tablet</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={config.applyDesktop}
                    onCheckedChange={(checked) => setConfig({ ...config, applyDesktop: !!checked })}
                  />
                  <span className="text-sm">💻 Computador</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Celular: &lt; 768px | Tablet: 768px - 1024px | Computador: &gt; 1024px
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
