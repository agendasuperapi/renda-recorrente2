import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { z } from "zod";

interface Plan {
  id: string;
  name: string;
  price: number;
  billing_period: string;
  description: string | null;
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
  const { planId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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

  useEffect(() => {
    if (planId) {
      fetchPlan();
    }
  }, [planId]);

  const fetchPlan = async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("id, name, price, billing_period, description")
      .eq("id", planId)
      .single();

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

    // Fetch debug info in development mode
    if (import.meta.env.DEV) {
      await fetchDebugInfo(planId!);
    }
  };

  const fetchDebugInfo = async (planId: string) => {
    try {
      // Fetch environment mode
      const { data: settingData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "environment_mode")
        .single();

      const environmentMode = settingData?.value || "test";

      // Fetch plan integration
      const { data: integrationData } = await supabase
        .from("plan_integrations")
        .select(`
          id,
          stripe_product_id,
          stripe_price_id,
          environment_type,
          is_active,
          account_id,
          accounts (
            id,
            name,
            key_authorization,
            success_url,
            cancel_url,
            return_url,
            is_production
          )
        `)
        .eq("plan_id", planId)
        .eq("environment_type", environmentMode)
        .eq("is_active", true)
        .single();

      setDebugInfo({
        environmentMode,
        planId,
        planName: plan?.name || "",
        integrationId: integrationData?.id || null,
        integrationData: integrationData || null,
        accountId: integrationData?.accounts?.id || null,
        accountName: integrationData?.accounts?.name || null,
        keyAuthorization: integrationData?.accounts?.key_authorization || null,
        successUrl: integrationData?.accounts?.success_url || null,
        cancelUrl: integrationData?.accounts?.cancel_url || null,
        returnUrl: integrationData?.accounts?.return_url || null,
        stripeProductId: integrationData?.stripe_product_id || null,
        stripePriceId: integrationData?.stripe_price_id || null,
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
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    setCheckingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-email-exists', {
        body: { email }
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
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Erro ao criar usuário");
      }

      // Criar sessão de checkout Stripe
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          plan_id: planId,
          user_email: formData.email,
          user_name: formData.name
        }
      });

      if (checkoutError) throw checkoutError;

      if (checkoutData?.checkout_url) {
        window.location.href = checkoutData.checkout_url;
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

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
              currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {currentStep > step ? <Check className="w-5 h-5" /> : step}
            </div>
            {step < 4 && (
              <div className={`flex-1 h-1 mx-2 transition-colors ${
                currentStep > step ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-muted-foreground mt-2">
        Etapa {currentStep} de 4
      </div>
    </div>
  );

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container max-w-2xl mx-auto">
        {renderProgressBar()}

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {currentStep === 1 && "Qual é o seu nome?"}
              {currentStep === 2 && "Qual é o seu telefone?"}
              {currentStep === 3 && "Qual é o seu email?"}
              {currentStep === 4 && "Crie sua senha"}
              {currentStep === 5 && "Confirme seus dados"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Digite seu nome completo para começar"}
              {currentStep === 2 && "Informe seu telefone para contato"}
              {currentStep === 3 && "Digite o email que você usará para acessar"}
              {currentStep === 4 && "Escolha uma senha segura"}
              {currentStep === 5 && `Revise suas informações antes de assinar o plano ${plan.name}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={errors.name ? "border-destructive" : ""}
                  autoFocus
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={errors.phone ? "border-destructive" : ""}
                  autoFocus
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={errors.email ? "border-destructive" : ""}
                  autoFocus
                  disabled={checkingEmail}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className={errors.password ? "border-destructive" : ""}
                    autoFocus
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Digite a senha novamente"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className={errors.confirmPassword ? "border-destructive" : ""}
                  />
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acceptTerms: checked as boolean }))}
                  />
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
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
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
                {import.meta.env.DEV && debugInfo && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border-2 border-yellow-500 p-4 rounded-lg space-y-2">
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
                        <span className="font-semibold">Integração ID:</span> 
                        <span className="ml-2 font-mono text-[10px]">{debugInfo.integrationId || "❌ NÃO ENCONTRADA"}</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <span className="font-semibold">Conta ID:</span> 
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
                      {debugInfo.integrationData && (
                        <details className="bg-white dark:bg-gray-900 p-2 rounded">
                          <summary className="font-semibold cursor-pointer">Dados Completos (JSON)</summary>
                          <pre className="text-[9px] mt-2 overflow-auto max-h-40 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                            {JSON.stringify(debugInfo.integrationData, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            {currentStep > 1 && currentStep < 5 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            )}
            
            {currentStep === 5 && (
              <Button variant="outline" onClick={handleEdit}>
                Editar
              </Button>
            )}

            {currentStep < 4 && (
              <Button 
                onClick={handleContinue} 
                className="ml-auto"
                disabled={checkingEmail}
              >
                {checkingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}

            {currentStep === 4 && (
              <Button 
                onClick={handleContinue}
                className="ml-auto"
              >
                Revisar Dados
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {currentStep === 5 && (
              <Button 
                onClick={handleConfirm}
                disabled={loading}
                className="ml-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Confirmar e Pagar
                    <Check className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
