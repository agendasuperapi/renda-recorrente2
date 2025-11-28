import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, X, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SidebarConfigEditorProps {
  onConfigSaved?: () => void;
}

export const SidebarConfigEditor = ({ onConfigSaved }: SidebarConfigEditorProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  // Estados para as cores do sidebar
  const [colorStart, setColorStart] = useState('#00bf63');
  const [colorEnd, setColorEnd] = useState('#00bf63');
  const [intensityStart, setIntensityStart] = useState(37);
  const [intensityEnd, setIntensityEnd] = useState(25);
  const [gradientStartPos, setGradientStartPos] = useState(0);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textColorLight, setTextColorLight] = useState('#000000');
  const [textColorDark, setTextColorDark] = useState('#ffffff');
  const [accentColor, setAccentColor] = useState('#00e676');
  
  // Estado para os logos
  const [logoUrlLight, setLogoUrlLight] = useState('');
  const [logoUrlDark, setLogoUrlDark] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);

  // Carregar configurações existentes
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .in('key', [
            'sidebar_color_start',
            'sidebar_color_end',
            'sidebar_intensity_start',
            'sidebar_intensity_end',
            'sidebar_gradient_start_position',
            'sidebar_text_color',
            'sidebar_text_color_light',
            'sidebar_text_color_dark',
            'sidebar_accent_color',
            'sidebar_logo_url_light',
            'sidebar_logo_url_dark'
          ]);

        if (error) throw error;

        if (data) {
          data.forEach(setting => {
            switch (setting.key) {
              case 'sidebar_color_start':
                setColorStart(setting.value);
                break;
              case 'sidebar_color_end':
                setColorEnd(setting.value);
                break;
              case 'sidebar_intensity_start':
                setIntensityStart(parseInt(setting.value));
                break;
              case 'sidebar_intensity_end':
                setIntensityEnd(parseInt(setting.value));
                break;
              case 'sidebar_gradient_start_position':
                setGradientStartPos(parseInt(setting.value));
                break;
              case 'sidebar_text_color':
                setTextColor(setting.value);
                break;
              case 'sidebar_text_color_light':
                setTextColorLight(setting.value);
                break;
              case 'sidebar_text_color_dark':
                setTextColorDark(setting.value);
                break;
              case 'sidebar_accent_color':
                setAccentColor(setting.value);
                break;
              case 'sidebar_logo_url_light':
                setLogoUrlLight(setting.value);
                break;
              case 'sidebar_logo_url_dark':
                setLogoUrlDark(setting.value);
                break;
            }
          });
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    if (open) {
      loadConfig();
    }
  }, [open]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `sidebar-logo-${mode}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (mode === 'light') {
        setLogoUrlLight(publicUrl);
      } else {
        setLogoUrlDark(publicUrl);
      }
      
      toast.success(`Logo (${mode === 'light' ? 'claro' : 'escuro'}) carregado com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload do logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings = [
        { key: 'sidebar_color_start', value: colorStart, description: 'Cor inicial do gradiente do sidebar' },
        { key: 'sidebar_color_end', value: colorEnd, description: 'Cor final do gradiente do sidebar' },
        { key: 'sidebar_intensity_start', value: intensityStart.toString(), description: 'Intensidade inicial do gradiente' },
        { key: 'sidebar_intensity_end', value: intensityEnd.toString(), description: 'Intensidade final do gradiente' },
        { key: 'sidebar_gradient_start_position', value: gradientStartPos.toString(), description: 'Posição de início do gradiente' },
        { key: 'sidebar_text_color', value: textColor, description: 'Cor do texto do sidebar' },
        { key: 'sidebar_text_color_light', value: textColorLight, description: 'Cor do texto do sidebar em modo claro' },
        { key: 'sidebar_text_color_dark', value: textColorDark, description: 'Cor do texto do sidebar em modo escuro' },
        { key: 'sidebar_accent_color', value: accentColor, description: 'Cor de destaque do sidebar' },
        { key: 'sidebar_logo_url_light', value: logoUrlLight, description: 'URL do logo do sidebar em modo claro' },
        { key: 'sidebar_logo_url_dark', value: logoUrlDark, description: 'URL do logo do sidebar em modo escuro' },
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(setting, { onConflict: 'key' });

        if (error) throw error;
      }

      // Invalidar e recarregar configurações do sidebar
      await queryClient.invalidateQueries({ queryKey: ['sidebar-config'] });
      await queryClient.refetchQueries({ queryKey: ['sidebar-config'] });
      
      toast.success('Configurações do sidebar salvas com sucesso!');
      onConfigSaved?.();
      
      // Pequeno delay para garantir atualização visual
      setTimeout(() => {
        setOpen(false);
      }, 300);
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Editar Sidebar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Menu Lateral</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Preview do Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pré-visualização do Menu</CardTitle>
              <CardDescription>
                Veja como o menu lateral ficará com as configurações escolhidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <div 
                  className="w-64 h-96 flex flex-col p-4"
                  style={{
                    background: `linear-gradient(180deg, ${colorStart}${Math.round((intensityStart / 100) * 255).toString(16).padStart(2, '0')} ${gradientStartPos}%, ${colorEnd}${Math.round((intensityEnd / 100) * 255).toString(16).padStart(2, '0')} 100%)`,
                    color: textColor
                  }}
                >
                  {/* Logo */}
                  <div className="mb-6 flex items-center justify-center py-2">
                    {(logoUrlLight || logoUrlDark) ? (
                      <div className="flex flex-col gap-2 items-center">
                        {logoUrlLight && (
                          <img 
                            src={logoUrlLight} 
                            alt="Logo Claro" 
                            className="h-10 object-contain"
                          />
                        )}
                        {logoUrlDark && (
                          <img 
                            src={logoUrlDark} 
                            alt="Logo Escuro" 
                            className="h-10 object-contain"
                          />
                        )}
                      </div>
                    ) : (
                      <div 
                        className="h-12 w-12 rounded flex items-center justify-center text-xs"
                        style={{ backgroundColor: textColor + '20', color: textColor }}
                      >
                        Logo
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="space-y-1">
                    <div 
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                      style={{ color: textColor }}
                    >
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: textColor + '40' }} />
                      <span className="text-sm">Dashboard</span>
                    </div>
                    <div 
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                      style={{ 
                        backgroundColor: accentColor + '20',
                        color: accentColor
                      }}
                    >
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: accentColor }} />
                      <span className="text-sm font-medium">Cupons</span>
                    </div>
                    <div 
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                      style={{ color: textColor }}
                    >
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: textColor + '40' }} />
                      <span className="text-sm">Pagamentos</span>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="mt-auto pt-4 border-t" style={{ borderColor: textColor + '20' }}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: textColor + '20', color: textColor }}
                      >
                        U
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: textColor }}>Usuário</p>
                        <p className="text-xs" style={{ color: textColor + 'CC' }}>user@email.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logos do Menu</CardTitle>
              <CardDescription>
                Faça upload dos logos para modo claro e escuro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Modo Claro */}
              <div className="space-y-2">
                <Label htmlFor="logo-upload-light" className="font-semibold">Logo - Modo Claro</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="logo-upload-light"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'light')}
                    disabled={uploadingLogo}
                    className="flex-1"
                  />
                  {uploadingLogo && (
                    <span className="text-sm text-muted-foreground">Carregando...</span>
                  )}
                </div>
                {logoUrlLight && (
                  <div className="space-y-2">
                    <Input
                      value={logoUrlLight}
                      onChange={(e) => setLogoUrlLight(e.target.value)}
                      placeholder="URL da imagem (modo claro)"
                      className="text-xs"
                    />
                    <img src={logoUrlLight} alt="Preview Logo Claro" className="h-12 object-contain" />
                  </div>
                )}
              </div>

              {/* Logo Modo Escuro */}
              <div className="space-y-2">
                <Label htmlFor="logo-upload-dark" className="font-semibold">Logo - Modo Escuro</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="logo-upload-dark"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'dark')}
                    disabled={uploadingLogo}
                    className="flex-1"
                  />
                  {uploadingLogo && (
                    <span className="text-sm text-muted-foreground">Carregando...</span>
                  )}
                </div>
                {logoUrlDark && (
                  <div className="space-y-2">
                    <Input
                      value={logoUrlDark}
                      onChange={(e) => setLogoUrlDark(e.target.value)}
                      placeholder="URL da imagem (modo escuro)"
                      className="text-xs"
                    />
                    <img src={logoUrlDark} alt="Preview Logo Escuro" className="h-12 object-contain bg-gray-800 p-2 rounded" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gradient Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cores do Gradiente</CardTitle>
              <CardDescription>
                Configure as cores do gradiente de fundo do menu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="space-y-2">
                <Label>Posição Início ({gradientStartPos}%)</Label>
                <Slider
                  value={[gradientStartPos]}
                  onValueChange={(value) => setGradientStartPos(value[0])}
                  min={0}
                  max={100}
                  step={10}
                />
              </div>
            </CardContent>
          </Card>

          {/* Text Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cores do Texto</CardTitle>
              <CardDescription>
                Configure as cores dos textos e elementos do menu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="textColorLight" className="font-semibold">Cor do Texto - Modo Claro</Label>
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
                  <Label htmlFor="textColorDark" className="font-semibold">Cor do Texto - Modo Escuro</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Cor de Destaque (Hover)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
