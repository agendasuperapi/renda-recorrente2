import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Loader2, Eye, EyeOff, Palette, Moon, Sun, Power } from "lucide-react";
import { z } from "zod";
import { GradientEditor } from "@/components/GradientEditor";
import logoVerde from "@/assets/logo-renda-verde.png";
import logoBranco from "@/assets/logo-renda-branco.png";
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
interface Plan {
  id: string;
  name: string;
  price: number;
  billing_period: string;
}
const signupSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres").max(100, "Nome muito longo"),
  phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido"),
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(128, "Senha muito longa"),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, "Você deve aceitar os termos")
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"]
});
type SignupFormData = z.infer<typeof signupSchema>;
interface DebugInfo {
  environmentMode: string;
  planId: string;
  planName: string;
  integrationId: string | null;
  integrationData: any;
  integrationAccountId: string | null;
  accountId: string | null;
  accountName: string | null;
  keyAuthorization: string | null;
  successUrl: string | null;
  cancelUrl: string | null;
  returnUrl: string | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
}
export default function SignupFunnel() {
  const {
    planId
  } = useParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [formData, setFormData] = useState<SignupFormData>({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [testNumber, setTestNumber] = useState<number | null>(null);

  // Gradient customization state
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingGradient, setEditingGradient] = useState(false);
  const [gradientConfig, setGradientConfig] = useState<GradientConfig>({
    block_name: 'signup_funnel',
    color_start: '#10b981',
    color_end: '#10b981',
    intensity_start: 10,
    intensity_end: 30,
    gradient_start_position: 0,
    text_color_light: '#000000',
    text_color_dark: '#ffffff',
    heading_color_light: '#000000',
    heading_color_dark: '#ffffff'
  });
  const [previewConfig, setPreviewConfig] = useState<GradientConfig | null>(null);
  useEffect(() => {
    if (planId) {
      fetchPlan();
      // Preencher automaticamente em modo DEV ou se modo desenvolvedor estiver ativo
      const isDevMode = import.meta.env.DEV || localStorage.getItem('devMode') === 'true';
      if (isDevMode) {
        fetchTestNumber();
      }
    }
  }, [planId]);

  // Fetch gradient config and check admin status
  useEffect(() => {
    const fetchGradientConfig = async () => {
      const {
        data
      } = await supabase.from('landing_block_gradients' as any).select('*').eq('block_name', 'signup_funnel').single();
      if (data) {
        setGradientConfig(data as unknown as GradientConfig);
      }
    };
    const checkAdminRole = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data: roles
        } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
        if (roles?.some(r => r.role as string === 'super_admin' || r.role as string === 'admin')) {
          setIsAdmin(true);
        }
      }
    };
    fetchGradientConfig();
    checkAdminRole();
  }, []);
  const isDarkMode = () => document.documentElement.classList.contains('dark');
  const getGradientStyle = (config: GradientConfig) => {
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    const startAlpha = config.intensity_start / 100;
    const endAlpha = config.intensity_end / 100;
    return {
      background: `linear-gradient(to bottom, ${hexToRgba(config.color_start, startAlpha)} ${config.gradient_start_position}%, ${hexToRgba(config.color_end, endAlpha)} 100%)`
    };
  };
  const getTextColor = (config: GradientConfig) => {
    return isDarkMode() ? config.text_color_dark || '#ffffff' : config.text_color_light || '#000000';
  };
  const getHeadingColor = (config: GradientConfig) => {
    return isDarkMode() ? config.heading_color_dark || '#ffffff' : config.heading_color_light || '#000000';
  };
  const activeConfig = previewConfig || gradientConfig;
  // Gerar nome brasileiro aleatório (sempre com 3+ palavras) e retorna gênero
  const generateRandomBrazilianName = (): { name: string; isFemale: boolean } => {
    const maleFirstNames = ['João', 'José', 'Carlos', 'Pedro', 'Lucas', 'Mateus', 'Rafael', 'Bruno', 'Felipe', 'Gabriel', 'Fernando', 'Ricardo', 'Marcos', 'André', 'Paulo', 'Thiago', 'Diego', 'Leonardo', 'Gustavo', 'Eduardo'];
    const femaleFirstNames = ['Maria', 'Ana', 'Carla', 'Sara', 'Julia', 'Beatriz', 'Camila', 'Fernanda', 'Larissa', 'Amanda', 'Patrícia', 'Cristina', 'Vanessa', 'Letícia', 'Bruna', 'Gabriela', 'Isabela', 'Mariana', 'Aline', 'Juliana'];
    const middleNames = ['dos', 'das', 'de', 'da', 'do'];
    const surnames = ['Santos', 'Silva', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Rodrigues', 'Martins', 'Barbosa', 'Gomes', 'Ribeiro', 'Carvalho', 'Dias', 'Nascimento', 'Araújo', 'Moreira', 'Nunes'];
    
    const isFemale = Math.random() > 0.5;
    const firstName = isFemale 
      ? femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)]
      : maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)];
    
    // Sempre gerar com 3+ palavras
    const useMiddleName = Math.random() > 0.5;
    let name: string;
    
    if (useMiddleName) {
      // "Nome de Sobrenome" ou "Nome de Sobrenome Sobrenome"
      const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
      const surname1 = surnames[Math.floor(Math.random() * surnames.length)];
      const addSecondSurname = Math.random() > 0.5;
      if (addSecondSurname) {
        const surname2 = surnames[Math.floor(Math.random() * surnames.length)];
        name = `${firstName} ${middleName} ${surname1} ${surname2}`;
      } else {
        name = `${firstName} ${middleName} ${surname1}`;
      }
    } else {
      // "Nome Sobrenome Sobrenome"
      const surname1 = surnames[Math.floor(Math.random() * surnames.length)];
      const surname2 = surnames[Math.floor(Math.random() * surnames.length)];
      name = `${firstName} ${surname1} ${surname2}`;
    }
    
    return { name, isFemale };
  };

  // Gerar URL de avatar baseado no gênero
  const generateAvatarUrl = (isFemale: boolean): string => {
    const randomNumber = Math.floor(Math.random() * 99) + 1; // 1-99
    const gender = isFemale ? 'women' : 'men';
    return `https://randomuser.me/api/portraits/${gender}/${randomNumber}.jpg`;
  };

  // Estado para armazenar avatar do teste
  const [testAvatarUrl, setTestAvatarUrl] = useState<string | null>(null);

  const fetchTestNumber = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('test_users_counter').select('last_number').single();
      if (error) throw error;
      const nextNumber = (data?.last_number || 26) + 1;
      setTestNumber(nextNumber);

      // Preencher campos automaticamente em modo debug
      const { name: randomName, isFemale } = generateRandomBrazilianName();
      const avatarUrl = generateAvatarUrl(isFemale);
      setTestAvatarUrl(avatarUrl);
      
      const normalizedEmail = randomName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/\s+/g, ''); // Remove espaços
      
      setFormData({
        name: randomName,
        phone: '(38) 99826-9069',
        email: `${normalizedEmail}${nextNumber}@testex.com`,
        password: '123456',
        confirmPassword: '123456',
        acceptTerms: true
      });
    } catch (error) {
      console.error('Erro ao buscar número de teste:', error);
    }
  };
  const fetchPlan = async () => {
    const {
      data,
      error
    } = await supabase.from("plans").select("id, name, price, billing_period").eq("id", planId).single();
    if (error || !data) {
      toast({
        title: "Erro ao carregar plano",
        description: "Plano não encontrado",
        variant: "destructive"
      });
      navigate("/");
      return;
    }
    setPlan(data);

    // Fetch debug info in development mode or if dev mode is active
    const isDevMode = import.meta.env.DEV || localStorage.getItem('devMode') === 'true';
    if (isDevMode) {
      await fetchDebugInfo(planId!);
    }
  };
  const fetchDebugInfo = async (planId: string) => {
    try {
      // 1. Buscar modo do ambiente
      const {
        data: settingData
      } = await supabase.from("app_settings").select("value").eq("key", "environment_mode").maybeSingle();
      const environmentMode = settingData?.value || "test";

      // 2. Buscar integração do plano filtrando por environment_type
      const {
        data: integrationData
      } = await supabase.from("plan_integrations").select("*").eq("plan_id", planId).eq("environment_type", environmentMode).eq("is_active", true).maybeSingle();
      let accountData = null;

      // 3. Se encontrou integração, buscar dados da conta usando o account_id
      if (integrationData?.account_id) {
        const {
          data: accountResult
        } = await supabase.from("accounts").select("*").eq("id", integrationData.account_id).maybeSingle();
        accountData = accountResult;
      }
      setDebugInfo({
        environmentMode,
        planId,
        planName: plan?.name || "",
        integrationId: integrationData?.id || null,
        integrationData: integrationData || null,
        integrationAccountId: integrationData?.account_id || null,
        accountId: accountData?.id || null,
        accountName: accountData?.name || null,
        keyAuthorization: accountData?.key_authorization || null,
        successUrl: accountData?.success_url || null,
        cancelUrl: accountData?.cancel_url || null,
        returnUrl: accountData?.return_url || null,
        stripeProductId: integrationData?.stripe_product_id || null,
        stripePriceId: integrationData?.stripe_price_id || null
      });
    } catch (error) {
      console.error("Error fetching debug info:", error);
    }
  };
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setFormData(prev => ({
      ...prev,
      phone: formatted
    }));
  };
  const checkEmailExists = async (email: string): Promise<boolean> => {
    setCheckingEmail(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('check-email-exists', {
        body: {
          email
        }
      });
      if (error) throw error;
      return data.exists;
    } catch (error) {
      console.error('Error checking email:', error);
      toast({
        title: "Erro ao verificar email",
        description: "Tente novamente",
        variant: "destructive"
      });
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };
  const validateStep = async (step: number): Promise<boolean> => {
    const newErrors: Partial<Record<keyof SignupFormData, string>> = {};
    if (step === 1) {
      if (!formData.name || formData.name.trim().length < 2) {
        newErrors.name = "Nome deve ter no mínimo 2 caracteres";
      } else if (formData.name.length > 100) {
        newErrors.name = "Nome muito longo";
      }
    }
    if (step === 2) {
      if (!formData.phone.match(/^\(\d{2}\) \d{4,5}-\d{4}$/)) {
        newErrors.phone = "Telefone inválido";
      }
    }
    if (step === 3) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email || !emailRegex.test(formData.email)) {
        newErrors.email = "Email inválido";
      } else if (formData.email.length > 255) {
        newErrors.email = "Email muito longo";
      } else {
        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) {
          newErrors.email = "Este email já está cadastrado";
        }
      }
    }
    if (step === 4) {
      if (!formData.password || formData.password.length < 6) {
        newErrors.password = "Senha deve ter no mínimo 6 caracteres";
      } else if (formData.password.length > 128) {
        newErrors.password = "Senha muito longa";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "As senhas não conferem";
      }
      if (!formData.acceptTerms) {
        newErrors.acceptTerms = "Você deve aceitar os termos";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleContinue = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 5) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    }
  };
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };
  const handleEdit = () => {
    setCurrentStep(1);
  };
  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Incrementar contador de teste em modo debug ou desenvolvedor
      const isDevMode = import.meta.env.DEV || localStorage.getItem('devMode') === 'true';
      if (isDevMode && testNumber) {
        await supabase.rpc('get_next_test_number');
      }

      // Criar usuário no Supabase Auth
      const {
        data: authData,
        error: authError
      } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            ...(testAvatarUrl && { avatar_url: testAvatarUrl })
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      if (authError) throw authError;
      if (!authData.user) {
        throw new Error("Erro ao criar usuário");
      }

      // Atualizar avatar do profile em modo de teste
      if (testAvatarUrl) {
        await supabase
          .from('profiles')
          .update({ avatar_url: testAvatarUrl })
          .eq('id', authData.user.id);
      }

      // Capturar dados do cupom da URL
      const searchParams = new URLSearchParams(window.location.search);
      const couponData = searchParams.get('coupon_code') ? {
        code: searchParams.get('coupon_code') || '',
        type: searchParams.get('coupon_type') || '',
        value: parseInt(searchParams.get('coupon_value') || '0'),
        affiliate_id: searchParams.get('affiliate_id') || '',
        affiliate_coupon_id: searchParams.get('affiliate_coupon_id') || ''
      } : null;
      console.log('[SignupFunnel] Coupon data from URL:', couponData);

      // Criar sessão de checkout Stripe
      const {
        data: checkoutData,
        error: checkoutError
      } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          plan_id: planId,
          user_email: formData.email,
          user_name: formData.name,
          user_id: authData.user.id,
          coupon: couponData
        }
      });
      if (checkoutError) throw checkoutError;
      if (checkoutData?.checkout_url) {
        console.log('[SignupFunnel] Redirecting to Stripe:', checkoutData.checkout_url);
        console.log('[SignupFunnel] User authenticated:', authData.user.id);

        // Salvar checkout pendente na tabela
        const {
          error: insertError
        } = await supabase.from("pending_checkouts").insert({
          user_id: authData.user.id,
          plan_id: planId,
          checkout_url: checkoutData.checkout_url,
          stripe_session_id: checkoutData.session_id,
          status: "pending"
        });
        if (insertError) {
          console.error("Erro ao salvar checkout pendente:", insertError);
        }

        // Manter usuário autenticado para que ao retornar do Stripe já tenha acesso ao aplicativo
        // No editor da Lovable, abrir em nova aba. Quando publicado, redirecionar na mesma aba
        if (import.meta.env.DEV) {
          window.open(checkoutData.checkout_url, '_blank');
        } else {
          window.location.href = checkoutData.checkout_url;
        }
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (error: any) {
      console.error('Error during signup:', error);
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const renderProgressBar = () => <div className="mb-8">
      <div className="flex justify-center items-center gap-2 mb-2">
        {[1, 2, 3, 4].map(step => <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {currentStep > step ? <Check className="w-5 h-5" /> : step}
            </div>
            {step < 4 && <div className={`w-12 h-1 mx-2 transition-colors ${currentStep > step ? 'bg-primary' : 'bg-muted'}`} />}
          </div>)}
      </div>
      
    </div>;
  if (!plan) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  const isDevModeActive = localStorage.getItem('devMode') === 'true';
  const handleDisableDevMode = () => {
    localStorage.removeItem('devMode');
    toast({
      title: "🔧 Modo Desenvolvedor Desativado",
      description: "Voltando ao modo normal",
      duration: 3000
    });
    // Recarregar a página para limpar os dados preenchidos
    window.location.reload();
  };
  return <div className="min-h-screen py-12 px-4" style={getGradientStyle(activeConfig)}>
      <div className="container max-w-2xl mx-auto">
        <div className="flex justify-center mb-6">
          <img src={isDarkMode() ? logoBranco : logoVerde} alt="APP Renda Recorrente" className="h-16 object-contain" />
        </div>
        
        {renderProgressBar()}

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl" style={{
            color: getHeadingColor(activeConfig)
          }}>
              {currentStep === 1 && "Qual é o seu nome?"}
              {currentStep === 2 && "Qual é o seu telefone?"}
              {currentStep === 3 && "Qual é o seu email?"}
              {currentStep === 4 && "Crie sua senha"}
              {currentStep === 5 && "Confirme seus dados"}
            </CardTitle>
            <CardDescription style={{
            color: getTextColor(activeConfig)
          }}>
              {currentStep === 1 && "Digite seu nome completo para começar"}
              {currentStep === 2 && "Informe seu telefone para contato"}
              {currentStep === 3 && "Digite o email que você usará para acessar"}
              {currentStep === 4 && "Escolha uma senha segura"}
              {currentStep === 5 && `Revise suas informações antes de assinar o plano ${plan.name}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {currentStep === 1 && <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" type="text" placeholder="Digite seu nome completo" value={formData.name} onChange={e => setFormData(prev => ({
              ...prev,
              name: e.target.value
            }))} onKeyDown={e => e.key === 'Enter' && handleContinue()} className={errors.name ? "border-destructive" : ""} autoFocus />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>}

            {currentStep === 2 && <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" type="tel" placeholder="(00) 00000-0000" value={formData.phone} onChange={e => handlePhoneChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleContinue()} className={errors.phone ? "border-destructive" : ""} autoFocus />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>}

            {currentStep === 3 && <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={formData.email} onChange={e => setFormData(prev => ({
              ...prev,
              email: e.target.value
            }))} onKeyDown={e => e.key === 'Enter' && handleContinue()} className={errors.email ? "border-destructive" : ""} autoFocus disabled={checkingEmail} />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>}

            {currentStep === 4 && <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={formData.password} onChange={e => setFormData(prev => ({
                  ...prev,
                  password: e.target.value
                }))} onKeyDown={e => e.key === 'Enter' && handleContinue()} className={errors.password ? "border-destructive pr-10" : "pr-10"} autoFocus />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Digite a senha novamente" value={formData.confirmPassword} onChange={e => setFormData(prev => ({
                  ...prev,
                  confirmPassword: e.target.value
                }))} onKeyDown={e => e.key === 'Enter' && handleContinue()} className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox id="terms" checked={formData.acceptTerms} onCheckedChange={checked => setFormData(prev => ({
                ...prev,
                acceptTerms: checked as boolean
              }))} />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    Aceito os{" "}
                    <a href="/termos" target="_blank" className="text-primary hover:underline">
                      Termos de Uso
                    </a>{" "}
                    e a{" "}
                    <a href="/privacidade" target="_blank" className="text-primary hover:underline">
                      Política de Privacidade
                    </a>
                  </Label>
                </div>
                {errors.acceptTerms && <p className="text-sm text-destructive">{errors.acceptTerms}</p>}
              </div>}

            {currentStep === 5 && <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{formData.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{formData.email}</p>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">Plano Selecionado</p>
                    <p className="font-semibold text-lg">{plan.name}</p>
                    <p className="text-primary font-bold">
                      R$ {plan.price.toFixed(2)}/{plan.billing_period === 'monthly' ? 'mês' : 'ano'}
                    </p>
                  </div>
                </div>

                {/* Debug Info - Only in Development */}
                {import.meta.env.DEV && debugInfo && <div className="bg-yellow-50 dark:bg-yellow-950 border-2 border-yellow-500 p-4 rounded-lg space-y-2">
                    <h3 className="font-bold text-yellow-900 dark:text-yellow-100 text-sm mb-3">
                      🔧 DEBUG - Informações do Checkout Stripe
                    </h3>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Modo:</span> 
                        <span className="ml-2 font-mono">{debugInfo.environmentMode}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Plano ID:</span> 
                        <span className="ml-2 font-mono text-[10px]">{debugInfo.planId}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Plano Nome:</span> 
                        <span className="ml-2">{debugInfo.planName}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Conta ID (da integração):</span> 
                        <span className="ml-2 font-mono text-[10px]">{debugInfo.integrationAccountId || "❌ NÃO INFORMADO"}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Conta ID (tabela accounts):</span> 
                        <span className="ml-2 font-mono text-[10px]">{debugInfo.accountId || "❌ NÃO ENCONTRADA"}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Conta Nome:</span> 
                        <span className="ml-2">{debugInfo.accountName || "❌ NÃO ENCONTRADA"}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Key Authorization:</span> 
                        <span className="ml-2 font-mono text-[10px]">{debugInfo.keyAuthorization ? `${debugInfo.keyAuthorization.substring(0, 20)}...` : "❌ NÃO ENCONTRADA"}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Success URL:</span> 
                        <span className="ml-2 text-[10px]">{debugInfo.successUrl || "❌ NÃO CONFIGURADA"}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Cancel URL:</span> 
                        <span className="ml-2 text-[10px]">{debugInfo.cancelUrl || "❌ NÃO CONFIGURADA"}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Return URL:</span> 
                        <span className="ml-2 text-[10px]">{debugInfo.returnUrl || "❌ NÃO CONFIGURADA"}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Stripe Product ID:</span> 
                        <span className="ml-2 font-mono text-[10px]">{debugInfo.stripeProductId || "❌ NÃO CONFIGURADO"}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Stripe Price ID:</span> 
                        <span className="ml-2 font-mono text-[10px]">{debugInfo.stripePriceId || "❌ NÃO CONFIGURADO"}</span>
                      </div>
                      {debugInfo.integrationData && <details className="bg-white dark:bg-gray-900 p-2 rounded">
                          <summary className="font-semibold cursor-pointer">Dados Completos (JSON)</summary>
                          <pre className="text-[9px] mt-2 overflow-auto max-h-40 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                            {JSON.stringify(debugInfo.integrationData, null, 2)}
                          </pre>
                        </details>}
                    </div>
                  </div>}
              </div>}
          </CardContent>

          <CardFooter className="flex justify-between">
            {currentStep === 1 && <Button variant="outline" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>}
            {currentStep > 1 && currentStep < 5 && <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>}
            
            {currentStep === 5 && <Button variant="outline" onClick={handleEdit}>
                Editar
              </Button>}

            {currentStep < 4 && <Button onClick={handleContinue} className="ml-auto" disabled={checkingEmail}>
                {checkingEmail ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </> : <>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>}
              </Button>}

            {currentStep === 4 && <Button onClick={handleContinue} className="ml-auto">
                Revisar Dados
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>}

            {currentStep === 5 && <Button onClick={handleConfirm} disabled={loading} className="ml-auto">
                {loading ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </> : <>
                    Confirmar e Pagar
                    <Check className="w-4 h-4 ml-2" />
                  </>}
              </Button>}
          </CardFooter>
        </Card>

        <div className="flex justify-center gap-4 mt-8">
          {isAdmin && <Button variant="ghost" size="icon" onClick={() => setEditingGradient(true)} title="Personalizar" className="h-8 w-8 opacity-50 hover:opacity-100">
              <Palette className="w-4 h-4" />
            </Button>}

          {isDevModeActive && <>
              <Button variant="ghost" size="icon" onClick={() => {
            document.documentElement.classList.toggle('dark');
          }} title={isDarkMode() ? 'Modo Claro' : 'Modo Escuro'} className="h-8 w-8 opacity-50 hover:opacity-100">
                {isDarkMode() ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDisableDevMode} title="Desativar Modo Dev" className="h-8 w-8 opacity-50 hover:opacity-100 text-destructive">
                <Power className="w-4 h-4" />
              </Button>
            </>}
        </div>
      </div>

      {editingGradient && <GradientEditor blockName="signup_funnel" config={activeConfig} onSave={newConfig => {
      setGradientConfig(newConfig);
      setPreviewConfig(null);
      setEditingGradient(false);
    }} onClose={() => {
      setPreviewConfig(null);
      setEditingGradient(false);
    }} onPreview={config => setPreviewConfig(config)} />}
    </div>;
}