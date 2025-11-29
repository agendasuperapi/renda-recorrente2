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

interface CommissionLevel {
  id: string;
  level: number;
  percentage: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

const AdminCommissionLevels = () => {
  const [levels, setLevels] = useState<CommissionLevel[]>([]);
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

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Carregar níveis de comissão
      const { data: levelsData, error: levelsError } = await supabase
        .from("commission_levels" as any)
        .select("*")
        .order("level", { ascending: true });

      if (levelsError) throw levelsError;
      setLevels((levelsData as any) || []);

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
        .from("commission_levels" as any)
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

      const { error } = await supabase.from("commission_levels" as any).insert({
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
      loadData();
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
        .from("commission_levels" as any)
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Níveis de Comissão</h1>
          <p className="text-muted-foreground">
            Configure os percentuais de comissão por nível
          </p>
        </div>
        <TableSkeleton columns={5} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Níveis de Comissão</h1>
        <p className="text-muted-foreground">
          Configure os percentuais de comissão por nível de sub-afiliados
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Limite Máximo de Níveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="maxLevels">Níveis Permitidos</Label>
              <Input
                id="maxLevels"
                type="number"
                min="1"
                max="10"
                value={maxLevels}
                onChange={(e) => setMaxLevels(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveMaxLevels} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Percentuais por Nível</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Nível
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Nível</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newLevel">Nível (1-10)</Label>
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
                  <Label htmlFor="newPercentage">Porcentagem (0-100)</Label>
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
                  <Label htmlFor="newDescription">Descrição</Label>
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nível</TableHead>
                <TableHead>Porcentagem</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhum nível cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                levels.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell className="font-medium">
                      Nível {level.level}
                    </TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCommissionLevels;
