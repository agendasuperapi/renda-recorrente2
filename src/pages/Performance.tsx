import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAuth } from "@/hooks/useAuth";

const EmptyChartState = ({ icon: Icon, message }: { icon: any; message: string }) => (
  <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
    <Icon className="w-12 h-12 mb-3 opacity-30" />
    <p className="text-sm">{message}</p>
  </div>
);

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

type PeriodType = 'day' | 'month';

const Performance = () => {
  const { userId } = useAuth();
  const [periodType, setPeriodType] = useState<PeriodType>('day');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [commissionProductFilter, setCommissionProductFilter] = useState<string>('all');
  const [salesProductFilter, setSalesProductFilter] = useState<string>('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Query para dados de comissões e vendas por período
  const { data: commissionsData, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ['performance-commissions', userId, startDate, endDate],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('commissions')
        .select('*, products(nome, icone_light, icone_dark)')
        .eq('affiliate_id', userId)
        .not('unified_payment_id', 'is', null)
        .gte('payment_date', format(startDate, 'yyyy-MM-dd'))
        .lte('payment_date', format(endDate, 'yyyy-MM-dd'))
        .order('payment_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Extrair lista única de produtos
  const availableProducts = commissionsData?.reduce((acc: any[], curr: any) => {
    const productId = curr.product_id;
    const productName = curr.products?.nome || 'Sem produto';
    if (!acc.find(p => p.id === productId)) {
      acc.push({ id: productId, name: productName });
    }
    return acc;
  }, []) || [];

  // Agregar dados para gráficos
  const commissionChartData = commissionsData
    ?.filter(curr => commissionProductFilter === 'all' || curr.product_id === commissionProductFilter)
    ?.reduce((acc: any[], curr: any) => {
      const paymentDate = new Date(curr.payment_date);
      let dateKey: string;
      
      if (periodType === 'day') {
        dateKey = paymentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      } else {
        // Agrupar por mês
        const monthStart = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1);
        dateKey = monthStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      }
      
      const existing = acc.find(item => item.date === dateKey);
      if (existing) {
        existing.value += Number(curr.amount || 0);
      } else {
        acc.push({ date: dateKey, value: Number(curr.amount || 0) });
      }
      return acc;
    }, []) || [];

  // Agrupar vendas únicas por data
  const salesChartData = commissionsData
    ?.filter(curr => salesProductFilter === 'all' || curr.product_id === salesProductFilter)
    ?.reduce((acc: any[], curr: any) => {
      const paymentDate = new Date(curr.payment_date);
      let dateKey: string;
      
      if (periodType === 'day') {
        dateKey = paymentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      } else {
        const monthStart = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1);
        dateKey = monthStart.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      }
      
      const existing = acc.find(item => item.date === dateKey);
      if (existing) {
        // Adicionar apenas se for um pagamento único
        if (!existing.payments.includes(curr.unified_payment_id)) {
          existing.value += 1;
          existing.payments.push(curr.unified_payment_id);
        }
      } else {
        acc.push({ 
          date: dateKey, 
          value: 1,
          payments: [curr.unified_payment_id]
        });
      }
      return acc;
    }, []) || [];

  // Remover array de payments do resultado final
  const salesChartDataClean = salesChartData.map(({ date, value }) => ({ date, value }));

  // Agregar por produto
  const productAggregation = commissionsData?.reduce((acc: any, curr: any) => {
    const productName = curr.products?.nome || 'Sem produto';
    const productId = curr.product_id || 'no-product';
    
    if (!acc[productId]) {
      acc[productId] = {
        name: productName,
        commission: 0,
        sales: new Set(),
      };
    }
    
    acc[productId].commission += Number(curr.amount || 0);
    if (curr.unified_payment_id) {
      acc[productId].sales.add(curr.unified_payment_id);
    }
    
    return acc;
  }, {}) || {};

  const commissionByProductData = Object.values(productAggregation).map((item: any) => ({
    name: item.name,
    value: item.commission,
  }));

  const salesByProductData = Object.values(productAggregation).map((item: any) => ({
    name: item.name,
    value: item.sales.size,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Desempenho</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Análise detalhada das suas comissões e vendas</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Período</label>
              <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Por Dia</SelectItem>
                  <SelectItem value="month">Por Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-0">
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-xs sm:text-sm">
                    <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-0">
              <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 block">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-xs sm:text-sm">
                    <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Comissões por período */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Comissões {periodType === 'day' ? 'Diárias' : 'Mensais'}</CardTitle>
            <div className="pt-2">
              <Select value={commissionProductFilter} onValueChange={setCommissionProductFilter}>
                <SelectTrigger className="w-full text-xs sm:text-sm">
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {commissionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={commissionChartData}>
                  <XAxis 
                    dataKey="date" 
                    className="text-[10px] sm:text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-[10px] sm:text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [formatCurrency(value), 'Comissão']}
                  />
                  <Bar dataKey="value" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState icon={BarChart3} message="Nenhuma comissão no período selecionado" />
            )}
          </CardContent>
        </Card>

        {/* Quantidade de vendas por período */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Vendas {periodType === 'day' ? 'Diárias' : 'Mensais'}</CardTitle>
            <div className="pt-2">
              <Select value={salesProductFilter} onValueChange={setSalesProductFilter}>
                <SelectTrigger className="w-full text-xs sm:text-sm">
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {salesChartDataClean.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesChartDataClean}>
                  <XAxis 
                    dataKey="date" 
                    className="text-[10px] sm:text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-[10px] sm:text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [value, 'Vendas']}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState icon={BarChart3} message="Nenhuma venda no período selecionado" />
            )}
          </CardContent>
        </Card>

        {/* Comissões por produto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Comissões por Produto</CardTitle>
          </CardHeader>
          <CardContent>
            {commissionByProductData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={commissionByProductData}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {commissionByProductData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry: any) => `${value}: ${formatCurrency(entry.payload.value)}`}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState icon={PieChartIcon} message="Nenhuma comissão por produto encontrada" />
            )}
          </CardContent>
        </Card>

        {/* Quantidade por produto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Vendas por Produto</CardTitle>
          </CardHeader>
          <CardContent>
            {salesByProductData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={salesByProductData}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {salesByProductData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry: any) => `${value}: ${entry.payload.value} vendas`}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState icon={PieChartIcon} message="Nenhuma venda por produto encontrada" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Performance;
