import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthGradientEditor } from "@/components/AuthGradientEditor";
import { Eye, EyeOff } from "lucide-react";
import logoAuth from "@/assets/logo-auth.png";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";

const authSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email deve ter no máximo 255 caracteres" }),
  password: z
    .string()
    .min(6, { message: "Senha deve ter no mínimo 6 caracteres" })
    .max(128, { message: "Senha deve ter no máximo 128 caracteres" }),
  name: z
    .string()
    .trim()
    .min(2, { message: "Nome deve ter no mínimo 2 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" })
    .optional()
    .or(z.literal("")),
});

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

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [gradientConfigs, setGradientConfigs] = useState<Record<string, GradientConfig>>({});

  // Busca configurações de gradiente
  const { data: gradientConfigsData = [] } = useQuery({
    queryKey: ['authGradientConfigs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_block_gradients' as any)
        .select('*')
        .in('block_name', ['auth_left_panel', 'auth_right_panel']);
      
      if (error) throw error;
      return data as unknown as GradientConfig[];
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

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!error && data && data.role === "super_admin") {
      setIsAdmin(true);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check if user is admin first
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        const isUserAdmin = roleData?.role === "super_admin";
        setIsAdmin(isUserAdmin);

        // Only redirect if NOT admin (admins can access to configure)
        if (!isUserAdmin) {
          navigate("/dashboard");
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        const isUserAdmin = roleData?.role === "super_admin";
        setIsAdmin(isUserAdmin);

        // Only redirect on auth changes if NOT admin
        if (_event === 'SIGNED_IN' && !isUserAdmin) {
          navigate("/dashboard");
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const getGradientStyle = (blockName: string) => {
    const config = gradientConfigs[blockName];
    if (!config) return {};
    
    const startAlpha = config.intensity_start / 100;
    const endAlpha = config.intensity_end / 100;
    
    return {
      background: `linear-gradient(to right, ${config.color_start}${Math.round(startAlpha * 255).toString(16).padStart(2, '0')} ${config.gradient_start_position}%, ${config.color_end}${Math.round(endAlpha * 255).toString(16).padStart(2, '0')} 100%)`
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar inputs
      const validationData = {
        email: email.trim(),
        password,
        name: isLogin ? "" : name.trim(),
      };

      const validation = authSchema.safeParse(validationData);
      
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: firstError.message,
        });
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: validation.data.email,
          password: validation.data.password,
        });

        if (error) throw error;

        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email: validation.data.email,
          password: validation.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              name: validation.data.name || "",
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Cadastro realizado!",
          description: "Redirecionando...",
        });
        navigate("/dashboard");
      }
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-background via-muted/20 to-background relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      {/* Left Panel - Marketing Info */}
      <div className="hidden lg:flex items-center justify-center p-8 relative" style={getGradientStyle('auth_left_panel')}>
        {isAdmin && (
          <div className="absolute top-4 left-4 z-10">
            <AuthGradientEditor blockName="auth_left_panel" initialConfig={gradientConfigs['auth_left_panel']} />
          </div>
        )}
        <Card className="max-w-md w-full bg-transparent border-none shadow-none">
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
            <div className="space-y-4 leading-relaxed" style={{ color: getTextColor('auth_left_panel') }}>
              <p className="text-lg">
                💸 App de Renda Recorrente
              </p>
              <p>
                Compartilhe links dos nossos produtos e ganhe comissões toda vez que alguém comprar através de você!
              </p>
              <p>
                E o melhor: nas renovações mensais, você continua recebendo.
              </p>
              <p>
                📊 Acompanhe tudo pelo painel em tempo real.
              </p>
              <p className="font-semibold" style={{ color: getHeadingColor('auth_left_panel') }}>
                Transforme suas indicações em renda automática e recorrente!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex items-center justify-center p-8 relative" style={getGradientStyle('auth_right_panel')}>
        {isAdmin && (
          <div className="absolute top-4 left-4 z-10">
            <AuthGradientEditor blockName="auth_right_panel" initialConfig={gradientConfigs['auth_right_panel']} />
          </div>
        )}
        <div className="w-full max-w-md bg-background/80 backdrop-blur-sm rounded-lg p-6">
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-32 h-32 mb-4">
              <img src={logoAuth} alt="Logo APP Renda recorrente" className="w-32 h-32 rounded-full" />
            </div>
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: getHeadingColor('auth_right_panel') }}
            >
              APP Renda recorrente
            </h1>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">
                  Nome completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="bg-background text-foreground border-input"
                  maxLength={100}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
                required
                className="bg-background text-foreground border-input"
                placeholder="seu@email.com"
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\s/g, ''))}
                  required
                  className="bg-background text-foreground border-input pr-10"
                  maxLength={128}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => isLogin ? navigate("/") : setIsLogin(!isLogin)}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              {isLogin ? "Criar um novo cadastro +" : "Já tem uma conta? Entrar"}
            </button>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            Ao continuar, estou de acordo com os{" "}
            <span
              onClick={() => navigate("/terms")}
              className="text-primary hover:text-primary/80 underline cursor-pointer"
            >
              Termos de Uso
            </span>{" "}
            e{" "}
            <span
              onClick={() => navigate("/privacy")}
              className="text-primary hover:text-primary/80 underline cursor-pointer"
            >
              Aviso de Privacidade
            </span>
            .
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
