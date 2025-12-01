import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

interface Bank {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

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
  icone_light: string | null;
  icone_dark: string | null;
}

const AdminBankAccounts = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBankDialog, setOpenBankDialog] = useState(false);
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>("all");
  const [bankFormData, setBankFormData] = useState({ name: "", is_active: true });
  const [accountFormData, setAccountFormData] = useState({
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
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [banksRes, accountsRes, productsRes] = await Promise.all([
        client.from("banks").select("*").order("created_at", { ascending: false }),
        client
          .from("accounts")
          .select("*, products (id, nome), banks (id, name)")
          .order("created_at", { ascending: false }),
        client.from("products").select("id, nome, icone_light, icone_dark").order("nome"),
      ]);

      if (banksRes.error) throw banksRes.error;
      if (accountsRes.error) throw accountsRes.error;
      if (productsRes.error) throw productsRes.error;

      setBanks(banksRes.data || []);
      setAccounts(accountsRes.data || []);
      setProducts(productsRes.data || []);
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

  // Bank functions
  const resetBankForm = () => {
    setBankFormData({ name: "", is_active: true });
    setEditingBank(null);
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBank) {
        const { error } = await client
          .from("banks")
          .update(bankFormData)
          .eq("id", editingBank.id);

        if (error) throw error;
        toast({ title: "Banco atualizado com sucesso" });
      } else {
        const { error } = await client.from("banks").insert([bankFormData]);
        if (error) throw error;
        toast({ title: "Banco criado com sucesso" });
      }

      setOpenBankDialog(false);
      resetBankForm();
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar banco",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBankDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este banco?")) return;

    try {
      const { error } = await client.from("banks").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Banco excluído com sucesso" });
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir banco",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openBankEditDialog = (bank: Bank) => {
    setEditingBank(bank);
    setBankFormData({ name: bank.name, is_active: bank.is_active });
    setOpenBankDialog(true);
  };

  // Account functions
  const resetAccountForm = () => {
    setAccountFormData({
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

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de campos obrigatórios
    if (!accountFormData.product_id) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione um produto",
        variant: "destructive",
      });
      return;
    }

    if (!accountFormData.bank_id) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione um banco",
        variant: "destructive",
      });
      return;
    }

    if (!accountFormData.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha o nome da conta",
        variant: "destructive",
      });
      return;
    }

    if (!accountFormData.email.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha o e-mail",
        variant: "destructive",
      });
      return;
    }

    if (!accountFormData.key_authorization.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha a Key Authorization",
        variant: "destructive",
      });
      return;
    }

    if (!accountFormData.signing_secret.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha o Signing Secret",
        variant: "destructive",
      });
      return;
    }

    try {
      // Verificar se já existe uma conta ativa do mesmo tipo para o mesmo produto
      if (accountFormData.is_active) {
        const { data: existingAccounts, error: checkError } = await client
          .from("accounts")
          .select("id, name")
          .eq("product_id", accountFormData.product_id)
          .eq("is_production", accountFormData.is_production)
          .eq("is_active", true);

        if (checkError) throw checkError;

        // Filtrar para excluir a conta atual em caso de edição
        const conflictingAccounts = existingAccounts?.filter(
          (acc: Account) => acc.id !== editingAccount?.id
        ) || [];

        if (conflictingAccounts.length > 0) {
          const accountType = accountFormData.is_production ? "produção" : "teste";
          const existingAccountName = conflictingAccounts[0].name;
          
          const confirm = window.confirm(
            `Já existe uma conta de ${accountType} ativa para este produto: "${existingAccountName}".\n\n` +
            `Ao salvar esta conta como ativa, a conta "${existingAccountName}" será automaticamente inativada.\n\n` +
            `Deseja continuar?`
          );

          if (!confirm) {
            return;
          }

          // Inativar todas as contas conflitantes
          for (const account of conflictingAccounts) {
            const { error: deactivateError } = await client
              .from("accounts")
              .update({ is_active: false })
              .eq("id", account.id);

            if (deactivateError) throw deactivateError;
          }

          toast({
            title: "Conta anterior inativada",
            description: `A conta "${existingAccountName}" foi inativada automaticamente.`,
          });
        }
      }

      if (editingAccount) {
        const { error } = await client
          .from("accounts")
          .update(accountFormData)
          .eq("id", editingAccount.id);

        if (error) throw error;
        toast({ title: "Conta atualizada com sucesso" });
      } else {
        const { error } = await client.from("accounts").insert([accountFormData]);
        if (error) throw error;
        toast({ title: "Conta criada com sucesso" });
      }

      setOpenAccountDialog(false);
      resetAccountForm();
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar conta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAccountDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta conta?")) return;

    try {
      const { error } = await client.from("accounts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Conta excluída com sucesso" });
      fetchAllData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir conta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openAccountEditDialog = (account: Account) => {
    setEditingAccount(account);
    setAccountFormData({
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
    setOpenAccountDialog(true);
  };

  return (
    <div className="min-h-screen p-3 sm:p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Banco e Contas</h1>
          </div>

        <Tabs defaultValue="banks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="banks">Bancos</TabsTrigger>
            <TabsTrigger value="accounts">Contas</TabsTrigger>
          </TabsList>

          <TabsContent value="banks" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Cadastro de bancos utilizados para integrações de pagamento
              </p>
              <Dialog open={openBankDialog} onOpenChange={setOpenBankDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetBankForm} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Banco
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingBank ? "Editar Banco" : "Novo Banco"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleBankSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank-name">Nome do banco</Label>
                      <Input
                        id="bank-name"
                        value={bankFormData.name}
                        onChange={(e) =>
                          setBankFormData({ ...bankFormData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="bank-active"
                        checked={bankFormData.is_active}
                        onCheckedChange={(checked) =>
                          setBankFormData({ ...bankFormData, is_active: checked })
                        }
                      />
                      <Label htmlFor="bank-active">Banco ativo</Label>
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
                              onClick={() => openBankEditDialog(bank)}
                              aria-label="Editar banco"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleBankDelete(bank.id)}
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
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-center pr-3 sm:pr-0">
                <Select value={selectedProductFilter} onValueChange={setSelectedProductFilter}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Filtrar por produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os produtos</SelectItem>
                    <SelectItem value="no-product">Sem produto</SelectItem>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    resetAccountForm();
                    setOpenAccountDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Conta
                </Button>
              </div>
            </div>
            
            <Dialog open={openAccountDialog} onOpenChange={setOpenAccountDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAccount ? "Editar Conta" : "Nova Conta"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAccountSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="product_id">Produto</Label>
                        <Select
                          value={accountFormData.product_id}
                          onValueChange={(value) =>
                            setAccountFormData({ ...accountFormData, product_id: value })
                          }
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
                          value={accountFormData.bank_id}
                          onValueChange={(value) =>
                            setAccountFormData({ ...accountFormData, bank_id: value })
                          }
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
                      <Label htmlFor="account-name">Nome da conta</Label>
                      <Input
                        id="account-name"
                        value={accountFormData.name}
                        onChange={(e) =>
                          setAccountFormData({ ...accountFormData, name: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account-email">E-mail</Label>
                      <Input
                        id="account-email"
                        type="email"
                        value={accountFormData.email}
                        onChange={(e) =>
                          setAccountFormData({ ...accountFormData, email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="key_authorization">Key Authorization</Label>
                      <textarea
                        id="key_authorization"
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y"
                        value={accountFormData.key_authorization}
                        onChange={(e) =>
                          setAccountFormData({
                            ...accountFormData,
                            key_authorization: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signing_secret">Signing Secret</Label>
                      <textarea
                        id="signing_secret"
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y"
                        value={accountFormData.signing_secret}
                        onChange={(e) =>
                          setAccountFormData({
                            ...accountFormData,
                            signing_secret: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="success_url">Success URL</Label>
                      <Input
                        id="success_url"
                        type="url"
                        value={accountFormData.success_url}
                        onChange={(e) =>
                          setAccountFormData({
                            ...accountFormData,
                            success_url: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cancel_url">Cancel URL</Label>
                      <Input
                        id="cancel_url"
                        type="url"
                        value={accountFormData.cancel_url}
                        onChange={(e) =>
                          setAccountFormData({
                            ...accountFormData,
                            cancel_url: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="return_url">Return URL</Label>
                      <Input
                        id="return_url"
                        type="url"
                        value={accountFormData.return_url}
                        onChange={(e) =>
                          setAccountFormData({
                            ...accountFormData,
                            return_url: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is_production"
                          checked={accountFormData.is_production}
                          onCheckedChange={(checked) =>
                            setAccountFormData({
                              ...accountFormData,
                              is_production: checked,
                            })
                          }
                        />
                        <Label htmlFor="is_production">Conta de produção</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="account-active"
                          checked={accountFormData.is_active}
                          onCheckedChange={(checked) =>
                            setAccountFormData({ ...accountFormData, is_active: checked })
                          }
                        />
                        <Label htmlFor="account-active">Conta ativa</Label>
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
                      {editingAccount ? "Salvar alterações" : "Criar conta"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

            <div className="space-y-8">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Carregando contas...</div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma conta cadastrada ainda.
                </div>
              ) : selectedProductFilter === "all" ? (
                <>
                      {products
                        .filter((product) =>
                          accounts.some((account) => account.product_id === product.id)
                        )
                        .map((product) => {
                          const productAccounts = accounts.filter(
                            (account) => account.product_id === product.id
                          );
                          return (
                            <div key={product.id} className="space-y-4">
                              <div className="flex items-center gap-2">
                                {product.icone_light && (
                                  <img src={product.icone_light} alt={product.nome} className="w-6 h-6 dark:hidden" />
                                )}
                                {product.icone_dark && (
                                <img src={product.icone_dark} alt={product.nome} className="w-6 h-6 hidden dark:block" />
                              )}
                              <h3 className="text-xl font-semibold">{product.nome}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {productAccounts.map((account) => (
                                <Card key={account.id} className={!account.is_active ? "border-destructive/50 bg-destructive/5" : ""}>
                                  <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                      <div className="flex-1">
                                        <h4 className="text-lg font-semibold mb-1">
                                        {account.name}
                                      </h4>
                                      <p className="text-sm text-muted-foreground">{account.banks?.name}</p>
                                      <p className="text-sm text-muted-foreground mt-1">{account.email}</p>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openAccountEditDialog(account)}
                                        aria-label="Editar conta"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleAccountDelete(account.id)}
                                        aria-label="Excluir conta"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    <Badge
                                      variant={account.is_production ? "default" : "outline"}
                                      className="text-xs"
                                    >
                                      {account.is_production ? "Produção" : "Teste"}
                                    </Badge>
                                    <Badge
                                      variant={account.is_active ? "default" : "destructive"}
                                      className="text-xs"
                                    >
                                      {account.is_active ? "Ativa" : "Inativa"}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                  {accounts.filter((account) => !account.product_id).length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold text-muted-foreground">Sem produto</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {accounts
                          .filter((account) => !account.product_id)
                          .map((account) => (
                            <Card key={account.id} className={!account.is_active ? "border-destructive/50 bg-destructive/5" : ""}>
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1">
                                    <h4 className="text-lg font-semibold mb-1">
                                      {account.name}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">{account.banks?.name}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{account.email}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openAccountEditDialog(account)}
                                      aria-label="Editar conta"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleAccountDelete(account.id)}
                                      aria-label="Excluir conta"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  <Badge
                                    variant={account.is_production ? "default" : "outline"}
                                    className="text-xs"
                                  >
                                    {account.is_production ? "Produção" : "Teste"}
                                  </Badge>
                                  <Badge
                                    variant={account.is_active ? "default" : "destructive"}
                                    className="text-xs"
                                  >
                                    {account.is_active ? "Ativa" : "Inativa"}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              ) : selectedProductFilter === "no-product" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts
                    .filter((account) => !account.product_id)
                    .map((account) => (
                      <Card key={account.id} className={!account.is_active ? "border-destructive/50 bg-destructive/5" : ""}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold mb-1">
                                {account.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">{account.banks?.name}</p>
                              <p className="text-sm text-muted-foreground mt-1">{account.email}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openAccountEditDialog(account)}
                                aria-label="Editar conta"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAccountDelete(account.id)}
                                aria-label="Excluir conta"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Badge
                              variant={account.is_production ? "default" : "outline"}
                              className="text-xs"
                            >
                              {account.is_production ? "Produção" : "Teste"}
                            </Badge>
                            <Badge
                              variant={account.is_active ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {account.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts
                    .filter((account) => account.product_id === selectedProductFilter)
                    .map((account) => (
                      <Card key={account.id} className={!account.is_active ? "border-destructive/50 bg-destructive/5" : ""}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold mb-1">
                                {account.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">{account.banks?.name}</p>
                              <p className="text-sm text-muted-foreground mt-1">{account.email}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openAccountEditDialog(account)}
                                aria-label="Editar conta"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAccountDelete(account.id)}
                                aria-label="Excluir conta"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Badge
                              variant={account.is_production ? "default" : "outline"}
                              className="text-xs"
                            >
                              {account.is_production ? "Produção" : "Teste"}
                            </Badge>
                            <Badge
                              variant={account.is_active ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {account.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
  );
};

export default AdminBankAccounts;
