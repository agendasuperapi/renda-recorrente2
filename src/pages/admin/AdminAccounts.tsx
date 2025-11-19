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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Account {
  id: string;
  product_id: string;
  bank_id: string;
  name: string;
  email: string;
  key_authorization: string;
  signing_secret: string;
  success_url: string | null;
  cancel_url: string | null;
  return_url: string | null;
  is_production: boolean;
  is_active: boolean;
  products?: { id: string; nome: string };
  banks?: { id: string; name: string };
}

interface Product {
  id: string;
  nome: string;
}

interface Bank {
  id: string;
  name: string;
}

const AdminAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    product_id: "",
    bank_id: "",
    name: "",
    email: "",
    key_authorization: "",
    signing_secret: "",
    success_url: "",
    cancel_url: "",
    return_url: "",
    is_production: false,
    is_active: true,
  });
  const { toast } = useToast();

  const client = supabase as any;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, productsRes, banksRes] = await Promise.all([
        client
          .from("accounts")
          .select("*, products (id, nome), banks (id, name)")
          .order("created_at", { ascending: false }),
        client.from("products").select("id, nome").order("nome"),
        client.from("banks").select("id, name").order("name"),
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (banksRes.error) throw banksRes.error;

      setAccounts(accountsRes.data || []);
      setProducts(productsRes.data || []);
      setBanks(banksRes.data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      bank_id: "",
      name: "",
      email: "",
      key_authorization: "",
      signing_secret: "",
      success_url: "",
      cancel_url: "",
      return_url: "",
      is_production: false,
      is_active: true,
    });
    setEditingAccount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAccount) {
        const { error } = await client
          .from("accounts")
          .update(formData)
          .eq("id", editingAccount.id);

        if (error) throw error;
        toast({ title: "Conta atualizada com sucesso" });
      } else {
        const { error } = await client.from("accounts").insert([formData]);
        if (error) throw error;
        toast({ title: "Conta criada com sucesso" });
      }

      setOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar conta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta conta?")) return;

    try {
      const { error } = await client.from("accounts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Conta excluída com sucesso" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir conta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      product_id: account.product_id,
      bank_id: account.bank_id,
      name: account.name,
      email: account.email,
      key_authorization: account.key_authorization,
      signing_secret: account.signing_secret,
      success_url: account.success_url || "",
      cancel_url: account.cancel_url || "",
      return_url: account.return_url || "",
      is_production: account.is_production,
      is_active: account.is_active,
    });
    setOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contas de Pagamento</h1>
            <p className="text-sm text-muted-foreground">
              Vincule contas de banco e produtos para processar pagamentos.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product_id">Produto</Label>
                    <Select
                      value={formData.product_id}
                      onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
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
                    <Label htmlFor="bank_id">Banco</Label>
                    <Select
                      value={formData.bank_id}
                      onValueChange={(value) => setFormData({ ...formData, bank_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome da conta</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="key_authorization">Key Authorization</Label>
                  <Input
                    id="key_authorization"
                    value={formData.key_authorization}
                    onChange={(e) =>
                      setFormData({ ...formData, key_authorization: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signing_secret">Signing Secret</Label>
                  <Input
                    id="signing_secret"
                    value={formData.signing_secret}
                    onChange={(e) =>
                      setFormData({ ...formData, signing_secret: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="success_url">Success URL</Label>
                  <Input
                    id="success_url"
                    type="url"
                    value={formData.success_url}
                    onChange={(e) =>
                      setFormData({ ...formData, success_url: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancel_url">Cancel URL</Label>
                  <Input
                    id="cancel_url"
                    type="url"
                    value={formData.cancel_url}
                    onChange={(e) =>
                      setFormData({ ...formData, cancel_url: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="return_url">Return URL</Label>
                  <Input
                    id="return_url"
                    type="url"
                    value={formData.return_url}
                    onChange={(e) =>
                      setFormData({ ...formData, return_url: e.target.value })
                    }
                  />
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_production"
                      checked={formData.is_production}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_production: checked })
                      }
                    />
                    <Label htmlFor="is_production">Conta de produção</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <Label htmlFor="is_active">Conta ativa</Label>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingAccount ? "Salvar alterações" : "Criar conta"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contas cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando contas...</p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Ambiente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>{account.products?.nome}</TableCell>
                      <TableCell>{account.banks?.name}</TableCell>
                      <TableCell>{account.email}</TableCell>
                      <TableCell>
                        <Badge variant={account.is_production ? "default" : "outline"}>
                          {account.is_production ? "Produção" : "Teste"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.is_active ? "default" : "outline"}>
                          {account.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(account)}
                          aria-label="Editar conta"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(account.id)}
                          aria-label="Excluir conta"
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

export default AdminAccounts;

