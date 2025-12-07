import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DollarSign, ShoppingCart, Users, Target, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { GoalProgress } from "./GoalsTab";

const formSchema = z.object({
  goal_type: z.enum(['value', 'sales', 'referrals']),
  target_value: z.string().min(1, 'Informe o valor da meta'),
  is_general: z.boolean(),
  product_id: z.string().optional(),
  period_month: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGoal: GoalProgress | null;
  onSuccess: () => void;
}

const goalTypeOptions = [
  { value: 'value', label: 'Valor em R$', icon: DollarSign, description: 'Meta de comissões em reais' },
  { value: 'sales', label: 'Número de Vendas', icon: ShoppingCart, description: 'Quantidade de vendas diretas' },
  { value: 'referrals', label: 'Indicações', icon: Users, description: 'Novos usuários indicados' },
];

// Gerar próximos 12 meses + mês da meta sendo editada (se aplicável)
const getMonthOptions = (editingGoalPeriod?: string) => {
  const options = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = addMonths(now, i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    options.push({
      value: format(start, 'yyyy-MM'),
      label: format(start, "MMMM 'de' yyyy", { locale: ptBR }),
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    });
  }
  
  // Adicionar o mês da meta sendo editada se não estiver na lista
  if (editingGoalPeriod) {
    // Usar parseISO para evitar problemas de timezone
    const editingDate = parseISO(editingGoalPeriod + '-01');
    const editingValue = format(editingDate, 'yyyy-MM');
    
    if (!options.some(opt => opt.value === editingValue)) {
      const start = startOfMonth(editingDate);
      const end = endOfMonth(editingDate);
      
      options.unshift({
        value: format(start, 'yyyy-MM'),
        label: format(start, "MMMM 'de' yyyy", { locale: ptBR }),
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      });
    }
  }
  
  return options;
};

export const CreateGoalDialog = ({ 
  open, 
  onOpenChange, 
  editingGoal, 
  onSuccess 
}: CreateGoalDialogProps) => {
  const isMobile = useIsMobile();
  const { userId } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Gerar opções de mês incluindo o período da meta sendo editada
  const editingPeriod = editingGoal ? format(parseISO(editingGoal.period_start), 'yyyy-MM') : undefined;
  const monthOptions = getMonthOptions(editingPeriod);

  const { data: products } = useQuery({
    queryKey: ['products-for-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, nome, icone_light, icone_dark')
        .order('nome');
      
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goal_type: 'value',
      target_value: '',
      is_general: true,
      product_id: '',
      period_month: format(new Date(), 'yyyy-MM'),
    },
  });

  // Preencher form ao editar
  useEffect(() => {
    if (editingGoal) {
      // Usar parseISO para evitar problemas de timezone
      const periodDate = parseISO(editingGoal.period_start);
      form.reset({
        goal_type: editingGoal.goal_type,
        target_value: editingGoal.target_value.toString(),
        is_general: !editingGoal.product_id,
        product_id: editingGoal.product_id || '',
        period_month: format(periodDate, 'yyyy-MM'),
      });
    } else {
      form.reset({
        goal_type: 'value',
        target_value: '',
        is_general: true,
        product_id: '',
        period_month: format(new Date(), 'yyyy-MM'),
      });
    }
  }, [editingGoal, form, open]);

  const isGeneral = form.watch('is_general');
  const goalType = form.watch('goal_type');

  const onSubmit = async (data: FormData) => {
    if (!userId) return;
    
    setIsSubmitting(true);
    
    try {
      const selectedMonth = monthOptions.find(m => m.value === data.period_month);
      if (!selectedMonth) throw new Error('Mês inválido');

      // Converter valor
      let targetValue: number;
      if (data.goal_type === 'value') {
        // Remove formatação e converte
        const cleanValue = data.target_value.replace(/[^\d,]/g, '').replace(',', '.');
        targetValue = parseFloat(cleanValue);
      } else {
        targetValue = parseInt(data.target_value.replace(/\D/g, ''));
      }

      if (isNaN(targetValue) || targetValue <= 0) {
        toast.error('Informe um valor válido maior que zero');
        setIsSubmitting(false);
        return;
      }

      const goalData = {
        affiliate_id: userId,
        goal_type: data.goal_type,
        target_value: targetValue,
        product_id: data.is_general ? null : data.product_id || null,
        period_start: selectedMonth.start,
        period_end: selectedMonth.end,
        is_active: true,
      };

      if (editingGoal) {
        // Atualizar
        const { error } = await supabase
          .from('affiliate_goals')
          .update(goalData)
          .eq('id', editingGoal.id);

        if (error) throw error;
        toast.success('Meta atualizada com sucesso!');
      } else {
        // Criar
        const { error } = await supabase
          .from('affiliate_goals')
          .insert(goalData);

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe uma meta deste tipo para este período');
            setIsSubmitting(false);
            return;
          }
          throw error;
        }
        toast.success('Meta criada com sucesso!');
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const Content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo de meta */}
        <FormField
          control={form.control}
          name="goal_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Meta</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {goalTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = field.value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        isSelected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mx-auto mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className={`text-xs font-medium ${isSelected ? 'text-primary' : ''}`}>
                        {option.label}
                      </p>
                    </button>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Valor da meta */}
        <FormField
          control={form.control}
          name="target_value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {goalType === 'value' ? 'Valor da Meta (R$)' : 
                 goalType === 'sales' ? 'Quantidade de Vendas' : 
                 'Quantidade de Indicações'}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={goalType === 'value' ? 'Ex: 5000' : 'Ex: 10'}
                  type={goalType === 'value' ? 'text' : 'number'}
                  min={1}
                />
              </FormControl>
              <FormDescription>
                {goalType === 'value' 
                  ? 'Defina quanto quer ganhar em comissões'
                  : goalType === 'sales'
                  ? 'Quantas vendas diretas você quer fazer'
                  : 'Quantos novos usuários quer indicar'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Toggle: Geral ou Por Produto */}
        <FormField
          control={form.control}
          name="is_general"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Meta Geral</FormLabel>
                <FormDescription>
                  {field.value 
                    ? 'Considera todos os produtos' 
                    : 'Específica para um produto'}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Seletor de produto (quando não é geral) */}
        {!isGeneral && (
          <FormField
            control={form.control}
            name="product_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Produto</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex items-center gap-2">
                          {product.icone_light && (
                            <img 
                              src={product.icone_light} 
                              alt="" 
                              className="h-4 w-4 rounded" 
                            />
                          )}
                          <span>{product.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Período */}
        <FormField
          control={form.control}
          name="period_month"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Período</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      <span className="capitalize">{month.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-1 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                {editingGoal ? 'Atualizar Meta' : 'Criar Meta'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editingGoal ? 'Editar Meta' : 'Nova Meta'}
            </DrawerTitle>
            <DrawerDescription>
              {editingGoal 
                ? 'Atualize os dados da sua meta'
                : 'Defina uma nova meta para acompanhar seu progresso'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-8">
            {Content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingGoal ? 'Editar Meta' : 'Nova Meta'}
          </DialogTitle>
          <DialogDescription>
            {editingGoal 
              ? 'Atualize os dados da sua meta'
              : 'Defina uma nova meta para acompanhar seu progresso'}
          </DialogDescription>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
};
