import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Bank {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

const AdminBanks = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState({ name: "", is_active: true });
  const { toast } = useToast();

  const client = supabase as any;

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const { data, error } = await client
        .from("banks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBanks(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar bancos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", is_active: true });
    setEditingBank(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBank) {
        const { error } = await client
          .from("banks")
          .update(formData)
          .eq("id", editingBank.id);

        if (error) throw error;
        toast({ title: "Banco atualizado com sucesso" });
      } else {
        const { error } = await client.from("banks").insert([formData]);
        if (error) throw error;
        toast({ title: "Banco criado com sucesso" });
      }

      setOpen(false);
      resetForm();
      fetchBanks();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar banco",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este banco?")) return;

    try {
      const { error } = await client.from("banks").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Banco excluído com sucesso" });
      fetchBanks();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir banco",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({ name: bank.name, is_active: bank.is_active });
    setOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Banco e Contas</h1>
            <p className="text-sm text-muted-foreground">
              Cadastro de bancos utilizados para integrações de pagamento.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo Banco
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBank ? "Editar Banco" : "Novo Banco"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do banco</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active">Banco ativo</Label>
                </div>
                <Button type="submit" className="w-full">
                  {editingBank ? "Salvar alterações" : "Criar banco"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de bancos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando bancos...</p>
            ) : banks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum banco cadastrado ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banks.map((bank) => (
                    <TableRow key={bank.id}>
                      <TableCell>{bank.name}</TableCell>
                      <TableCell>
                        <Badge variant={bank.is_active ? "default" : "outline"}>
                          {bank.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(bank)}
                          aria-label="Editar banco"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(bank.id)}
                          aria-label="Excluir banco"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminBanks;

