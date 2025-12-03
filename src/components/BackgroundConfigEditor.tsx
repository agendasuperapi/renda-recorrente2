import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Loader2, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
interface BackgroundConfig {
  colorStartLight: string;
  colorEndLight: string;
  colorStartDark: string;
  colorEndDark: string;
  intensityStartLight: number;
  intensityEndLight: number;
  intensityStartDark: number;
  intensityEndDark: number;
  gradientStartLight: number;
  gradientEndLight: number;
  gradientStartDark: number;
  gradientEndDark: number;
  applyMobile: boolean;
  applyTablet: boolean;
  applyDesktop: boolean;
}

const defaultConfig: BackgroundConfig = {
  colorStartLight: "#00bf63",
  colorEndLight: "#00bf63",
  colorStartDark: "#00bf63",
  colorEndDark: "#00bf63",
  intensityStartLight: 5,
  intensityEndLight: 15,
  intensityStartDark: 5,
  intensityEndDark: 15,
  gradientStartLight: 0,
  gradientEndLight: 50,
  gradientStartDark: 0,
  gradientEndDark: 50,
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
          'bg_color_start_light',
          'bg_color_end_light',
          'bg_color_start_dark',
          'bg_color_end_dark',
          'bg_intensity_start_light',
          'bg_intensity_end_light',
          'bg_intensity_start_dark',
          'bg_intensity_end_dark',
          'bg_gradient_start_light',
          'bg_gradient_end_light',
          'bg_gradient_start_dark',
          'bg_gradient_end_dark',
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
          colorStartLight: settings.bg_color_start_light || defaultConfig.colorStartLight,
          colorEndLight: settings.bg_color_end_light || defaultConfig.colorEndLight,
          colorStartDark: settings.bg_color_start_dark || defaultConfig.colorStartDark,
          colorEndDark: settings.bg_color_end_dark || defaultConfig.colorEndDark,
          intensityStartLight: parseInt(settings.bg_intensity_start_light || String(defaultConfig.intensityStartLight)),
          intensityEndLight: parseInt(settings.bg_intensity_end_light || String(defaultConfig.intensityEndLight)),
          intensityStartDark: parseInt(settings.bg_intensity_start_dark || String(defaultConfig.intensityStartDark)),
          intensityEndDark: parseInt(settings.bg_intensity_end_dark || String(defaultConfig.intensityEndDark)),
          gradientStartLight: parseInt(settings.bg_gradient_start_light || String(defaultConfig.gradientStartLight)),
          gradientEndLight: parseInt(settings.bg_gradient_end_light || String(defaultConfig.gradientEndLight)),
          gradientStartDark: parseInt(settings.bg_gradient_start_dark || String(defaultConfig.gradientStartDark)),
          gradientEndDark: parseInt(settings.bg_gradient_end_dark || String(defaultConfig.gradientEndDark)),
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
        { key: 'bg_color_start_light', value: config.colorStartLight, description: 'Cor inicial do gradiente (modo claro)' },
        { key: 'bg_color_end_light', value: config.colorEndLight, description: 'Cor final do gradiente (modo claro)' },
        { key: 'bg_color_start_dark', value: config.colorStartDark, description: 'Cor inicial do gradiente (modo escuro)' },
        { key: 'bg_color_end_dark', value: config.colorEndDark, description: 'Cor final do gradiente (modo escuro)' },
        { key: 'bg_intensity_start_light', value: String(config.intensityStartLight), description: 'Intensidade inicial do gradiente (modo claro)' },
        { key: 'bg_intensity_end_light', value: String(config.intensityEndLight), description: 'Intensidade final do gradiente (modo claro)' },
        { key: 'bg_intensity_start_dark', value: String(config.intensityStartDark), description: 'Intensidade inicial do gradiente (modo escuro)' },
        { key: 'bg_intensity_end_dark', value: String(config.intensityEndDark), description: 'Intensidade final do gradiente (modo escuro)' },
        { key: 'bg_gradient_start_light', value: String(config.gradientStartLight), description: 'Posição de início do gradiente (modo claro)' },
        { key: 'bg_gradient_end_light', value: String(config.gradientEndLight), description: 'Posição de fim do gradiente (modo claro)' },
        { key: 'bg_gradient_start_dark', value: String(config.gradientStartDark), description: 'Posição de início do gradiente (modo escuro)' },
        { key: 'bg_gradient_end_dark', value: String(config.gradientEndDark), description: 'Posição de fim do gradiente (modo escuro)' },
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
  const getPreviewGradient = (mode: 'light' | 'dark') => {
    const startAlpha = mode === 'light' ? config.intensityStartLight / 100 : config.intensityStartDark / 100;
    const endAlpha = mode === 'light' ? config.intensityEndLight / 100 : config.intensityEndDark / 100;
    const colorStart = mode === 'light' ? config.colorStartLight : config.colorStartDark;
    const colorEnd = mode === 'light' ? config.colorEndLight : config.colorEndDark;
    const gradientStart = mode === 'light' ? config.gradientStartLight : config.gradientStartDark;
    const gradientEnd = mode === 'light' ? config.gradientEndLight : config.gradientEndDark;
    return `linear-gradient(to bottom, ${hexToRgba(colorStart, startAlpha)} ${gradientStart}%, ${hexToRgba(colorEnd, endAlpha)} ${gradientEnd}%)`;
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
            {/* Colors with Tabs for Light/Dark */}
            <Tabs defaultValue="light" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="light" className="gap-2">
                  <Sun className="h-4 w-4" />
                  Modo Claro
                </TabsTrigger>
                <TabsTrigger value="dark" className="gap-2">
                  <Moon className="h-4 w-4" />
                  Modo Escuro
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="light" className="space-y-4 mt-4">
                {/* Preview Light */}
                <div className="space-y-2">
                  <Label>Preview (Modo Claro)</Label>
                  <div 
                    className="h-24 rounded-lg border flex items-center justify-center bg-white"
                    style={{ background: `white ${getPreviewGradient('light')}`.replace('white ', '') }}
                  >
                    <span className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded text-sm text-gray-700">
                      Preview do Gradiente
                    </span>
                  </div>
                </div>

                {/* Light Mode Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="colorStartLight">Cor Inicial</Label>
                    <div className="flex gap-2">
                      <Input
                        id="colorStartLight"
                        type="color"
                        value={config.colorStartLight}
                        onChange={(e) => setConfig({ ...config, colorStartLight: e.target.value })}
                        className="w-14 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={config.colorStartLight}
                        onChange={(e) => setConfig({ ...config, colorStartLight: e.target.value })}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorEndLight">Cor Final</Label>
                    <div className="flex gap-2">
                      <Input
                        id="colorEndLight"
                        type="color"
                        value={config.colorEndLight}
                        onChange={(e) => setConfig({ ...config, colorEndLight: e.target.value })}
                        className="w-14 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={config.colorEndLight}
                        onChange={(e) => setConfig({ ...config, colorEndLight: e.target.value })}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Light Mode Intensities */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Intensidade Inicial</Label>
                      <span className="text-sm text-muted-foreground">{config.intensityStartLight}%</span>
                    </div>
                    <Slider
                      value={[config.intensityStartLight]}
                      onValueChange={([value]) => setConfig({ ...config, intensityStartLight: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Intensidade Final</Label>
                      <span className="text-sm text-muted-foreground">{config.intensityEndLight}%</span>
                    </div>
                    <Slider
                      value={[config.intensityEndLight]}
                      onValueChange={([value]) => setConfig({ ...config, intensityEndLight: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>

                {/* Light Mode Gradient Positions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Início</Label>
                      <span className="text-sm text-muted-foreground">{config.gradientStartLight}%</span>
                    </div>
                    <Slider
                      value={[config.gradientStartLight]}
                      onValueChange={([value]) => setConfig({ ...config, gradientStartLight: Math.min(value, config.gradientEndLight - 1) })}
                      min={0}
                      max={99}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Fim</Label>
                      <span className="text-sm text-muted-foreground">{config.gradientEndLight}%</span>
                    </div>
                    <Slider
                      value={[config.gradientEndLight]}
                      onValueChange={([value]) => setConfig({ ...config, gradientEndLight: Math.max(value, config.gradientStartLight + 1) })}
                      min={1}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Início: onde a cor inicial termina | Fim: onde a cor final começa
                </p>
              </TabsContent>

              <TabsContent value="dark" className="space-y-4 mt-4">
                {/* Preview Dark */}
                <div className="space-y-2">
                  <Label>Preview (Modo Escuro)</Label>
                  <div 
                    className="h-24 rounded-lg border flex items-center justify-center bg-zinc-900"
                    style={{ background: `#18181b ${getPreviewGradient('dark')}`.replace('#18181b ', '') }}
                  >
                    <span className="bg-zinc-800/80 backdrop-blur-sm px-3 py-1 rounded text-sm text-gray-200">
                      Preview do Gradiente
                    </span>
                  </div>
                </div>

                {/* Dark Mode Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="colorStartDark">Cor Inicial</Label>
                    <div className="flex gap-2">
                      <Input
                        id="colorStartDark"
                        type="color"
                        value={config.colorStartDark}
                        onChange={(e) => setConfig({ ...config, colorStartDark: e.target.value })}
                        className="w-14 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={config.colorStartDark}
                        onChange={(e) => setConfig({ ...config, colorStartDark: e.target.value })}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorEndDark">Cor Final</Label>
                    <div className="flex gap-2">
                      <Input
                        id="colorEndDark"
                        type="color"
                        value={config.colorEndDark}
                        onChange={(e) => setConfig({ ...config, colorEndDark: e.target.value })}
                        className="w-14 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={config.colorEndDark}
                        onChange={(e) => setConfig({ ...config, colorEndDark: e.target.value })}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Dark Mode Intensities */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Intensidade Inicial</Label>
                      <span className="text-sm text-muted-foreground">{config.intensityStartDark}%</span>
                    </div>
                    <Slider
                      value={[config.intensityStartDark]}
                      onValueChange={([value]) => setConfig({ ...config, intensityStartDark: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Intensidade Final</Label>
                      <span className="text-sm text-muted-foreground">{config.intensityEndDark}%</span>
                    </div>
                    <Slider
                      value={[config.intensityEndDark]}
                      onValueChange={([value]) => setConfig({ ...config, intensityEndDark: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>

                {/* Dark Mode Gradient Positions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Início</Label>
                      <span className="text-sm text-muted-foreground">{config.gradientStartDark}%</span>
                    </div>
                    <Slider
                      value={[config.gradientStartDark]}
                      onValueChange={([value]) => setConfig({ ...config, gradientStartDark: Math.min(value, config.gradientEndDark - 1) })}
                      min={0}
                      max={99}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Fim</Label>
                      <span className="text-sm text-muted-foreground">{config.gradientEndDark}%</span>
                    </div>
                    <Slider
                      value={[config.gradientEndDark]}
                      onValueChange={([value]) => setConfig({ ...config, gradientEndDark: Math.max(value, config.gradientStartDark + 1) })}
                      min={1}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Início: onde a cor inicial termina | Fim: onde a cor final começa
                </p>
              </TabsContent>
            </Tabs>

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
