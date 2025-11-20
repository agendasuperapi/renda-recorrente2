import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
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

interface CpfApi {
  id: string;
  name: string;
  url: string;
  api_type: 'nationalId' | 'spbt' | 'betQuatro' | 'superbet';
  is_active: boolean;
  priority: number;
}

const AdminCpfApis = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testCpf, setTestCpf] = useState("");
  const [testBirthDate, setTestBirthDate] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [selectedApiId, setSelectedApiId] = useState<string>("all");
  const [newApi, setNewApi] = useState({
    name: "",
    url: "",
    api_type: "nationalId" as CpfApi['api_type'],
    priority: 1,
  });

  const { data: apis, isLoading } = useQuery({
    queryKey: ['cpf-apis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cpf_apis' as any)
        .select('*')
        .order('priority');
      
      if (error) throw error;
      return data as unknown as CpfApi[];
    },
  });

  const createApiMutation = useMutation({
    mutationFn: async (api: typeof newApi) => {
      const { error } = await supabase
        .from('cpf_apis' as any)
        .insert([api]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpf-apis'] });
      setIsDialogOpen(false);
      setNewApi({ name: "", url: "", api_type: "nationalId", priority: 1 });
      toast({ title: "API cadastrada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar API", variant: "destructive" });
    },
  });

  const deleteApiMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cpf_apis' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpf-apis'] });
      toast({ title: "API removida com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover API", variant: "destructive" });
    },
  });

  const toggleApiMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('cpf_apis' as any)
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cpf-apis'] });
    },
  });

  const handleTestCpf = async () => {
    if (!testCpf || testCpf.length !== 11) {
      toast({ title: "Digite um CPF válido (11 dígitos)", variant: "destructive" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('consultar-cpf', {
        body: { 
          cpf: testCpf, 
          birthDate: testBirthDate,
          apiId: selectedApiId === "all" ? undefined : selectedApiId
        },
      });

      if (error) throw error;
      setTestResult(data);
    } catch (error: any) {
      setTestResult({ error: true, message: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 11);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">APIs de CPF</h1>
          <p className="text-muted-foreground">Gerencie as APIs de consulta de CPF</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova API
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Nova API</DialogTitle>
              <DialogDescription>
                Adicione uma nova API de consulta de CPF
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newApi.name}
                  onChange={(e) => setNewApi({ ...newApi, name: e.target.value })}
                  placeholder="Nome da API"
                />
              </div>
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={newApi.url}
                  onChange={(e) => setNewApi({ ...newApi, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="api_type">Tipo</Label>
                <Select
                  value={newApi.api_type}
                  onValueChange={(value: CpfApi['api_type']) => 
                    setNewApi({ ...newApi, api_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nationalId">NationalId</SelectItem>
                    <SelectItem value="spbt">SPBT</SelectItem>
                    <SelectItem value="betQuatro">BetQuatro</SelectItem>
                    <SelectItem value="superbet">Superbet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Input
                  id="priority"
                  type="number"
                  value={newApi.priority}
                  onChange={(e) => setNewApi({ ...newApi, priority: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <Button 
                onClick={() => createApiMutation.mutate(newApi)}
                disabled={!newApi.name || !newApi.url || createApiMutation.isPending}
                className="w-full"
              >
                {createApiMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Testar Consulta de CPF</CardTitle>
          <CardDescription>
            Digite um CPF para testar o sistema de fallback das APIs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="test-cpf">CPF</Label>
              <Input
                id="test-cpf"
                value={testCpf}
                onChange={(e) => setTestCpf(formatCpf(e.target.value))}
                placeholder="00000000000"
                maxLength={11}
              />
            </div>
            <div>
              <Label htmlFor="test-birth">Data de Nascimento</Label>
              <Input
                id="test-birth"
                type="date"
                value={testBirthDate}
                onChange={(e) => setTestBirthDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="test-api">API</Label>
              <Select
                value={selectedApiId}
                onValueChange={setSelectedApiId}
              >
                <SelectTrigger id="test-api">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas (por prioridade)</SelectItem>
                  {apis?.filter(api => api.is_active).map((api) => (
                    <SelectItem key={api.id} value={api.id}>
                      {api.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleTestCpf}
                disabled={isTesting}
                className="w-full"
              >
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar
              </Button>
            </div>
          </div>
          
          {testResult && (
            <Card className={testResult.error ? "border-destructive" : "border-green-500"}>
              <CardContent className="pt-6">
                {testResult.error ? (
                  <div className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">Erro na consulta</p>
                      <p className="text-sm text-muted-foreground">{testResult.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-500">Consulta realizada com sucesso</p>
                      <div className="mt-2 space-y-1 text-sm">
                        {testResult.name && <p><strong>Nome:</strong> {testResult.name}</p>}
                        {testResult.birthDate && <p><strong>Data Nascimento:</strong> {testResult.birthDate}</p>}
                        {testResult.gender && <p><strong>Gênero:</strong> {testResult.gender}</p>}
                        {testResult.apiUsed && (
                          <p className="text-muted-foreground mt-2">
                            <strong>API utilizada:</strong> {testResult.apiUsed}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>APIs Cadastradas</CardTitle>
          <CardDescription>
            As APIs são consultadas por ordem de prioridade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apis?.map((api) => (
                  <TableRow key={api.id}>
                    <TableCell className="font-medium">{api.priority}</TableCell>
                    <TableCell>{api.name}</TableCell>
                    <TableCell>{api.api_type}</TableCell>
                    <TableCell className="max-w-xs truncate">{api.url}</TableCell>
                    <TableCell>
                      <Switch
                        checked={api.is_active}
                        onCheckedChange={(checked) => 
                          toggleApiMutation.mutate({ id: api.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteApiMutation.mutate(api.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
  );
};

export default AdminCpfApis;
