import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthGradientEditor } from "@/components/AuthGradientEditor";
import { Eye, EyeOff, ArrowLeft, AlertTriangle, Clock, Shield } from "lucide-react";
import logoAuth from "@/assets/logo-auth.png";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useDeployedVersion } from "@/hooks/useDeployedVersion";
import { useIsMobile } from "@/hooks/use-mobile";
import { saveToCache, getFromCache, CACHE_KEYS } from "@/lib/offlineCache";
import { ReCaptcha, ReCaptchaRef } from "@/components/ReCaptcha";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface LoginStatus {
  allowed: boolean;
  failed_count: number;
  remaining_attempts: number;
  requires_captcha: boolean;
  is_blocked: boolean;
  locked_until: string | null;
  block_reason?: string;
}

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const { formattedVersion } = useDeployedVersion();
  const recaptchaRef = useRef<ReCaptchaRef>(null);
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(() => {
    return localStorage.getItem("lastLoggedEmail") || "";
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [gradientConfigs, setGradientConfigs] = useState<Record<string, GradientConfig>>({});
  
  // Rate limiting states
  const [loginStatus, setLoginStatus] = useState<LoginStatus | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);

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

  // Check login status when email changes
  useEffect(() => {
    const checkLoginStatus = async () => {
      if (!email.trim() || !isLogin) {
        setLoginStatus(null);
        setShowCaptcha(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('check_login_allowed', {
          p_email: email.trim()
        });

        if (error) {
          console.error('Error checking login status:', error);
          return;
        }

        const status = data as unknown as LoginStatus;
        setLoginStatus(status);
        setShowCaptcha(status.requires_captcha);
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };

    const debounceTimer = setTimeout(checkLoginStatus, 500);
    return () => clearTimeout(debounceTimer);
  }, [email, isLogin]);

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
    const isRecoveryUrl = () =>
      window.location.search.includes("type=recovery") ||
      window.location.hash.includes("type=recovery");

    const goToRecovery = () => {
      navigate(
        {
          pathname: "/auth/recovery",
          search: window.location.search,
          hash: window.location.hash,
        },
        { replace: true }
      );
    };

    const initAuth = async () => {
      const recovery = isRecoveryUrl();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (recovery) {
        goToRecovery();
        return;
      }

      if (session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        const isUserAdmin = roleData?.role === "super_admin";
        setIsAdmin(isUserAdmin);

        if (!isUserAdmin) {
          navigate("/user/dashboard");
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || isRecoveryUrl()) {
        setIsForgotPassword(false);
        goToRecovery();
        return;
      }

      if (session?.user) {
        setTimeout(() => {
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single()
            .then(({ data: roleData }) => {
              const isUserAdmin = roleData?.role === "super_admin";
              setIsAdmin(isUserAdmin);

              if (event === "SIGNED_IN" && !isUserAdmin && !isResetPassword) {
                navigate("/user/dashboard");
              }
            });
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isResetPassword]);

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
      
      setIsResetPassword(false);
      setPassword("");
      setConfirmPassword("");
      
      await supabase.auth.signOut();
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Digite seu e-mail",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/auth/recovery`,
      });

      if (error) throw error;

      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      setIsForgotPassword(false);
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

  const recordFailedLogin = async (userEmail: string) => {
    try {
      const { data, error } = await supabase.rpc('record_failed_login', {
        p_email: userEmail,
        p_ip_address: null // IP is handled server-side in production
      });

      if (error) {
        console.error('Error recording failed login:', error);
        return null;
      }

      const result = data as {
        failed_count: number;
        is_blocked: boolean;
        locked_until: string | null;
        should_notify: boolean;
        requires_captcha: boolean;
      };

      // Send notification if needed
      if (result.should_notify) {
        try {
          await supabase.functions.invoke('notify-suspicious-login', {
            body: {
              email: userEmail,
              failed_count: result.failed_count,
              is_blocked: result.is_blocked
            }
          });
        } catch (notifyError) {
          console.error('Error sending notification:', notifyError);
        }
      }

      // Update local state
      setShowCaptcha(result.requires_captcha);
      
      // Refresh login status
      const { data: newStatus } = await supabase.rpc('check_login_allowed', {
        p_email: userEmail
      });
      if (newStatus) {
        setLoginStatus(newStatus as unknown as LoginStatus);
      }

      return result;
    } catch (error) {
      console.error('Error recording failed login:', error);
      return null;
    }
  };

  const resetLoginAttempts = async (userEmail: string) => {
    try {
      await supabase.rpc('reset_login_attempts', { p_email: userEmail });
    } catch (error) {
      console.error('Error resetting login attempts:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
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
        // Check if login is allowed
        if (loginStatus && !loginStatus.allowed) {
          if (loginStatus.is_blocked) {
            toast({
              variant: "destructive",
              title: "Conta bloqueada",
              description: "Sua conta foi bloqueada por segurança. Entre em contato com o suporte.",
            });
          } else if (loginStatus.locked_until) {
            const lockTime = formatDistanceToNow(new Date(loginStatus.locked_until), { 
              addSuffix: true, 
              locale: ptBR 
            });
            toast({
              variant: "destructive",
              title: "Muitas tentativas",
              description: `Tente novamente ${lockTime}.`,
            });
          }
          setLoading(false);
          return;
        }

        // Execute CAPTCHA if required
        if (showCaptcha && recaptchaRef.current) {
          const captchaToken = await recaptchaRef.current.executeAsync();
          if (!captchaToken) {
            toast({
              variant: "destructive",
              title: "Erro de verificação",
              description: "Não foi possível verificar o CAPTCHA. Tente novamente.",
            });
            setLoading(false);
            return;
          }
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: validation.data.email,
          password: validation.data.password,
        });

        if (error) {
          // Record failed login attempt
          const result = await recordFailedLogin(validation.data.email);
          
          if (result?.is_blocked) {
            toast({
              variant: "destructive",
              title: "Conta bloqueada",
              description: "Sua conta foi bloqueada após muitas tentativas incorretas. Entre em contato com o suporte.",
            });
          } else if (result?.locked_until) {
            const lockTime = formatDistanceToNow(new Date(result.locked_until), { 
              addSuffix: true, 
              locale: ptBR 
            });
            toast({
              variant: "destructive",
              title: "Bloqueio temporário",
              description: `Muitas tentativas incorretas. Tente novamente ${lockTime}.`,
            });
          } else if (loginStatus && loginStatus.remaining_attempts <= 2) {
            toast({
              variant: "destructive",
              title: "Senha incorreta",
              description: `Você tem mais ${loginStatus.remaining_attempts - 1} tentativa(s) antes do bloqueio.`,
            });
          } else {
            throw error;
          }
          setLoading(false);
          return;
        }

        // Login successful - reset attempts
        await resetLoginAttempts(validation.data.email);

        localStorage.setItem("lastLoggedEmail", validation.data.email);

        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
        if (isMobile) {
          window.location.href = "/user/dashboard";
        } else {
          navigate("/user/dashboard");
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: validation.data.email,
          password: validation.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/user/dashboard`,
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
        if (isMobile) {
          window.location.href = "/user/dashboard";
        } else {
          navigate("/user/dashboard");
        }
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

  const renderLoginWarning = () => {
    if (!loginStatus || !isLogin) return null;

    if (loginStatus.is_blocked) {
      return (
        <Alert variant="destructive" className="mb-4">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Sua conta foi bloqueada por segurança após muitas tentativas incorretas. 
            Entre em contato com o suporte para desbloquear.
          </AlertDescription>
        </Alert>
      );
    }

    if (loginStatus.locked_until && new Date(loginStatus.locked_until) > new Date()) {
      const lockTime = formatDistanceToNow(new Date(loginStatus.locked_until), { 
        addSuffix: true, 
        locale: ptBR 
      });
      return (
        <Alert variant="destructive" className="mb-4">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Acesso bloqueado temporariamente. Tente novamente {lockTime}.
          </AlertDescription>
        </Alert>
      );
    }

    if (loginStatus.failed_count >= 3 && loginStatus.remaining_attempts <= 3) {
      return (
        <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            Atenção: você tem {loginStatus.remaining_attempts} tentativa(s) restante(s) antes do bloqueio.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#10b981] pt-[env(safe-area-inset-top)]">
      {/* reCAPTCHA Component */}
      {showCaptcha && <ReCaptcha ref={recaptchaRef} />}
      
      <div className="min-h-screen overflow-y-auto overscroll-none ios-scroll-wrapper">
        <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-background via-muted/20 to-background relative">
        <div className="absolute top-4 left-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
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
        {isAdmin && (
          <div className="absolute top-4 left-4 z-10">
            <AuthGradientEditor blockName="auth_left_panel" initialConfig={gradientConfigs['auth_left_panel']} />
          </div>
        )}
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

      {/* Right Panel - Auth Form */}
      <div className="flex items-center justify-center p-3 sm:p-6 lg:p-8 relative" style={getGradientStyle('auth_right_panel')}>
        {isAdmin && (
          <div className="absolute top-4 left-4 z-10">
            <AuthGradientEditor blockName="auth_right_panel" initialConfig={gradientConfigs['auth_right_panel']} />
          </div>
        )}
        <div className="w-full max-w-2xl rounded-lg p-4 sm:p-6 relative backdrop-blur-md bg-background" style={getGradientStyle('auth_form_card')}>
          {isAdmin && (
            <div className="absolute top-2 right-2 z-10">
              <AuthGradientEditor blockName="auth_form_card" initialConfig={gradientConfigs['auth_form_card']} />
            </div>
          )}
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

          {isResetPassword ? (
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
                <Label htmlFor="password" style={{ color: getTextColor('auth_form_card') }}>
                  Nova senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\s/g, ''))}
                    required
                    className="bg-background text-foreground border-input pr-10"
                    maxLength={128}
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" style={{ color: getTextColor('auth_form_card') }}>
                  Confirmar nova senha
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value.replace(/\s/g, ''))}
                  required
                  className="bg-background text-foreground border-input"
                  maxLength={128}
                  minLength={6}
                  placeholder="Repita a senha"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-3 sm:space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-lg font-semibold" style={{ color: getHeadingColor('auth_form_card') }}>
                  Esqueci minha senha
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Digite seu e-mail para receber o link de redefinição
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" style={{ color: getTextColor('auth_form_card') }}>
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
                  required
                  className="bg-background text-foreground border-input"
                  placeholder="seu@email.com"
                  maxLength={255}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-sm hover:opacity-80 transition-opacity"
                  style={{ color: getTextColor('auth_form_card') }}
                >
                  ← Voltar para o login
                </button>
              </div>
            </form>
          ) : (
            <>
              {renderLoginWarning()}
              
              <form onSubmit={handleAuth} className="space-y-3 sm:space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name" style={{ color: getTextColor('auth_form_card') }}>
                      Nome completo
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="bg-background text-foreground border-input"
                      maxLength={100}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" style={{ color: getTextColor('auth_form_card') }}>
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
                    required
                    className="bg-background text-foreground border-input"
                    placeholder="seu@email.com"
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" style={{ color: getTextColor('auth_form_card') }}>
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={isLogin ? "current-password" : "new-password"}
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
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm hover:opacity-80 transition-opacity mt-1"
                      style={{ color: getTextColor('auth_form_card') }}
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading || (loginStatus?.is_blocked) || (loginStatus?.locked_until && new Date(loginStatus.locked_until) > new Date())}
                >
                  {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => isLogin ? navigate("/") : setIsLogin(!isLogin)}
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: getTextColor('auth_form_card') }}
                >
                  {isLogin ? "Criar um novo cadastro +" : "Já tem uma conta? Entrar"}
                </button>
              </div>

              <div className="mt-4 text-center text-xs" style={{ color: getTextColor('auth_form_card') }}>
                Ao continuar, estou de acordo com os{" "}
                <span
                  onClick={() => navigate("/terms")}
                  className="hover:opacity-80 underline cursor-pointer"
                  style={{ color: getTextColor('auth_form_card') }}
                >
                  Termos de Uso
                </span>{" "}
                e{" "}
                <span
                  onClick={() => navigate("/privacy")}
                  className="hover:opacity-80 underline cursor-pointer"
                  style={{ color: getTextColor('auth_form_card') }}
                >
                  Aviso de Privacidade
                </span>
                .
              </div>

              {formattedVersion && (
                <div className="mt-4 text-center text-xs opacity-50" style={{ color: getTextColor('auth_form_card') }}>
                  {formattedVersion}
                </div>
              )}
            </>
          )}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;