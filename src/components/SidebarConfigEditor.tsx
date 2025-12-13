import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, X, Upload, Users, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarConfigEditorProps {
  onConfigSaved?: () => void;
}

type SidebarMode = 'user' | 'admin';

interface SidebarConfig {
  colorStart: string;
  colorEnd: string;
  intensityStart: number;
  intensityEnd: number;
  gradientStartPos: number;
  textColor: string;
  textColorLight: string;
  textColorDark: string;
  accentColor: string;
  logoUrlLight: string;
  logoUrlDark: string;
}

const defaultUserConfig: SidebarConfig = {
  colorStart: '#00bf63',
  colorEnd: '#00bf63',
  intensityStart: 37,
  intensityEnd: 25,
  gradientStartPos: 0,
  textColor: '#ffffff',
  textColorLight: '#000000',
  textColorDark: '#ffffff',
  accentColor: '#00e676',
  logoUrlLight: '',
  logoUrlDark: '',
};

const defaultAdminConfig: SidebarConfig = {
  colorStart: '#3b82f6',
  colorEnd: '#1e40af',
  intensityStart: 50,
  intensityEnd: 40,
  gradientStartPos: 0,
  textColor: '#ffffff',
  textColorLight: '#1e293b',
  textColorDark: '#ffffff',
  accentColor: '#60a5fa',
  logoUrlLight: '',
  logoUrlDark: '',
};

