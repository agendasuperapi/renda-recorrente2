import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { 
  User, Mail, Phone, Calendar, MapPin, CreditCard, 
  Hash, Award, Save, X, Package, Wallet, TrendingUp
} from "lucide-react";

interface AffiliateDetailsDialogProps {
  affiliateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AffiliateProfile {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  cpf: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  created_at: string | null;
  withdrawal_day: number | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  pix_type: string | null;
  pix_key: string | null;
  affiliate_code: string | null;
  referrer_code: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
}

const WEEKDAYS = [
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export function AffiliateDetailsDialog({ affiliateId, open, onOpenChange }: AffiliateDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [withdrawalDay, setWithdrawalDay] = useState<number | null>(null);
  const [isEditingWithdrawal, setIsEditingWithdrawal] = useState(false);

  // Query para buscar perfil completo
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["affiliate-profile", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", affiliateId)
        .single();
      
      if (error) throw error;
      setWithdrawalDay(data.withdrawal_day);
      return data as AffiliateProfile;
    },
    enabled: !!affiliateId && open,
  });

  // Query para buscar subscription/plano
  const { data: subscription } = useQuery({
    queryKey: ["affiliate-subscription", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("user_id", affiliateId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!affiliateId && open,
  });

  // Query para buscar histórico de pagamentos
  const { data: payments } = useQuery({
    queryKey: ["affiliate-payments", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*, plans(name)")
        .eq("user_id", affiliateId)
        .order("payment_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!affiliateId && open,
  });

  // Query para buscar comissões
  const { data: commissions } = useQuery({
    queryKey: ["affiliate-commissions-earned", affiliateId],
    queryFn: async () => {
      if (!affiliateId) return [];
      const { data, error } = await supabase
        .from("commissions")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!affiliateId && open,
  });

  // Mutation para atualizar dia de saque
  const updateWithdrawalDayMutation = useMutation({
    mutationFn: async (newDay: number) => {
      if (!affiliateId) throw new Error("Affiliate ID not found");
      
      const { error } = await supabase
        .from("profiles")
        .update({ withdrawal_day: newDay })
        .eq("id", affiliateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Dia de saque atualizado",
        description: "O dia de saque foi alterado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["affiliate-profile", affiliateId] });
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      setIsEditingWithdrawal(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

   const handleSaveWithdrawalDay = () => {
     if (withdrawalDay !== null && withdrawalDay !== undefined) {
       updateWithdrawalDayMutation.mutate(withdrawalDay);
     }
   };

  if (!affiliateId) return null;

  const getInitials = (name: string) => {
    return name?.substring(0, 2).toUpperCase() || "AF";
  };

  const getWeekdayLabel = (day: number | null) => {
    if (!day) return "-";
    return WEEKDAYS.find(w => w.value === day)?.label || "-";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-none p-0 lg:p-6 gap-0 fixed bottom-0 left-0 right-0 top-auto w-full translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none xl:left-[50%] xl:top-[50%] xl:bottom-auto xl:translate-x-[-50%] xl:translate-y-[-50%] xl:max-w-4xl xl:rounded-lg">
        {/* Handle bar para indicar que é um bottom sheet (apenas mobile/tablet) */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>
        
        <div className="px-6 pt-2 lg:pt-0">
          <DialogHeader>
            <DialogTitle>Detalhes do Afiliado</DialogTitle>
          </DialogHeader>
        </div>

        {loadingProfile ? (
          <div className="flex items-center justify-center py-8 px-6">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : profile ? (
          <ScrollArea className="h-[calc(90vh-120px)] px-6 lg:px-0">
            <div className="space-y-6 pb-6">
              {/* Header com Avatar e Info Básica */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 pb-4 border-b">
                <Avatar className="h-20 w-20">
                  {profile.avatar_url && (
                    <AvatarImage src={profile.avatar_url} alt={profile.name} />
                  )}
                  <AvatarFallback className="text-2xl">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl md:text-2xl font-bold">{profile.name}</h3>
                  <p className="text-muted-foreground">{profile.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                    {subscription && (
                      <Badge variant="default">
                        {(subscription.plans as any)?.name || "Sem plano"}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      Cadastrado em {profile.created_at ? format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="personal" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dados Pessoais
                  </TabsTrigger>
                  <TabsTrigger value="plan" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Plano
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Pagamentos
                  </TabsTrigger>
                  <TabsTrigger value="commissions" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Comissões
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Informações Pessoais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Nome Completo</Label>
                        <p className="font-medium">{profile.name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Username</Label>
                        <p className="font-medium">{profile.username || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium">{profile.email || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Telefone</Label>
                        <p className="font-medium">{profile.phone || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">CPF</Label>
                        <p className="font-medium">{profile.cpf || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Data de Nascimento</Label>
                        <p className="font-medium">
                          {profile.birth_date ? format(new Date(profile.birth_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Endereço
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">Rua</Label>
                        <p className="font-medium">{profile.street || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Número</Label>
                        <p className="font-medium">{profile.number || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Complemento</Label>
                        <p className="font-medium">{profile.complement || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Bairro</Label>
                        <p className="font-medium">{profile.neighborhood || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Cidade</Label>
                        <p className="font-medium">{profile.city || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Estado</Label>
                        <p className="font-medium">{profile.state || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">CEP</Label>
                        <p className="font-medium">{profile.cep || "-"}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Dados Bancários e Afiliação
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Tipo PIX</Label>
                        <p className="font-medium">{profile.pix_type || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Chave PIX</Label>
                        <p className="font-medium">{profile.pix_key || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Código de Afiliado</Label>
                        <p className="font-medium">{profile.affiliate_code || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Código de Referência</Label>
                        <p className="font-medium">{profile.referrer_code || "-"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Dia de Saque
                        </Label>
                        {isEditingWithdrawal ? (
                          <div className="flex gap-2 mt-2">
                            <select
                              value={withdrawalDay ?? ""}
                              onChange={(e) => setWithdrawalDay(Number(e.target.value))}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">Selecione...</option>
                              {WEEKDAYS.map((day) => (
                                <option key={day.value} value={day.value}>
                                  {day.label}
                                </option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              onClick={handleSaveWithdrawalDay}
                              disabled={updateWithdrawalDayMutation.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsEditingWithdrawal(false);
                                setWithdrawalDay(profile.withdrawal_day);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            <p className="font-medium">{getWeekdayLabel(profile.withdrawal_day)}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsEditingWithdrawal(true)}
                            >
                              Editar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Redes Sociais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label className="text-muted-foreground">Instagram</Label>
                        <p className="font-medium">{profile.instagram || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Facebook</Label>
                        <p className="font-medium">{profile.facebook || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">TikTok</Label>
                        <p className="font-medium">{profile.tiktok || "-"}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="plan" className="space-y-4">
                  {subscription ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Plano Atual</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label className="text-muted-foreground">Plano</Label>
                          <p className="font-medium text-lg">{(subscription.plans as any)?.name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Status</Label>
                          <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                            {subscription.status === "active" ? "Ativo" : subscription.status}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Início do Período</Label>
                          <p className="font-medium">
                            {subscription.current_period_start 
                              ? format(new Date(subscription.current_period_start), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Fim do Período</Label>
                          <p className="font-medium">
                            {subscription.current_period_end 
                              ? format(new Date(subscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Ambiente</Label>
                          <Badge variant="outline">{subscription.environment}</Badge>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Cancelar no fim do período</Label>
                          <p className="font-medium">{subscription.cancel_at_period_end ? "Sim" : "Não"}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        Nenhum plano ativo encontrado
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="payments">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Pagamentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {payments && payments.length > 0 ? (
                        <>
                          {/* Desktop: Tabela */}
                          <div className="hidden md:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Plano</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Ambiente</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {payments.map((payment) => (
                                  <TableRow key={payment.id}>
                                    <TableCell>
                                      {payment.payment_date 
                                        ? format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                        : "-"}
                                    </TableCell>
                                    <TableCell>{(payment.plans as any)?.name || "-"}</TableCell>
                                    <TableCell>
                                      {new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: payment.currency || "BRL",
                                      }).format(payment.amount)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                                        {payment.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{payment.environment}</Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Mobile/Tablet: Cards */}
                          <div className="md:hidden space-y-4">
                            {payments.map((payment) => (
                              <Card key={payment.id} className="border-border/50">
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm font-medium">
                                        {payment.payment_date 
                                          ? format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: ptBR })
                                          : "-"}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {payment.payment_date 
                                        ? format(new Date(payment.payment_date), "HH:mm", { locale: ptBR })
                                        : ""}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Plano</Label>
                                      <p className="text-sm font-medium">{(payment.plans as any)?.name || "-"}</p>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Valor</Label>
                                      <p className="text-sm font-semibold text-primary">
                                        {new Intl.NumberFormat("pt-BR", {
                                          style: "currency",
                                          currency: payment.currency || "BRL",
                                        }).format(payment.amount)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-muted-foreground">Status:</Label>
                                      <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                                        {payment.status}
                                      </Badge>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {payment.environment}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum pagamento encontrado
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="commissions">
                  <Card>
                    <CardHeader>
                      <CardTitle>Comissões Recebidas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {commissions && commissions.length > 0 ? (
                        <>
                          {/* Desktop: Tabela */}
                          <div className="hidden md:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Nível</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {commissions.map((commission) => (
                                  <TableRow key={commission.id}>
                                    <TableCell>
                                      {commission.created_at 
                                        ? format(new Date(commission.created_at), "dd/MM/yyyy", { locale: ptBR })
                                        : "-"}
                                    </TableCell>
                                    <TableCell className="capitalize">
                                      {commission.commission_type.replace("_", " ")}
                                    </TableCell>
                                    <TableCell>
                                      {new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      }).format(commission.amount)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={
                                          commission.status === "available" ? "default" :
                                          commission.status === "pending" ? "secondary" :
                                          commission.status === "paid" ? "default" :
                                          "secondary"
                                        }
                                      >
                                        {commission.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>N{commission.level || 1}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Mobile/Tablet: Cards */}
                          <div className="md:hidden space-y-4">
                            {commissions.map((commission) => (
                              <Card key={commission.id} className="border-border/50">
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm font-medium">
                                        {commission.created_at 
                                          ? format(new Date(commission.created_at), "dd/MM/yyyy", { locale: ptBR })
                                          : "-"}
                                      </span>
                                    </div>
                                    <Badge 
                                      variant={
                                        commission.status === "available" ? "default" :
                                        commission.status === "pending" ? "secondary" :
                                        commission.status === "paid" ? "default" :
                                        "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {commission.status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                                      <p className="text-sm font-medium capitalize">
                                        {commission.commission_type.replace("_", " ")}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Valor</Label>
                                      <p className="text-sm font-semibold text-primary">
                                        {new Intl.NumberFormat("pt-BR", {
                                          style: "currency",
                                          currency: "BRL",
                                        }).format(commission.amount)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center pt-2">
                                    <div className="flex items-center gap-2">
                                      <Award className="h-4 w-4 text-muted-foreground" />
                                      <Label className="text-xs text-muted-foreground">Nível:</Label>
                                      <Badge variant="outline" className="text-xs">
                                        N{commission.level || 1}
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhuma comissão encontrada
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center text-muted-foreground py-8 px-6">
            Afiliado não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
