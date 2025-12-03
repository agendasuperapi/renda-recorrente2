import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sun, Moon, Smartphone } from "lucide-react";

interface StatusBarConfigEditorProps {
  onConfigSaved?: () => void;
}

interface ModeConfig {
  isGradient: boolean;
  colorStart: string;
  colorEnd: string;
  intensityStart: number;
  intensityEnd: number;
  direction: string;
}

interface StatusBarConfig {
  light: ModeConfig;
  dark: ModeConfig;
}

const defaultModeConfig: ModeConfig = {
  isGradient: false,
  colorStart: '#10b981',
  colorEnd: '#059669',
  intensityStart: 100,
  intensityEnd: 100,
  direction: 'to bottom',
};

const defaultConfig: StatusBarConfig = {
  light: { ...defaultModeConfig },
  dark: { ...defaultModeConfig, colorStart: '#065f46', colorEnd: '#064e3b' },
};

const directionOptions = [
  { value: 'to bottom', label: 'Para baixo ↓' },
  { value: 'to top', label: 'Para cima ↑' },
  { value: 'to right', label: 'Para direita →' },
  { value: 'to left', label: 'Para esquerda ←' },
  { value: 'to bottom right', label: 'Diagonal ↘' },
  { value: 'to bottom left', label: 'Diagonal ↙' },
  { value: 'to top right', label: 'Diagonal ↗' },
  { value: 'to top left', label: 'Diagonal ↖' },
];

