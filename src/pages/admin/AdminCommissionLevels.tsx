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
import { Layers, Plus, Trash2, Package } from "lucide-react";
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
  icone_light: string | null;
  icone_dark: string | null;
}

interface GroupedLevel {
  level: number;
  free: CommissionLevel | null;
  pro: CommissionLevel | null;
  description: string;
  is_active: boolean;
}

const AdminCommissionLevels = () => {
  const [allLevels, setAllLevels] = useState<CommissionLevel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingLevel, setIsAddingLevel] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome, icone_light, icone_dark")
        .order("nome");

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar produtos:", error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadAllLevels = async () => {
    try {
      const { data: levelsData, error: levelsError } = await supabase
        .from("product_commission_levels" as any)
        .select("*")
        .order("level", { ascending: true });

      if (levelsError) throw levelsError;
      setAllLevels((levelsData as any) || []);
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
      await Promise.all([loadProducts(), loadAllLevels()]);
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

  const handleUpdateLevel = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from("product_commission_levels" as any)
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      setAllLevels(
        allLevels.map((level) =>
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

  const handleToggleActive = async (productId: string, grouped: GroupedLevel, checked: boolean) => {
    try {
      const idsToUpdate = [grouped.free?.id, grouped.pro?.id].filter(Boolean) as string[];
      
      for (const id of idsToUpdate) {
        const { error } = await supabase
          .from("product_commission_levels" as any)
          .update({ is_active: checked })
          .eq("id", id);
        if (error) throw error;
      }

      setAllLevels(
        allLevels.map((level) => {
          if (level.level === grouped.level && level.product_id === productId) {
            return { ...level, is_active: checked };
          }
          return level;
        })
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

  const handleUpdateDescription = async (productId: string, grouped: GroupedLevel, description: string) => {
    try {
      const idsToUpdate = [grouped.free?.id, grouped.pro?.id].filter(Boolean) as string[];
      
      for (const id of idsToUpdate) {
        const { error } = await supabase
          .from("product_commission_levels" as any)
          .update({ description })
          .eq("id", id);
        if (error) throw error;
      }

      setAllLevels(
        allLevels.map((level) => {
          if (level.level === grouped.level && level.product_id === productId) {
            return { ...level, description };
          }
          return level;
        })
      );

      toast({
        title: "Sucesso",
        description: "Descrição atualizada!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddLevel = async (productId: string) => {
    try {
      setIsAddingLevel(productId);

      const productLevels = allLevels.filter(l => l.product_id === productId);
      const existingLevelNumbers = productLevels.map(l => l.level);
      const nextLevel = existingLevelNumbers.length > 0 
        ? Math.max(...existingLevelNumbers) + 1 
        : 1;

      if (nextLevel > 10) {
        toast({
          title: "Erro",
          description: "Máximo de 10 níveis atingido",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("product_commission_levels" as any).insert([
        {
          product_id: productId,
          plan_type: "FREE",
          level: nextLevel,
          percentage: 0,
          description: `Nível ${nextLevel}`,
        },
        {
          product_id: productId,
          plan_type: "PRO",
          level: nextLevel,
          percentage: 0,
          description: `Nível ${nextLevel}`,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Nível ${nextLevel} adicionado!`,
      });

      loadAllLevels();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAddingLevel(null);
    }
  };

  const handleDeleteLevel = async (productId: string, levelNumber: number) => {
    if (!confirm(`Tem certeza que deseja excluir o nível ${levelNumber}? Isso removerá as configurações FREE e PRO.`)) return;

    try {
      const { error } = await supabase
        .from("product_commission_levels" as any)
        .delete()
        .eq("product_id", productId)
        .eq("level", levelNumber);

      if (error) throw error;

      setAllLevels(allLevels.filter((level) => !(level.level === levelNumber && level.product_id === productId)));

      toast({
        title: "Sucesso",
        description: `Nível ${levelNumber} excluído!`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getGroupedLevelsForProduct = (productId: string): GroupedLevel[] => {
    const productLevels = allLevels.filter(l => l.product_id === productId);
    const grouped: Record<number, GroupedLevel> = {};
    
    productLevels.forEach((level) => {
      if (!grouped[level.level]) {
        grouped[level.level] = {
          level: level.level,
          free: null,
          pro: null,
          description: level.description || "",
          is_active: level.is_active,
        };
      }
      
      if (level.plan_type === "FREE") {
        grouped[level.level].free = level;
      } else if (level.plan_type === "PRO") {
        grouped[level.level].pro = level;
      }
      
      if (level.description) {
        grouped[level.level].description = level.description;
      }
      grouped[level.level].is_active = level.is_active;
    });
    
    return Object.values(grouped).sort((a, b) => a.level - b.level);
  };

  const productsToShow = selectedProductId === "all" 
    ? products 
    : products.filter(p => p.id === selectedProductId);

  if (isLoading) {
    return (
      <div className="space-y-3 md:space-y-6 p-2 md:p-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Níveis de Comissão</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Configure os percentuais de comissão por produto
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
          Configure os percentuais de comissão por produto (FREE e PRO)
        </p>
      </div>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Package className="h-4 w-4 md:h-5 md:w-5" />
            Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um produto..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Todos os produtos
                </span>
              </SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  <span className="flex items-center gap-2">
                    {product.icone_light ? (
                      <img 
                        src={product.icone_light} 
                        alt="" 
                        className="h-4 w-4 rounded object-contain dark:hidden" 
                      />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground dark:hidden" />
                    )}
                    {product.icone_dark ? (
                      <img 
                        src={product.icone_dark} 
                        alt="" 
                        className="h-4 w-4 rounded object-contain hidden dark:block" 
                      />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground hidden dark:block" />
                    )}
                    {product.nome}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {productsToShow.map((product) => {
        const groupedLevels = getGroupedLevelsForProduct(product.id);
        
        return (
          <Card key={product.id} className="bg-transparent border-0 shadow-none lg:bg-card lg:border lg:shadow-sm rounded-none lg:rounded-lg">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 !p-0 !pb-4 md:!pt-4 lg:!p-6">
              <div className="flex items-center gap-3">
                {product.icone_light && (
                  <img 
                    src={product.icone_light} 
                    alt="" 
                    className="h-8 w-8 rounded object-contain dark:hidden" 
                  />
                )}
                {product.icone_dark && (
                  <img 
                    src={product.icone_dark} 
                    alt="" 
                    className="h-8 w-8 rounded object-contain hidden dark:block" 
                  />
                )}
                {!product.icone_light && !product.icone_dark && (
                  <Package className="h-8 w-8 text-muted-foreground" />
                )}
                <div>
                  <CardTitle className="text-base md:text-lg">
                    {product.nome}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {groupedLevels.length} nível(is) configurado(s)
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => handleAddLevel(product.id)} 
                disabled={isAddingLevel === product.id}
                className="w-full md:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingLevel === product.id ? "Adicionando..." : "Adicionar Nível"}
              </Button>
            </CardHeader>
            <CardContent className="!p-0 lg:!p-6">
              {/* Layout Mobile - Cards */}
              <div className="lg:hidden space-y-3">
                {groupedLevels.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    Nenhum nível cadastrado para {product.nome}
                  </div>
                ) : (
                  groupedLevels.map((grouped) => (
                    <Card key={grouped.level} className="p-3 bg-card border shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-base">Nível {grouped.level}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteLevel(product.id, grouped.level)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">FREE (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={grouped.free?.percentage ?? 0}
                              onChange={(e) => {
                                if (grouped.free) {
                                  handleUpdateLevel(grouped.free.id, "percentage", Number(e.target.value));
                                }
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">PRO (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={grouped.pro?.percentage ?? 0}
                              onChange={(e) => {
                                if (grouped.pro) {
                                  handleUpdateLevel(grouped.pro.id, "percentage", Number(e.target.value));
                                }
                              }}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-muted-foreground">Descrição</Label>
                          <Input
                            value={grouped.description}
                            onChange={(e) => handleUpdateDescription(product.id, grouped, e.target.value)}
                            placeholder="Descrição..."
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between pt-1">
                          <Label className="text-xs text-muted-foreground">Ativo</Label>
                          <Switch
                            checked={grouped.is_active}
                            onCheckedChange={(checked) => handleToggleActive(product.id, grouped, checked)}
                          />
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
                      <TableHead className="w-28">FREE (%)</TableHead>
                      <TableHead className="w-28">PRO (%)</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-24">Ativo</TableHead>
                      <TableHead className="w-16 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedLevels.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum nível cadastrado para {product.nome}
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupedLevels.map((grouped) => (
                        <TableRow key={grouped.level}>
                          <TableCell className="font-medium">N{grouped.level}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={grouped.free?.percentage ?? 0}
                              onChange={(e) => {
                                if (grouped.free) {
                                  handleUpdateLevel(grouped.free.id, "percentage", Number(e.target.value));
                                }
                              }}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={grouped.pro?.percentage ?? 0}
                              onChange={(e) => {
                                if (grouped.pro) {
                                  handleUpdateLevel(grouped.pro.id, "percentage", Number(e.target.value));
                                }
                              }}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={grouped.description}
                              onChange={(e) => handleUpdateDescription(product.id, grouped, e.target.value)}
                              placeholder="Descrição..."
                            />
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={grouped.is_active}
                              onCheckedChange={(checked) => handleToggleActive(product.id, grouped, checked)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLevel(product.id, grouped.level)}
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
        );
      })}
    </div>
  );
};

export default AdminCommissionLevels;
