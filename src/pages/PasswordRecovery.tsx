import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import logoAuth from "@/assets/logo-auth.png";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { saveToCache, getFromCache, CACHE_KEYS } from "@/lib/offlineCache";

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

const PasswordRecovery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [gradientConfigs, setGradientConfigs] = useState<Record<string, GradientConfig>>({});

  // Busca configurações de gradiente com cache
  const { data: gradientConfigsData = [] } = useQuery({
    queryKey: ['authGradientConfigs'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('landing_block_gradients' as any)
          .select('*')
          .in('block_name', ['auth_left_panel', 'auth_right_panel', 'auth_form_card']);
        
        if (error) throw error;
        
        if (data) {
          saveToCache(CACHE_KEYS.AUTH_GRADIENT_CONFIGS, data);
        }
        return data as unknown as GradientConfig[];
      } catch (error) {
        const cached = getFromCache<GradientConfig[]>(CACHE_KEYS.AUTH_GRADIENT_CONFIGS);
        if (cached) return cached;
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  // Busca descrição do produto com cache
  const { data: productData } = useQuery({
    queryKey: ['authProduct'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('descricao')
          .eq('id', 'bb582482-b006-47b8-b6ea-a6944d8cfdfd')
          .single();
        
        if (error) throw error;
        
        if (data) {
          saveToCache(CACHE_KEYS.AUTH_PRODUCT_DESCRIPTION, data);
        }
        return data;
      } catch (error) {
        const cached = getFromCache<{ descricao: string }>(CACHE_KEYS.AUTH_PRODUCT_DESCRIPTION);
        if (cached) return cached;
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (gradientConfigsData && gradientConfigsData.length > 0) {
      const configs: Record<string, GradientConfig> = {};
      gradientConfigsData.forEach(config => {
        configs[config.block_name] = config;
      });
      setGradientConfigs(configs);
    }
  }, [gradientConfigsData]);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });

    // Also check if we already have a session (user clicked the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getGradientStyle = (blockName: string) => {
    const config = gradientConfigs[blockName];
    if (!config) {
      return { background: '#10b981' };
    }
    
    const startAlpha = config.intensity_start / 100;
    const endAlpha = config.intensity_end / 100;
    const direction = blockName === 'auth_left_panel' ? 'to right' : 'to bottom';
    
    return {
      background: `linear-gradient(${direction}, ${config.color_start}${Math.round(startAlpha * 255).toString(16).padStart(2, '0')} ${config.gradient_start_position}%, ${config.color_end}${Math.round(endAlpha * 255).toString(16).padStart(2, '0')} 100%)`
    };
  };

  const getTextColor = (blockName: string) => {
    const config = gradientConfigs[blockName];
    if (!config) return undefined;
    
    if (theme === 'dark') {
      return config.text_color_dark || config.text_color || undefined;
    } else {
      return config.text_color_light || config.text_color || undefined;
    }
  };

  const getHeadingColor = (blockName: string) => {
    const config = gradientConfigs[blockName];
    if (!config) return undefined;
    
    if (theme === 'dark') {
      return config.heading_color_dark || config.heading_color || undefined;
    } else {
      return config.heading_color_light || config.heading_color || undefined;
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "As senhas não coincidem",
        });
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "A senha deve ter no mínimo 6 caracteres",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Senha alterada com sucesso!",
        description: "Você já pode fazer login com sua nova senha.",
      });
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#10b981] pt-[env(safe-area-inset-top)]">
      <div className="min-h-screen overflow-y-auto overscroll-none ios-scroll-wrapper">
        <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-background via-muted/20 to-background relative">
          <div className="absolute top-4 left-4 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
          <div className="absolute top-4 right-4 z-10">
            <ThemeToggle />
          </div>
          
          {/* Left Panel - Marketing Info */}
          <div className="hidden lg:flex items-center justify-center p-8 relative" style={getGradientStyle('auth_left_panel')}>
            <Card className="max-w-2xl w-full bg-transparent border-none shadow-none">
              <CardContent className="pt-6 text-center space-y-6">
                <div className="inline-flex items-center justify-center w-32 h-32 mb-2">
                  <img src={logoAuth} alt="Logo APP Renda recorrente" className="w-32 h-32 rounded-full" />
                </div>
                <h2 
                  className="text-2xl font-bold"
                  style={{ color: getHeadingColor('auth_left_panel') }}
                >
                  APP Renda recorrente
                </h2>
                <div className="space-y-4 leading-relaxed whitespace-pre-line" style={{ color: getTextColor('auth_left_panel') }}>
                  {productData?.descricao || '💸 App de Renda Recorrente\n\nCompartilhe links dos nossos produtos e ganhe comissões toda vez que alguém comprar através de você!\n\nE o melhor: nas renovações mensais, você continua recebendo.\n\n📊 Acompanhe tudo pelo painel em tempo real.\n\nTransforme suas indicações em renda automática e recorrente!'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Reset Password Form */}
          <div className="flex items-center justify-center p-3 sm:p-6 lg:p-8 relative" style={getGradientStyle('auth_right_panel')}>
            <div className="w-full max-w-2xl rounded-lg p-4 sm:p-6 relative backdrop-blur-md bg-background" style={getGradientStyle('auth_form_card')}>
              <div className="text-center mb-6 lg:hidden">
                <div className="inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 mb-3">
                  <img src={logoAuth} alt="Logo APP Renda recorrente" className="w-24 h-24 sm:w-32 sm:h-32 rounded-full" />
                </div>
                <h1 
                  className="text-xl sm:text-2xl font-bold"
                  style={{ color: getHeadingColor('auth_right_panel') }}
                >
                  APP Renda recorrente
                </h1>
              </div>

              {isReady ? (
                <form onSubmit={handleResetPassword} className="space-y-3 sm:space-y-4">
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-semibold" style={{ color: getHeadingColor('auth_form_card') }}>
                      Redefinir senha
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Digite sua nova senha
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-10 sm:h-11"
                    disabled={loading}
                  >
                    {loading ? "Alterando..." : "Alterar senha"}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <h2 className="text-lg font-semibold mb-2" style={{ color: getHeadingColor('auth_form_card') }}>
                    Carregando...
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Aguarde enquanto validamos seu link de recuperação.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordRecovery;