export const SidebarConfigEditor = ({ onConfigSaved }: SidebarConfigEditorProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<SidebarMode>('user');
  
  // Estados para configuração do usuário
  const [userConfig, setUserConfig] = useState<SidebarConfig>(defaultUserConfig);
  
  // Estados para configuração do admin
  const [adminConfig, setAdminConfig] = useState<SidebarConfig>(defaultAdminConfig);
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar configurações existentes
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .or('key.like.sidebar_%,key.like.admin_sidebar_%');

        if (error) throw error;

        if (data) {
          const newUserConfig = { ...defaultUserConfig };
          const newAdminConfig = { ...defaultAdminConfig };
          
          data.forEach(setting => {
            // Configurações do usuário (prefixo sidebar_)
            if (setting.key.startsWith('sidebar_') && !setting.key.startsWith('admin_sidebar_')) {
              switch (setting.key) {
                case 'sidebar_color_start':
                  newUserConfig.colorStart = setting.value;
                  break;
                case 'sidebar_color_end':
                  newUserConfig.colorEnd = setting.value;
                  break;
                case 'sidebar_intensity_start':
                  newUserConfig.intensityStart = parseInt(setting.value);
                  break;
                case 'sidebar_intensity_end':
                  newUserConfig.intensityEnd = parseInt(setting.value);
                  break;
                case 'sidebar_gradient_start_position':
                  newUserConfig.gradientStartPos = parseInt(setting.value);
                  break;
                case 'sidebar_text_color':
                  newUserConfig.textColor = setting.value;
                  break;
                case 'sidebar_text_color_light':
                  newUserConfig.textColorLight = setting.value;
                  break;
                case 'sidebar_text_color_dark':
                  newUserConfig.textColorDark = setting.value;
                  break;
                case 'sidebar_accent_color':
                  newUserConfig.accentColor = setting.value;
                  break;
                case 'sidebar_logo_url_light':
                  newUserConfig.logoUrlLight = setting.value;
                  break;
                case 'sidebar_logo_url_dark':
                  newUserConfig.logoUrlDark = setting.value;
                  break;
              }
            }
            // Configurações do admin (prefixo admin_sidebar_)
            if (setting.key.startsWith('admin_sidebar_')) {
              switch (setting.key) {
                case 'admin_sidebar_color_start':
                  newAdminConfig.colorStart = setting.value;
                  break;
                case 'admin_sidebar_color_end':
                  newAdminConfig.colorEnd = setting.value;
                  break;
                case 'admin_sidebar_intensity_start':
                  newAdminConfig.intensityStart = parseInt(setting.value);
                  break;
                case 'admin_sidebar_intensity_end':
                  newAdminConfig.intensityEnd = parseInt(setting.value);
                  break;
                case 'admin_sidebar_gradient_start_position':
                  newAdminConfig.gradientStartPos = parseInt(setting.value);
                  break;
                case 'admin_sidebar_text_color':
                  newAdminConfig.textColor = setting.value;
                  break;
                case 'admin_sidebar_text_color_light':
                  newAdminConfig.textColorLight = setting.value;
                  break;
                case 'admin_sidebar_text_color_dark':
                  newAdminConfig.textColorDark = setting.value;
                  break;
                case 'admin_sidebar_accent_color':
                  newAdminConfig.accentColor = setting.value;
                  break;
                case 'admin_sidebar_logo_url_light':
                  newAdminConfig.logoUrlLight = setting.value;
                  break;
                case 'admin_sidebar_logo_url_dark':
                  newAdminConfig.logoUrlDark = setting.value;
                  break;
              }
            }
          });
          
          setUserConfig(newUserConfig);
          setAdminConfig(newAdminConfig);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    if (open) {
      loadConfig();
    }
  }, [open]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, themeMode: 'light' | 'dark', sidebarMode: SidebarMode) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `sidebar-logo-${sidebarMode}-${themeMode}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (sidebarMode === 'user') {
        setUserConfig(prev => ({
          ...prev,
          [themeMode === 'light' ? 'logoUrlLight' : 'logoUrlDark']: publicUrl
        }));
      } else {
        setAdminConfig(prev => ({
          ...prev,
          [themeMode === 'light' ? 'logoUrlLight' : 'logoUrlDark']: publicUrl
        }));
      }
      
      toast.success(`Logo (${themeMode === 'light' ? 'claro' : 'escuro'}) carregado com sucesso!`);
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
      const userSettings = [
        { key: 'sidebar_color_start', value: userConfig.colorStart, description: 'Cor inicial do gradiente do sidebar' },
        { key: 'sidebar_color_end', value: userConfig.colorEnd, description: 'Cor final do gradiente do sidebar' },
        { key: 'sidebar_intensity_start', value: userConfig.intensityStart.toString(), description: 'Intensidade inicial do gradiente' },
        { key: 'sidebar_intensity_end', value: userConfig.intensityEnd.toString(), description: 'Intensidade final do gradiente' },
        { key: 'sidebar_gradient_start_position', value: userConfig.gradientStartPos.toString(), description: 'Posição de início do gradiente' },
        { key: 'sidebar_text_color', value: userConfig.textColor, description: 'Cor do texto do sidebar' },
        { key: 'sidebar_text_color_light', value: userConfig.textColorLight, description: 'Cor do texto do sidebar em modo claro' },
        { key: 'sidebar_text_color_dark', value: userConfig.textColorDark, description: 'Cor do texto do sidebar em modo escuro' },
        { key: 'sidebar_accent_color', value: userConfig.accentColor, description: 'Cor de destaque do sidebar' },
        { key: 'sidebar_logo_url_light', value: userConfig.logoUrlLight, description: 'URL do logo do sidebar em modo claro' },
        { key: 'sidebar_logo_url_dark', value: userConfig.logoUrlDark, description: 'URL do logo do sidebar em modo escuro' },
      ];

      const adminSettings = [
        { key: 'admin_sidebar_color_start', value: adminConfig.colorStart, description: 'Cor inicial do gradiente do sidebar admin' },
        { key: 'admin_sidebar_color_end', value: adminConfig.colorEnd, description: 'Cor final do gradiente do sidebar admin' },
        { key: 'admin_sidebar_intensity_start', value: adminConfig.intensityStart.toString(), description: 'Intensidade inicial do gradiente admin' },
        { key: 'admin_sidebar_intensity_end', value: adminConfig.intensityEnd.toString(), description: 'Intensidade final do gradiente admin' },
        { key: 'admin_sidebar_gradient_start_position', value: adminConfig.gradientStartPos.toString(), description: 'Posição de início do gradiente admin' },
        { key: 'admin_sidebar_text_color', value: adminConfig.textColor, description: 'Cor do texto do sidebar admin' },
        { key: 'admin_sidebar_text_color_light', value: adminConfig.textColorLight, description: 'Cor do texto do sidebar admin em modo claro' },
        { key: 'admin_sidebar_text_color_dark', value: adminConfig.textColorDark, description: 'Cor do texto do sidebar admin em modo escuro' },
        { key: 'admin_sidebar_accent_color', value: adminConfig.accentColor, description: 'Cor de destaque do sidebar admin' },
        { key: 'admin_sidebar_logo_url_light', value: adminConfig.logoUrlLight, description: 'URL do logo do sidebar admin em modo claro' },
        { key: 'admin_sidebar_logo_url_dark', value: adminConfig.logoUrlDark, description: 'URL do logo do sidebar admin em modo escuro' },
      ];

      const allSettings = [...userSettings, ...adminSettings];

      for (const setting of allSettings) {
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

  const updateConfig = (mode: SidebarMode, key: keyof SidebarConfig, value: string | number) => {
    if (mode === 'user') {
      setUserConfig(prev => ({ ...prev, [key]: value }));
    } else {
      const newConfig = { ...adminConfig, [key]: value };
      setAdminConfig(newConfig);
      
      // Atualizar cache local para preview em tempo real na sidebar
      const cacheData: Record<string, string> = {
        sidebar_color_start: newConfig.colorStart,
        sidebar_color_end: newConfig.colorEnd,
        sidebar_intensity_start: newConfig.intensityStart.toString(),
        sidebar_intensity_end: newConfig.intensityEnd.toString(),
        sidebar_gradient_start_position: newConfig.gradientStartPos.toString(),
        sidebar_text_color: newConfig.textColor,
        sidebar_text_color_light: newConfig.textColorLight,
        sidebar_text_color_dark: newConfig.textColorDark,
        sidebar_accent_color: newConfig.accentColor,
        sidebar_logo_url_light: newConfig.logoUrlLight,
        sidebar_logo_url_dark: newConfig.logoUrlDark,
      };
      
      // Atualizar o cache do react-query com os novos valores
      queryClient.setQueryData(['sidebar-config', true], cacheData);
    }
  };

  const getConfig = (mode: SidebarMode): SidebarConfig => {
    return mode === 'user' ? userConfig : adminConfig;
  };

  const renderSidebarConfigTab = (mode: SidebarMode) => {
    const config = getConfig(mode);
    const isAdmin = mode === 'admin';
    
    return (
      <div className="space-y-6">
        {/* Preview do Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {isAdmin ? <Shield className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              Pré-visualização - {isAdmin ? 'Admin' : 'Usuário'}
            </CardTitle>
            <CardDescription>
              Veja como o menu lateral ficará para {isAdmin ? 'administradores' : 'usuários'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div 
                className="w-64 h-80 flex flex-col p-4"
                style={{
                  background: `linear-gradient(180deg, ${config.colorStart}${Math.round((config.intensityStart / 100) * 255).toString(16).padStart(2, '0')} ${config.gradientStartPos}%, ${config.colorEnd}${Math.round((config.intensityEnd / 100) * 255).toString(16).padStart(2, '0')} 100%)`,
                  color: config.textColor
                }}
              >
                {/* Logo */}
                <div className="mb-4 flex items-center justify-center py-2">
                  {(config.logoUrlLight || config.logoUrlDark) ? (
                    <img 
                      src={config.logoUrlLight || config.logoUrlDark} 
                      alt="Logo" 
                      className="h-8 object-contain"
                    />
                  ) : isAdmin ? (
                    <div className="flex items-center gap-2" style={{ color: config.textColor }}>
                      <Shield className="h-5 w-5" />
                      <span className="font-semibold">Admin</span>
                    </div>
                  ) : (
                    <div 
                      className="h-10 w-10 rounded flex items-center justify-center text-xs"
                      style={{ backgroundColor: config.textColor + '20', color: config.textColor }}
                    >
                      Logo
                    </div>
                  )}
                </div>

                {/* Menu Items */}
                <div className="space-y-1">
                  <div 
                    className="flex items-center gap-3 px-3 py-2 rounded-md"
                    style={{ color: config.textColor }}
                  >
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: config.textColor + '40' }} />
                    <span className="text-sm">{isAdmin ? 'Dashboard Admin' : 'Dashboard'}</span>
                  </div>
                  <div 
                    className="flex items-center gap-3 px-3 py-2 rounded-md"
                    style={{ 
                      backgroundColor: config.accentColor + '20',
                      color: config.accentColor
                    }}
                  >
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: config.accentColor }} />
                    <span className="text-sm font-medium">{isAdmin ? 'Usuários' : 'Cupons'}</span>
                  </div>
                  <div 
                    className="flex items-center gap-3 px-3 py-2 rounded-md"
                    style={{ color: config.textColor }}
                  >
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: config.textColor + '40' }} />
                    <span className="text-sm">{isAdmin ? 'Configurações' : 'Pagamentos'}</span>
                  </div>
                </div>

                {/* User Info */}
                <div className="mt-auto pt-3 border-t" style={{ borderColor: config.textColor + '20' }}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                      style={{ backgroundColor: config.textColor + '20', color: config.textColor }}
                    >
                      {isAdmin ? 'A' : 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: config.textColor }}>
                        {isAdmin ? 'Admin' : 'Usuário'}
                      </p>
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
              <Label className="font-semibold">Logo - Modo Claro</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, 'light', mode)}
                  disabled={uploadingLogo}
                  className="flex-1"
                />
              </div>
              {config.logoUrlLight && (
                <div className="space-y-2">
                  <Input
                    value={config.logoUrlLight}
                    onChange={(e) => updateConfig(mode, 'logoUrlLight', e.target.value)}
                    placeholder="URL da imagem (modo claro)"
                    className="text-xs"
                  />
                  <img src={config.logoUrlLight} alt="Preview Logo Claro" className="h-12 object-contain" />
                </div>
              )}
            </div>

            {/* Logo Modo Escuro */}
            <div className="space-y-2">
              <Label className="font-semibold">Logo - Modo Escuro</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, 'dark', mode)}
                  disabled={uploadingLogo}
                  className="flex-1"
                />
              </div>
              {config.logoUrlDark && (
                <div className="space-y-2">
                  <Input
                    value={config.logoUrlDark}
                    onChange={(e) => updateConfig(mode, 'logoUrlDark', e.target.value)}
                    placeholder="URL da imagem (modo escuro)"
                    className="text-xs"
                  />
                  <img src={config.logoUrlDark} alt="Preview Logo Escuro" className="h-12 object-contain bg-gray-800 p-2 rounded" />
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
                <Label>Cor Inicial</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.colorStart}
                    onChange={(e) => updateConfig(mode, 'colorStart', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.colorStart}
                    onChange={(e) => updateConfig(mode, 'colorStart', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor Final</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.colorEnd}
                    onChange={(e) => updateConfig(mode, 'colorEnd', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.colorEnd}
                    onChange={(e) => updateConfig(mode, 'colorEnd', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Intensidade Inicial ({config.intensityStart}%)</Label>
                <Slider
                  value={[config.intensityStart]}
                  onValueChange={(value) => updateConfig(mode, 'intensityStart', value[0])}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Intensidade Final ({config.intensityEnd}%)</Label>
                <Slider
                  value={[config.intensityEnd]}
                  onValueChange={(value) => updateConfig(mode, 'intensityEnd', value[0])}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Posição Início ({config.gradientStartPos}%)</Label>
              <Slider
                value={[config.gradientStartPos]}
                onValueChange={(value) => updateConfig(mode, 'gradientStartPos', value[0])}
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
                <Label className="font-semibold">Cor do Texto - Modo Claro</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.textColorLight}
                    onChange={(e) => updateConfig(mode, 'textColorLight', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.textColorLight}
                    onChange={(e) => updateConfig(mode, 'textColorLight', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Cor do Texto - Modo Escuro</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.textColorDark}
                    onChange={(e) => updateConfig(mode, 'textColorDark', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.textColorDark}
                    onChange={(e) => updateConfig(mode, 'textColorDark', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor de Destaque (Hover)</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => updateConfig(mode, 'accentColor', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.accentColor}
                    onChange={(e) => updateConfig(mode, 'accentColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContent = () => (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SidebarMode)}>
        <TabsList className="grid w-full grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl">
          <TabsTrigger 
            value="user" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border rounded-lg"
          >
            <Users className="h-4 w-4" />
            <span>Usuário</span>
          </TabsTrigger>
          <TabsTrigger 
            value="admin"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border rounded-lg"
          >
            <Shield className="h-4 w-4" />
            <span>Admin</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="user" className="mt-4" forceMount>
          <div className={activeTab !== 'user' ? 'hidden' : ''}>
            {renderSidebarConfigTab('user')}
          </div>
        </TabsContent>
        
        <TabsContent value="admin" className="mt-4" forceMount>
          <div className={activeTab !== 'admin' ? 'hidden' : ''}>
            {renderSidebarConfigTab('admin')}
          </div>
        </TabsContent>
      </Tabs>

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
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button className="w-full md:w-auto">Editar Sidebar</Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Configurar Menu Lateral</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            {renderContent()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">Editar Sidebar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Menu Lateral</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
