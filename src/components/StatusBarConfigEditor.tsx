import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface StatusBarConfig {
  colorLight: string;
  colorDark: string;
}

const defaultConfig: StatusBarConfig = {
  colorLight: '#10b981',
  colorDark: '#10b981',
};

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
        .in('key', ['status_bar_color_light', 'status_bar_color_dark']);

      if (error) throw error;

      const newConfig = { ...defaultConfig };
      
      data?.forEach((setting) => {
        switch (setting.key) {
          case 'status_bar_color_light':
            newConfig.colorLight = setting.value;
            break;
          case 'status_bar_color_dark':
            newConfig.colorDark = setting.value;
            break;
        }
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
        { key: 'status_bar_color_light', value: config.colorLight, description: 'Cor da barra de status no modo claro' },
        { key: 'status_bar_color_dark', value: config.colorDark, description: 'Cor da barra de status no modo escuro' },
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

  const handleColorChange = (color: string, mode: 'light' | 'dark') => {
    setConfig(prev => ({
      ...prev,
      [mode === 'light' ? 'colorLight' : 'colorDark']: color,
    }));
  };

  const currentColor = activeTab === 'light' ? config.colorLight : config.colorDark;

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
            Configure a cor da barra de status (hora, bateria, sinal) para modo claro e escuro.
            Esta cor é exibida no topo do dispositivo em PWAs.
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

              <TabsContent value="light" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <Label>Cor da Barra de Status</Label>
                  <div className="flex gap-3">
                    <Input
                      type="color"
                      value={config.colorLight}
                      onChange={(e) => handleColorChange(e.target.value, 'light')}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={config.colorLight}
                      onChange={(e) => handleColorChange(e.target.value, 'light')}
                      placeholder="#10b981"
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>

                {/* Preview Modo Claro */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Preview - Modo Claro</Label>
                  <div className="relative rounded-xl overflow-hidden border shadow-lg">
                    <div 
                      className="h-7 flex items-center justify-between px-6 text-xs font-medium"
                      style={{ backgroundColor: config.colorLight }}
                    >
                      <span className="text-white">9:41</span>
                      <div className="flex items-center gap-1 text-white">
                        <span>●●●●</span>
                        <span>WiFi</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <div className="h-32 bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">Conteúdo da página</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="dark" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <Label>Cor da Barra de Status</Label>
                  <div className="flex gap-3">
                    <Input
                      type="color"
                      value={config.colorDark}
                      onChange={(e) => handleColorChange(e.target.value, 'dark')}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={config.colorDark}
                      onChange={(e) => handleColorChange(e.target.value, 'dark')}
                      placeholder="#10b981"
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>

                {/* Preview Modo Escuro */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Preview - Modo Escuro</Label>
                  <div className="relative rounded-xl overflow-hidden border shadow-lg">
                    <div 
                      className="h-7 flex items-center justify-between px-6 text-xs font-medium"
                      style={{ backgroundColor: config.colorDark }}
                    >
                      <span className="text-white">9:41</span>
                      <div className="flex items-center gap-1 text-white">
                        <span>●●●●</span>
                        <span>WiFi</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <div className="h-32 bg-gray-900 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">Conteúdo da página</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="font-medium mb-1">💡 Dica</p>
              <p>A cor da barra de status é exibida no topo do dispositivo em aplicativos PWA instalados. 
              Recomenda-se usar cores que combinem com o tema do seu app.</p>
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