export function StatusBarConfigEditor({ onConfigSaved }: StatusBarConfigEditorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<StatusBarConfig>(defaultConfig);
  const [activeTab, setActiveTab] = useState<'light' | 'dark'>('light');

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'status_bar_%');

      if (error) throw error;

      const newConfig: StatusBarConfig = JSON.parse(JSON.stringify(defaultConfig));
      
      data?.forEach((setting) => {
        const key = setting.key;
        const value = setting.value;
        
        // Parse light mode settings
        if (key === 'status_bar_light_is_gradient') newConfig.light.isGradient = value === 'true';
        if (key === 'status_bar_light_color_start') newConfig.light.colorStart = value;
        if (key === 'status_bar_light_color_end') newConfig.light.colorEnd = value;
        if (key === 'status_bar_light_intensity_start') newConfig.light.intensityStart = parseInt(value) || 100;
        if (key === 'status_bar_light_intensity_end') newConfig.light.intensityEnd = parseInt(value) || 100;
        if (key === 'status_bar_light_direction') newConfig.light.direction = value;
        
        // Parse dark mode settings
        if (key === 'status_bar_dark_is_gradient') newConfig.dark.isGradient = value === 'true';
        if (key === 'status_bar_dark_color_start') newConfig.dark.colorStart = value;
        if (key === 'status_bar_dark_color_end') newConfig.dark.colorEnd = value;
        if (key === 'status_bar_dark_intensity_start') newConfig.dark.intensityStart = parseInt(value) || 100;
        if (key === 'status_bar_dark_intensity_end') newConfig.dark.intensityEnd = parseInt(value) || 100;
        if (key === 'status_bar_dark_direction') newConfig.dark.direction = value;
        
        // Legacy support - convert old format
        if (key === 'status_bar_color_light') newConfig.light.colorStart = value;
        if (key === 'status_bar_color_dark') newConfig.dark.colorStart = value;
      });

      setConfig(newConfig);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as configurações da barra de status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const settings = [
        // Light mode
        { key: 'status_bar_light_is_gradient', value: String(config.light.isGradient), description: 'Se usa gradiente no modo claro' },
        { key: 'status_bar_light_color_start', value: config.light.colorStart, description: 'Cor inicial do gradiente modo claro' },
        { key: 'status_bar_light_color_end', value: config.light.colorEnd, description: 'Cor final do gradiente modo claro' },
        { key: 'status_bar_light_intensity_start', value: String(config.light.intensityStart), description: 'Intensidade inicial modo claro' },
        { key: 'status_bar_light_intensity_end', value: String(config.light.intensityEnd), description: 'Intensidade final modo claro' },
        { key: 'status_bar_light_direction', value: config.light.direction, description: 'Direção do gradiente modo claro' },
        // Dark mode
        { key: 'status_bar_dark_is_gradient', value: String(config.dark.isGradient), description: 'Se usa gradiente no modo escuro' },
        { key: 'status_bar_dark_color_start', value: config.dark.colorStart, description: 'Cor inicial do gradiente modo escuro' },
        { key: 'status_bar_dark_color_end', value: config.dark.colorEnd, description: 'Cor final do gradiente modo escuro' },
        { key: 'status_bar_dark_intensity_start', value: String(config.dark.intensityStart), description: 'Intensidade inicial modo escuro' },
        { key: 'status_bar_dark_intensity_end', value: String(config.dark.intensityEnd), description: 'Intensidade final modo escuro' },
        { key: 'status_bar_dark_direction', value: config.dark.direction, description: 'Direção do gradiente modo escuro' },
        // Legacy keys for backward compatibility
        { key: 'status_bar_color_light', value: config.light.colorStart, description: 'Cor da barra de status no modo claro' },
        { key: 'status_bar_color_dark', value: config.dark.colorStart, description: 'Cor da barra de status no modo escuro' },
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(setting, { onConflict: 'key' });

        if (error) throw error;
      }

      // Disparar evento customizado para atualizar a cor imediatamente
      window.dispatchEvent(new CustomEvent('status-bar-config-changed'));

      toast({
        title: "Configurações salvas",
        description: "A cor da barra de status foi atualizada",
      });

      onConfigSaved?.();
      setOpen(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateModeConfig = (mode: 'light' | 'dark', updates: Partial<ModeConfig>) => {
    setConfig(prev => ({
      ...prev,
      [mode]: { ...prev[mode], ...updates },
    }));
  };

  // Converter hex para RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const generateBackground = (modeConfig: ModeConfig): string => {
    if (!modeConfig.isGradient) {
      return modeConfig.colorStart;
    }
    
    const startRgb = hexToRgb(modeConfig.colorStart);
    const endRgb = hexToRgb(modeConfig.colorEnd);
    
    if (!startRgb || !endRgb) {
      return modeConfig.colorStart; // Fallback para cor sólida
    }
    
    const startAlpha = modeConfig.intensityStart / 100;
    const endAlpha = modeConfig.intensityEnd / 100;
    
    const startColor = `rgba(${startRgb.r}, ${startRgb.g}, ${startRgb.b}, ${startAlpha})`;
    const endColor = `rgba(${endRgb.r}, ${endRgb.g}, ${endRgb.b}, ${endAlpha})`;
    
    return `linear-gradient(${modeConfig.direction}, ${startColor}, ${endColor})`;
  };

  const currentConfig = activeTab === 'light' ? config.light : config.dark;

  const renderModeContent = (mode: 'light' | 'dark') => {
    const modeConfig = mode === 'light' ? config.light : config.dark;
    const bgColor = mode === 'light' ? 'bg-gray-100' : 'bg-gray-900';
    const textColor = mode === 'light' ? 'text-gray-500' : 'text-gray-400';

    return (
      <div className="space-y-4 mt-4">
        {/* Toggle Gradiente */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Usar Gradiente</Label>
            <p className="text-xs text-muted-foreground">Ativar para usar duas cores com transição</p>
          </div>
          <Switch
            checked={modeConfig.isGradient}
            onCheckedChange={(checked) => updateModeConfig(mode, { isGradient: checked })}
          />
        </div>

        {/* Cor Inicial / Cor Única */}
        <div className="space-y-2">
          <Label>{modeConfig.isGradient ? 'Cor Inicial' : 'Cor da Barra'}</Label>
          <div className="flex gap-3">
            <Input
              type="color"
              value={modeConfig.colorStart}
              onChange={(e) => updateModeConfig(mode, { colorStart: e.target.value })}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={modeConfig.colorStart}
              onChange={(e) => updateModeConfig(mode, { colorStart: e.target.value })}
              placeholder="#10b981"
              className="flex-1 font-mono"
            />
          </div>
        </div>

        {/* Campos adicionais para gradiente */}
        {modeConfig.isGradient && (
          <>
            {/* Cor Final */}
            <div className="space-y-2">
              <Label>Cor Final</Label>
              <div className="flex gap-3">
                <Input
                  type="color"
                  value={modeConfig.colorEnd}
                  onChange={(e) => updateModeConfig(mode, { colorEnd: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={modeConfig.colorEnd}
                  onChange={(e) => updateModeConfig(mode, { colorEnd: e.target.value })}
                  placeholder="#059669"
                  className="flex-1 font-mono"
                />
              </div>
            </div>

            {/* Intensidade Inicial */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Intensidade Inicial</Label>
                <span className="text-sm text-muted-foreground">{modeConfig.intensityStart}%</span>
              </div>
              <Slider
                value={[modeConfig.intensityStart]}
                onValueChange={([value]) => updateModeConfig(mode, { intensityStart: value })}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Intensidade Final */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Intensidade Final</Label>
                <span className="text-sm text-muted-foreground">{modeConfig.intensityEnd}%</span>
              </div>
              <Slider
                value={[modeConfig.intensityEnd]}
                onValueChange={([value]) => updateModeConfig(mode, { intensityEnd: value })}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Direção */}
            <div className="space-y-2">
              <Label>Direção do Gradiente</Label>
              <Select
                value={modeConfig.direction}
                onValueChange={(value) => updateModeConfig(mode, { direction: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a direção" />
                </SelectTrigger>
                <SelectContent>
                  {directionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Preview - Modo {mode === 'light' ? 'Claro' : 'Escuro'}
          </Label>
          <div className="relative rounded-xl overflow-hidden border shadow-lg">
            <div 
              className="h-7 flex items-center justify-between px-6 text-xs font-medium"
              style={{ background: generateBackground(modeConfig) }}
            >
              <span className="text-white drop-shadow-sm">9:41</span>
              <div className="flex items-center gap-1 text-white drop-shadow-sm">
                <span>●●●●</span>
                <span>WiFi</span>
                <span>100%</span>
              </div>
            </div>
            <div className={`h-32 ${bgColor} flex items-center justify-center`}>
              <span className={`${textColor} text-sm`}>Conteúdo da página</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Configurar Barra de Status</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Cor da Barra de Status
          </DialogTitle>
          <DialogDescription>
            Configure a cor ou gradiente da barra de status para modo claro e escuro.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'light' | 'dark')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="light" className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Modo Claro
                </TabsTrigger>
                <TabsTrigger value="dark" className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Modo Escuro
                </TabsTrigger>
              </TabsList>

              <TabsContent value="light">
                {renderModeContent('light')}
              </TabsContent>

              <TabsContent value="dark">
                {renderModeContent('dark')}
              </TabsContent>
            </Tabs>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="font-medium mb-1">💡 Dica</p>
              <p>A cor da barra de status é exibida no topo do dispositivo em aplicativos PWA instalados. 
              Use gradientes para criar um efeito visual mais interessante.</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveConfig} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
