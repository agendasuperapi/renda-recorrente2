import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, FilterX } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AffiliatesFilterCardProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  planFilter: string;
  onPlanFilterChange: (value: string) => void;
  periodFilter: string;
  onPeriodFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  plansData?: string[];
  onRefresh: () => void;
  onResetFilters: () => void;
}

export function AffiliatesFilterCard({
  searchTerm,
  onSearchChange,
  planFilter,
  onPlanFilterChange,
  periodFilter,
  onPeriodFilterChange,
  statusFilter,
  onStatusFilterChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  itemsPerPage,
  onItemsPerPageChange,
  plansData,
  onRefresh,
  onResetFilters,
}: AffiliatesFilterCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium">Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou username..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filtros em grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select value={planFilter} onValueChange={onPlanFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              {plansData?.map(plan => (
                <SelectItem key={plan} value={plan}>{plan}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={onPeriodFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="annual">Anual</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="trialing">Em teste</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={itemsPerPage.toString()} 
            onValueChange={(value) => onItemsPerPageChange(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Itens por página" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="20">20 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Data início</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Data fim</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            <FilterX className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
