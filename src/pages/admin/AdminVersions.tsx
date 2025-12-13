import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  GitBranch, Plus, Trash2, AlertCircle, CheckCircle2, Pencil, X, Check, Copy, 
  Search, ChevronLeft, ChevronRight, Rocket, Loader2, ExternalLink, Lock,
  Clock, AlertTriangle, CheckCircle, XCircle, ArrowUp
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { APP_VERSION } from "@/config/version";
import { useDebounce } from "@/hooks/useDebounce";

interface Version {
  id: string;
  version: string;
  description: string | null;
  changes: string[] | null;
  released_at: string;
  created_at: string;
  deploy_status: string | null;
  deploy_started_at: string | null;
  deploy_completed_at: string | null;
  github_run_id: string | null;
  deploy_error: string | null;
}

const GITHUB_ACTIONS_URL = "https://github.com/agendasuperapi/renda-recorrente2/actions";

export default function AdminVersions() {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [changeInput, setChangeInput] = useState("");
  const [changes, setChanges] = useState<string[]>([]);
  
  // Edit mode states
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editChanges, setEditChanges] = useState<string[]>([]);
  const [editChangeInput, setEditChangeInput] = useState("");
  const [editingChangeIndex, setEditingChangeIndex] = useState<number | null>(null);
  const [editingChangeText, setEditingChangeText] = useState("");
  
  // Delete confirmation
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);

  // Deploy states
  const [isDeploying, setIsDeploying] = useState(false);
  const [showDeployConfirm, setShowDeployConfirm] = useState(false);
  const [isIncrementingVersion, setIsIncrementingVersion] = useState(false);

  // Filter and pagination states
  const [searchFilter, setSearchFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebounce(searchFilter, 300);

  const { data: versionsData, isLoading } = useQuery({
    queryKey: ["app_versions", debouncedSearch, currentPage, pageSize],
    queryFn: async () => {
      let query = (supabase as any)
        .from("app_versions")
        .select("*", { count: "exact" });

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(`version.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order("released_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { versions: data as Version[], total: count || 0 };
    },
  });

  const versions = versionsData?.versions;
  const totalCount = versionsData?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Verificar se a versão atual já foi deployada
  const currentVersionExists = versions?.some(v => v.version === APP_VERSION);
  const currentVersionDeployed = versions?.some(
    v => v.version === APP_VERSION && v.deploy_status === 'success'
  );

  const updateVersionMutation = useMutation({
    mutationFn: async (updatedVersion: {
      id: string;
      description: string;
      changes: string[];
    }) => {
      const { error } = await (supabase as any)
        .from("app_versions")
        .update({
          description: updatedVersion.description,
          changes: updatedVersion.changes,
        })
        .eq("id", updatedVersion.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_versions"] });
      toast.success("Versão atualizada com sucesso!");
      setEditingVersionId(null);
      setEditDescription("");
      setEditChanges([]);
      setEditChangeInput("");
      setEditingChangeIndex(null);
      setEditingChangeText("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar versão");
    },
  });

  const deleteVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await (supabase as any)
        .from("app_versions")
        .delete()
        .eq("id", versionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_versions"] });
      toast.success("Versão excluída com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir versão");
    },
  });

  const handleAddChange = () => {
    if (changeInput.trim()) {
      setChanges([...changes, changeInput.trim()]);
      setChangeInput("");
    }
  };

  const handleRemoveChange = (index: number) => {
    setChanges(changes.filter((_, i) => i !== index));
  };

  const handleStartEdit = (v: Version) => {
    // Não permitir edição de versões já deployadas
    if (v.deploy_status === 'success') {
      toast.error("Versões já deployadas não podem ser editadas");
      return;
    }
    setEditingVersionId(v.id);
    setEditDescription(v.description || "");
    setEditChanges(v.changes || []);
    setEditChangeInput("");
    setEditingChangeIndex(null);
    setEditingChangeText("");
  };

  const handleCancelEdit = () => {
    setEditingVersionId(null);
    setEditDescription("");
    setEditChanges([]);
    setEditChangeInput("");
    setEditingChangeIndex(null);
    setEditingChangeText("");
  };

  const handleSaveEdit = () => {
    if (editingVersionId) {
      updateVersionMutation.mutate({
        id: editingVersionId,
        description: editDescription,
        changes: editChanges,
      });
    }
  };

  const handleAddEditChange = () => {
    if (editChangeInput.trim()) {
      setEditChanges([...editChanges, editChangeInput.trim()]);
      setEditChangeInput("");
    }
  };

  const handleRemoveEditChange = (index: number) => {
    setEditChanges(editChanges.filter((_, i) => i !== index));
  };

  const handleStartEditChange = (index: number) => {
    setEditingChangeIndex(index);
    setEditingChangeText(editChanges[index]);
  };

  const handleSaveEditChange = (index: number) => {
    if (editingChangeText.trim()) {
      const updatedChanges = [...editChanges];
      updatedChanges[index] = editingChangeText.trim();
      setEditChanges(updatedChanges);
      setEditingChangeIndex(null);
      setEditingChangeText("");
    }
  };

  const handleCancelEditChange = () => {
    setEditingChangeIndex(null);
    setEditingChangeText("");
  };

  const handleConfirmDelete = () => {
    if (deletingVersionId) {
      deleteVersionMutation.mutate(deletingVersionId);
      setDeletingVersionId(null);
    }
  };

  // For sync status, we need to check the latest version without filters
  const { data: latestVersion, refetch: refetchLatestVersion } = useQuery({
    queryKey: ["app_versions_latest"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_versions")
        .select("version, deploy_status")
        .order("released_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
  });

  // Auto-refresh when deploy is in progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (latestVersion?.deploy_status === 'deploying') {
      interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["app_versions"] });
        refetchLatestVersion();
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [latestVersion?.deploy_status, queryClient, refetchLatestVersion]);

  const latestDbVersion = latestVersion?.version;
  const isSynced = latestDbVersion === APP_VERSION && latestVersion?.deploy_status === 'success';

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchFilter(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  // Formatar changelog para o GitHub
  const formatChangelogForGitHub = () => {
    let changelog = "";
    if (description.trim()) {
      changelog += `## Descrição\n${description.trim()}\n\n`;
    }
    if (changes.length > 0) {
      changelog += `## Mudanças\n`;
      changes.forEach(change => {
        changelog += `- ${change}\n`;
      });
    }
    return changelog || `Deploy da versão ${APP_VERSION}`;
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setShowDeployConfirm(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Criar ou atualizar registro da versão com status 'deploying'
      const { data: versionData, error: versionError } = await (supabase as any)
        .from("app_versions")
        .upsert({
          version: APP_VERSION,
          description: description.trim() || null,
          changes: changes.length > 0 ? changes : null,
          deploy_status: 'deploying',
          deploy_started_at: new Date().toISOString(),
          created_by: user.id,
        }, {
          onConflict: 'version'
        })
        .select()
        .single();

      if (versionError) throw versionError;

      // 2. Disparar deploy com changelog
      const changelog = formatChangelogForGitHub();
      const { data, error } = await supabase.functions.invoke('trigger-deploy', {
        body: { 
          version: APP_VERSION,
          version_description: changelog,
          version_id: versionData.id
        }
      });

      if (error) {
        // Atualizar status para failed
        await (supabase as any)
          .from("app_versions")
          .update({ 
            deploy_status: 'failed',
            deploy_error: error.message
          })
          .eq("id", versionData.id);
        throw new Error(error.message);
      }

      if (data?.success) {
        // Atualizar com github_run_id se disponível
        if (data.run_id) {
          await (supabase as any)
            .from("app_versions")
            .update({ github_run_id: data.run_id })
            .eq("id", versionData.id);
        }
        
        toast.success("Deploy iniciado! Acompanhe o progresso no GitHub Actions.");
        
        // Limpar formulário
        setDescription("");
        setChanges([]);
        setChangeInput("");
        
        // Atualizar lista
        queryClient.invalidateQueries({ queryKey: ["app_versions"] });
        queryClient.invalidateQueries({ queryKey: ["app_versions_latest"] });
      } else {
        throw new Error(data?.error || 'Erro ao disparar deploy');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(errorMessage);
    } finally {
      setIsDeploying(false);
    }
  };

  // Função para renderizar o status badge
  const renderStatusBadge = (status: string | null) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'deploying':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Em andamento
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="h-3 w-3 mr-1" />
            Falhou
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  // Verificar status de deploy
  const handleCheckDeployStatus = async (versionId: string, runId: string | null) => {
    if (!runId) {
      toast.info("Nenhum ID de execução disponível. Verifique manualmente no GitHub Actions.");
      return;
    }
    
    // Por enquanto, apenas abre o GitHub Actions
    window.open(`${GITHUB_ACTIONS_URL}`, '_blank');
  };

  // Incrementar versão via GitHub
  const handleIncrementVersion = async () => {
    setIsIncrementingVersion(true);
    try {
      // Send current version from client to ensure correct base version
      const { data, error } = await supabase.functions.invoke('increment-version', {
        body: { current_version: APP_VERSION }
      });
      
      if (error) throw new Error(error.message);
      
      if (data?.success) {
        toast.success(`Versão incrementada: ${data.oldVersion} → ${data.newVersion}`);
        toast.info("A página será recarregada em alguns segundos para refletir a nova versão.");
        
        // Aguarda sincronização do Lovable com o GitHub e recarrega
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      } else {
        throw new Error(data?.error || 'Erro ao incrementar versão');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(errorMessage);
    } finally {
      setIsIncrementingVersion(false);
    }
  };

  // Marcar deploy como concluído manualmente
  const handleMarkAsSuccess = async (versionId: string) => {
    try {
      await (supabase as any)
        .from("app_versions")
        .update({ 
          deploy_status: 'success',
          deploy_completed_at: new Date().toISOString()
        })
        .eq("id", versionId);
      
      toast.success("Deploy marcado como concluído!");
      queryClient.invalidateQueries({ queryKey: ["app_versions"] });
      queryClient.invalidateQueries({ queryKey: ["app_versions_latest"] });
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 mb-4 md:mb-6">
        <GitBranch className="h-5 w-5 md:h-6 md:w-6" />
        <h1 className="text-2xl md:text-3xl font-bold">Gerenciamento de Versões</h1>
      </div>

      {/* Status Card */}
      <Alert variant={isSynced ? "default" : "destructive"}>
        {isSynced ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        <AlertTitle>Status da Versão</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-1">
            <p>
              <strong>Versão do código atual:</strong> {APP_VERSION}
            </p>
            <p>
              <strong>Versão mais recente no banco:</strong>{" "}
              {latestDbVersion || "Nenhuma versão cadastrada"}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {isSynced ? (
                <span className="text-green-600">✓ Sincronizado e deployado</span>
              ) : currentVersionDeployed ? (
                <span className="text-green-600">✓ Versão já deployada</span>
              ) : currentVersionExists ? (
                <span className="text-blue-600">⏳ Deploy pendente para v{APP_VERSION}</span>
              ) : (
                <span className="text-destructive">
                  ⚠ Deploy a versão {APP_VERSION}
                </span>
              )}
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Nova Versão e Deploy Card - Consolidado */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Nova Versão e Deploy
          </CardTitle>
          <CardDescription>
            Cadastre a versão e dispare o deploy para produção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Versão - Somente leitura */}
          <div className="space-y-2">
            <Label htmlFor="version" className="flex items-center gap-2">
              Número da Versão
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      A versão é lida do arquivo src/config/version.ts e não pode ser editada aqui.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="version"
              value={APP_VERSION}
              readOnly
              disabled
              className="bg-muted font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Edite manualmente o arquivo <code className="bg-muted px-1 py-0.5 rounded text-xs">src/config/version.ts</code> para alterar a versão
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Breve descrição desta versão"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={currentVersionDeployed || isDeploying}
            />
          </div>

          {/* Lista de Mudanças */}
          <div className="space-y-2">
            <Label htmlFor="change">Lista de Mudanças</Label>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                id="change"
                placeholder="Digite uma mudança e clique em Adicionar"
                value={changeInput}
                onChange={(e) => setChangeInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddChange())}
                className="flex-1"
                disabled={currentVersionDeployed || isDeploying}
              />
              <Button 
                type="button" 
                onClick={handleAddChange} 
                variant="outline" 
                className="w-full md:w-auto"
                disabled={currentVersionDeployed || isDeploying}
              >
                Adicionar
              </Button>
            </div>
            {changes.length > 0 && (
              <ul className="mt-2 space-y-2">
                {changes.map((change, index) => (
                  <li key={index} className="flex flex-col md:flex-row md:items-center gap-2">
                    <span className="flex-1 text-sm">• {change}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChange(index)}
                      className="h-8 w-8 p-0 ml-4 md:ml-0 self-start md:self-center"
                      disabled={currentVersionDeployed || isDeploying}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Aviso de recomendação */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Recomendado:</strong> Faça Publish/Update no Lovable antes de disparar o deploy para garantir que todas as alterações foram sincronizadas com o GitHub.
            </AlertDescription>
          </Alert>

          {/* Botões de ação */}
          <div className="flex flex-col md:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1 md:flex-none"
            >
              <a 
                href={GITHUB_ACTIONS_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ver Actions
              </a>
            </Button>
            
            {currentVersionDeployed ? (
              <Button disabled className="flex-1 md:flex-none gap-2">
                <CheckCircle className="h-4 w-4" />
                Versão já deployada
              </Button>
            ) : (
              <Button
                onClick={() => setShowDeployConfirm(true)}
                disabled={isDeploying || latestVersion?.deploy_status === 'deploying'}
                className="flex-1 md:flex-none gap-2"
              >
                {isDeploying || latestVersion?.deploy_status === 'deploying' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isDeploying ? 'Disparando...' : 'Deploy em andamento...'}
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Deploy para Produção
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deploy Confirmation Dialog */}
      <AlertDialog open={showDeployConfirm} onOpenChange={setShowDeployConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Deploy</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a disparar o deploy da versão <strong>{APP_VERSION}</strong> para produção na Hostinger.
              <br /><br />
              Certifique-se de que:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>O código foi revisado e testado</li>
                <li>Publish/Update foi feito no Lovable</li>
                <li>Não há erros no preview</li>
              </ul>
              <br />
              <strong>Changelog que será enviado:</strong>
              <pre className="mt-2 p-2 bg-muted rounded text-xs max-h-32 overflow-auto">
                {formatChangelogForGitHub()}
              </pre>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeploy}>
              Confirmar Deploy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Versions List */}
      <Card className="bg-transparent border-0 shadow-none lg:bg-card lg:border lg:shadow-sm rounded-none lg:rounded-lg">
        <CardHeader className="px-0 lg:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Histórico de Versões</CardTitle>
              <CardDescription>
                {totalCount > 0 ? `${totalCount} versões cadastradas no sistema` : "Nenhuma versão cadastrada"}
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <form onSubmit={(e) => e.preventDefault()} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar versão..."
                  value={searchFilter}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 w-full md:w-[200px]"
                />
              </form>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-full md:w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 por página</SelectItem>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="!p-0 lg:!p-6">
          {isLoading ? (
            <p>Carregando...</p>
          ) : versions && versions.length > 0 ? (
            <div className="space-y-4">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`border rounded-lg p-3 md:p-4 space-y-3 md:space-y-2 bg-card lg:bg-transparent ${
                    editingVersionId === v.id ? "bg-accent/50" : ""
                  }`}
                >
                  {editingVersionId === v.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Número da Versão</Label>
                        <Input value={v.version} disabled className="bg-muted font-mono" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`edit-description-${v.id}`}>Descrição</Label>
                        <Textarea
                          id={`edit-description-${v.id}`}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Lista de Mudanças</Label>
                        <div className="flex flex-col md:flex-row gap-2">
                          <Input
                            value={editChangeInput}
                            onChange={(e) => setEditChangeInput(e.target.value)}
                            placeholder="Adicionar nova mudança"
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEditChange())}
                            className="flex-1"
                          />
                          <Button type="button" onClick={handleAddEditChange} variant="outline" size="sm" className="w-full md:w-auto">
                            Adicionar
                          </Button>
                        </div>
                        {editChanges.length > 0 && (
                          <ul className="mt-2 space-y-2">
                            {editChanges.map((change, index) => (
                              <li key={index} className="flex flex-col md:flex-row md:items-center gap-2">
                                {editingChangeIndex === index ? (
                                  <div className="flex flex-col md:flex-row gap-2 w-full">
                                    <Input
                                      value={editingChangeText}
                                      onChange={(e) => setEditingChangeText(e.target.value)}
                                      className="flex-1"
                                      onKeyPress={(e) => e.key === "Enter" && handleSaveEditChange(index)}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleSaveEditChange(index)}
                                        className="flex-1 md:flex-none"
                                      >
                                        <Check className="h-4 w-4 md:mr-1" />
                                        <span className="md:inline hidden">Salvar</span>
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCancelEditChange}
                                        className="flex-1 md:flex-none"
                                      >
                                        <X className="h-4 w-4 md:mr-1" />
                                        <span className="md:inline hidden">Cancelar</span>
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <span className="flex-1 text-sm">• {change}</span>
                                    <div className="flex gap-2 ml-4 md:ml-0">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleStartEditChange(index)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveEditChange(index)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex flex-col md:flex-row gap-2 pt-2">
                        <Button
                          onClick={handleSaveEdit}
                          disabled={updateVersionMutation.isPending}
                          className="w-full md:w-auto"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          {updateVersionMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          className="w-full md:w-auto"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">v{v.version}</h3>
                            {renderStatusBadge(v.deploy_status)}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Criado: {new Date(v.created_at).toLocaleDateString("pt-BR", { 
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}</p>
                            {v.deploy_started_at && (
                              <p>Deploy iniciado: {new Date(v.deploy_started_at).toLocaleDateString("pt-BR", { 
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}</p>
                            )}
                            {v.deploy_completed_at && (
                              <p>Deploy concluído: {new Date(v.deploy_completed_at).toLocaleDateString("pt-BR", { 
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}</p>
                            )}
                            {v.deploy_error && (
                              <p className="text-destructive">Erro: {v.deploy_error}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {v.github_run_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCheckDeployStatus(v.id, v.github_run_id)}
                              title="Ver no GitHub"
                              className="h-9 w-9 p-0"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          {v.deploy_status === 'deploying' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsSuccess(v.id)}
                              title="Marcar como concluído"
                              className="h-9 px-2 text-xs"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Concluir
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(v)}
                            disabled={editingVersionId !== null || v.deploy_status === 'success'}
                            title={v.deploy_status === 'success' ? "Versões deployadas não podem ser editadas" : "Editar versão"}
                            className="h-9 w-9 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingVersionId(v.id)}
                            disabled={deleteVersionMutation.isPending || editingVersionId !== null || v.deploy_status === 'success'}
                            title={v.deploy_status === 'success' ? "Versões deployadas não podem ser excluídas" : "Excluir versão"}
                            className="h-9 w-9 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {v.description && (
                        <p className="text-sm">{v.description}</p>
                      )}
                      {v.changes && v.changes.length > 0 && (
                        <ul className="text-sm space-y-1.5">
                          {v.changes.map((change, idx) => (
                            <li key={idx} className="leading-relaxed">• {change}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              {debouncedSearch ? "Nenhuma versão encontrada com este filtro." : "Nenhuma versão cadastrada ainda."}
            </p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm px-2">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingVersionId !== null} onOpenChange={(open) => !open && setDeletingVersionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta versão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
