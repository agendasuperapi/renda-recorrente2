import { Button } from "@/components/ui/button";
import { Check, Shield, Trophy, Lock, Users } from "lucide-react";

const Plan = () => {
  const plans = [
    {
      name: "Afiliação FREE",
      badge: "Para conhecer",
      price: "R$0,00",
      originalPrice: null,
      discount: null,
      period: "",
      features: [
        "Treinamento",
        "Comissão Reduzida (25%)",
        "Suporte",
        "Ferramentas de divulgação",
      ],
      buttonText: "Selecionar Plano Afiliação FREE",
      current: true,
      trial: null,
    },
    {
      name: "Afiliação PRO",
      badge: "Mais lucrativo",
      price: "R$49,90",
      originalPrice: "R$59,90",
      discount: "10,00 de desconto",
      period: "por:",
      features: [
        "Treinamento",
        "Comissão 40%",
        "Suporte",
        "Ferramentas de divulgação",
      ],
      buttonText: "Selecionar Plano Afiliação PRO",
      popular: true,
      trial: "Teste Grátis por 7 dias",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Plano de Afiliação</h1>
        <p className="text-muted-foreground">
          Escolha o plano ideal para maximizar seus ganhos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan, index) => (
          <div
            key={index}
            className="relative bg-[hsl(var(--card))] rounded-3xl p-8 border border-border/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className={`px-4 py-1 rounded-full text-sm font-medium ${
                plan.popular 
                  ? "bg-[#22c55e] text-[#1a1a1a]" 
                  : "bg-[#22c55e] text-[#1a1a1a]"
              }`}>
                {plan.badge}
              </span>
            </div>

            {/* Icon */}
            <div className="flex justify-center mt-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-[#22c55e] flex items-center justify-center">
                <Users className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Plan Name */}
            <h3 className="text-[#22c55e] text-2xl font-bold text-center mb-6">
              {plan.name}
            </h3>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-[#22c55e] shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            {/* Pricing */}
            {plan.originalPrice && (
              <div className="text-center mb-2">
                <span className="text-muted-foreground line-through text-sm">
                  de {plan.originalPrice}{plan.period}
                </span>
              </div>
            )}
            <div className="text-center mb-2">
              <span className="text-[#22c55e] text-4xl font-bold">
                {plan.price}
              </span>
            </div>
            {plan.discount && (
              <div className="text-center mb-6">
                <span className="text-white text-sm font-medium">
                  {plan.discount}
                </span>
              </div>
            )}
            {!plan.originalPrice && (
              <div className="mb-6"></div>
            )}

            {/* Button */}
            <Button
              className="w-full bg-[#22c55e] hover:bg-[#22c55e]/90 text-[#1a1a1a] font-medium py-6 rounded-xl"
              disabled={plan.current}
            >
              <Users className="mr-2 h-5 w-5" />
              {plan.current ? "Plano Atual" : plan.buttonText}
            </Button>

            {/* Trust Badges */}
            <div className="flex justify-center gap-6 mt-6">
              <div className="flex flex-col items-center">
                <Shield className="h-6 w-6 text-foreground mb-1" />
                <span className="text-xs text-foreground">Compra<br/>Segura</span>
              </div>
              <div className="flex flex-col items-center">
                <Trophy className="h-6 w-6 text-foreground mb-1" />
                <span className="text-xs text-foreground">Satisfação<br/>Garantida</span>
              </div>
              <div className="flex flex-col items-center">
                <Lock className="h-6 w-6 text-foreground mb-1" />
                <span className="text-xs text-foreground">Privacidade<br/>Protegida</span>
              </div>
            </div>

            {/* Trial Text */}
            {plan.trial && (
              <div className="text-center mt-4">
                <span className="text-[#22c55e] text-sm font-medium">
                  {plan.trial}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Plan;
