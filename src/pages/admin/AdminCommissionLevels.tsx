import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Layers, Save, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CommissionLevel {
  id: string;
  product_id: string;
  plan_type: string;
  level: number;
  percentage: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

interface Product {
  id: string;
  nome: string;
}

const PLAN_TYPES = [
  { value: "FREE", label: "FREE" },
  { value: "PRO", label: "PRO" },
];

const AdminCommissionLevels = () => {
  const [levels, setLevels] = useState<CommissionLevel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedPlanType, setSelectedPlanType] = useState<string>("PRO");
  const [maxLevels, setMaxLevels] = useState<string>("3");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLevel, setNewLevel] = useState({
    level: 0,
    percentage: 0,
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProductId && selectedPlanType) {
      loadLevels();
    }
  }, [selectedProductId, selectedPlanType]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome")
        .order("nome");

      if (error) throw error;
      
      const productsData = data || [];
      setProducts(productsData);
      
      // Auto-selecionar o primeiro produto se existir
      if (productsData.length > 0 && !selectedProductId) {
        setSelectedProductId(productsData[0].id);
      }
    } catch (error: any) {
      console.error("Erro ao carregar produtos:", error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadLevels = async () => {
    if (!selectedProductId || !selectedPlanType) return;

    try {
      const { data: levelsData, error: levelsError } = await supabase
        .from("product_commission_levels" as any)
        .select("*")
        .eq("product_id", selectedProductId)
        .eq("plan_type", selectedPlanType)
        .order("level", { ascending: true });

      if (levelsError) throw levelsError;
      setLevels((levelsData as any) || []);
    } catch (error: any) {
      console.error("Erro ao carregar níveis:", error);
      toast({
        title: "Erro ao carregar níveis",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Carregar produtos primeiro
      await loadProducts();

      // Carregar limite máximo
      const { data: settingData, error: settingError } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "max_affiliate_levels")
        .single();

      if (settingError && settingError.code !== "PGRST116") throw settingError;
      if (settingData) setMaxLevels(settingData.value);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMaxLevels = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          key: "max_affiliate_levels",
          value: maxLevels,
          description: "Número máximo de níveis permitidos na hierarquia de afiliados",
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Limite máximo de níveis atualizado!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLevel = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from("product_commission_levels" as any)
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      setLevels(
        levels.map((level) =>
          level.id === id ? { ...level, [field]: value } : level
        )
      );

      toast({
        title: "Sucesso",
        description: "Nível atualizado!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddLevel = async () => {
    try {
      if (!selectedProductId || !selectedPlanType) {
        toast({
          title: "Erro",
          description: "Selecione um produto e tipo primeiro",
          variant: "destructive",
        });
        return;
      }

      if (newLevel.level < 1 || newLevel.level > 10) {
        toast({
          title: "Erro",
          description: "O nível deve ser entre 1 e 10",
          variant: "destructive",
        });
        return;
      }

      if (newLevel.percentage < 0 || newLevel.percentage > 100) {
        toast({
          title: "Erro",
          description: "A porcentagem deve ser entre 0 e 100",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("product_commission_levels" as any).insert({
        product_id: selectedProductId,
        plan_type: selectedPlanType,
        level: newLevel.level,
        percentage: newLevel.percentage,
        description: newLevel.description,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Novo nível adicionado!",
      });

      setIsDialogOpen(false);
      setNewLevel({ level: 0, percentage: 0, description: "" });
      loadLevels();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteLevel = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este nível?")) return;

    try {
      const { error } = await supabase
        .from("product_commission_levels" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      setLevels(levels.filter((level) => level.id !== id));

      toast({
        title: "Sucesso",
        description: "Nível excluído!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  if (isLoading) {
    return (
      <div className="space-y-3 md:space-y-6 p-2 md:p-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Níveis de Comissão</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Configure os percentuais de comissão por produto e tipo
          </p>
        </div>
        <TableSkeleton columns={5} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6 p-2 md:p-6 lg:p-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Níveis de Comissão</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Configure os percentuais de comissão por produto e tipo (FREE/PRO)
        </p>
      </div>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Layers className="h-4 w-4 md:h-5 md:w-5" />
            Limite Máximo de Níveis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
            <div className="flex-1">
              <Label htmlFor="maxLevels" className="text-sm">Níveis Permitidos (configuração global)</Label>
              <Input
                id="maxLevels"
                type="number"
                min="1"
                max="10"
                value={maxLevels}
                onChange={(e) => setMaxLevels(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveMaxLevels} disabled={isSaving} className="w-full md:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-select" className="text-sm">Produto</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="product-select">
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type-select" className="text-sm">Tipo do Plano</Label>
              <Select value={selectedPlanType} onValueChange={setSelectedPlanType}>
                <SelectTrigger id="type-select">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProductId && selectedPlanType && (
        <Card className="bg-transparent border-0 shadow-none lg:bg-card lg:border lg:shadow-sm rounded-none lg:rounded-lg">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 !p-0 !pb-4 md:!pt-4 lg:!p-6">
          <div>
            <CardTitle className="text-base md:text-lg">
              Percentuais por Nível
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedProduct?.nome} - {selectedPlanType}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Nível
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] md:w-full max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Nível</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Produto: <strong>{selectedProduct?.nome}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tipo: <strong>{selectedPlanType}</strong>
                  </p>
                </div>
                <div>
                  <Label htmlFor="newLevel" className="text-sm">Nível (1-10)</Label>
                  <Input
                    id="newLevel"
                    type="number"
                    min="1"
                    max="10"
                    value={newLevel.level || ""}
                    onChange={(e) =>
                      setNewLevel({ ...newLevel, level: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="newPercentage" className="text-sm">Porcentagem (0-100)</Label>
                  <Input
                    id="newPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={newLevel.percentage || ""}
                    onChange={(e) =>
                      setNewLevel({
                        ...newLevel,
                        percentage: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="newDescription" className="text-sm">Descrição</Label>
                  <Textarea
                    id="newDescription"
                    value={newLevel.description}
                    onChange={(e) =>
                      setNewLevel({ ...newLevel, description: e.target.value })
                    }
                    placeholder="Descrição do nível..."
                  />
                </div>
                <Button onClick={handleAddLevel} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="!p-0 lg:!p-6">
          {/* Layout Mobile - Cards */}
          <div className="lg:hidden space-y-2">
            {levels.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                Nenhum nível cadastrado para {selectedProduct?.nome} - {selectedPlanType}
              </div>
            ) : (
              levels.map((level) => (
                <Card key={level.id} className="p-3 lg:p-3 bg-card lg:bg-card border lg:border shadow-sm lg:shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base">Nível {level.level}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteLevel(level.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor={`percentage-${level.id}`} className="text-xs text-muted-foreground">
                          Porcentagem
                        </Label>
                        <Input
                          id={`percentage-${level.id}`}
                          type="number"
                          min="0"
                          max="100"
                          value={level.percentage}
                          onChange={(e) =>
                            handleUpdateLevel(
                              level.id,
                              "percentage",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`description-${level.id}`} className="text-xs text-muted-foreground">
                          Descrição
                        </Label>
                        <Input
                          id={`description-${level.id}`}
                          value={level.description || ""}
                          onChange={(e) =>
                            handleUpdateLevel(
                              level.id,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Descrição..."
                        />
                      </div>
                      
                      <div className="flex items-center justify-between pt-1">
                        <Label htmlFor={`active-${level.id}`} className="text-xs text-muted-foreground">
                          Ativo
                        </Label>
                        <Switch
                          id={`active-${level.id}`}
                          checked={level.is_active}
                          onCheckedChange={(checked) =>
                            handleUpdateLevel(level.id, "is_active", checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Layout Desktop - Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Nível</TableHead>
                  <TableHead className="w-32">Porcentagem</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24">Ativo</TableHead>
                  <TableHead className="w-16 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum nível cadastrado para {selectedProduct?.nome} - {selectedPlanType}
                    </TableCell>
                  </TableRow>
                ) : (
                  levels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">N{level.level}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={level.percentage}
                          onChange={(e) =>
                            handleUpdateLevel(
                              level.id,
                              "percentage",
                              Number(e.target.value)
                            )
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={level.description || ""}
                          onChange={(e) =>
                            handleUpdateLevel(
                              level.id,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Descrição..."
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={level.is_active}
                          onCheckedChange={(checked) =>
                            handleUpdateLevel(level.id, "is_active", checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLevel(level.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default AdminCommissionLevels;
