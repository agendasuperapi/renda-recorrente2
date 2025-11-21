import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, Crown } from "lucide-react";

const Plan = () => {
  const plans = [
    {
      name: "FREE",
      price: "R$ 0",
      period: "Grátis",
      features: [
        "Comissão de 15%",
        "Até 10 indicações/mês",
        "Suporte por email",
        "Dashboard básico",
      ],
      current: true,
    },
    {
      name: "PRO",
      price: "R$ 97",
      period: "/mês",
      features: [
        "Comissão de 25%",
        "Indicações ilimitadas",
        "Suporte prioritário",
        "Dashboard completo",
        "Sub-afiliados",
        "Treinamento exclusivo",
      ],
      popular: true,
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
            <Card
              key={index}
              className={`relative transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                plan.popular
                  ? "border-primary shadow-lg scale-105"
                  : plan.current
                  ? "border-success"
                  : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                  <Crown className="h-3 w-3" />
                  Mais Popular
                </Badge>
              )}
              {plan.current && (
                <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Plano Atual
                </Badge>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.current ? "outline" : "default"}
                  disabled={plan.current}
                >
                  {plan.current ? "Plano Atual" : "Assinar Agora"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Informações de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Pagamento seguro via Stripe</p>
            <p>• Cancele a qualquer momento</p>
            <p>• Upgrade ou downgrade instantâneo</p>
            <p>• Suporte dedicado para assinantes PRO</p>
          </CardContent>
        </Card>
      </div>
  );
};

export default Plan;
