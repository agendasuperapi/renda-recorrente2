import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { GitBranch, Plus, Trash2, AlertCircle, CheckCircle2, Pencil, X, Check, Copy, FileCode, Search, ChevronLeft, ChevronRight, Rocket, Loader2, ExternalLink } from "lucide-react";
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
import { APP_VERSION } from "@/config/version";
import { useDebounce } from "@/hooks/useDebounce";

interface Version {
  id: string;
  version: string;
  description: string | null;
  changes: string[] | null;
  released_at: string;
  created_at: string;
}

export default function AdminVersions() {
  const queryClient = useQueryClient();
  const [version, setVersion] = useState(APP_VERSION);
  const [description, setDescription] = useState("");
  const [changeInput, setChangeInput] = useState("");
  const [changes, setChanges] = useState<string[]>([]);
  
  // Edit mode states
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editVersion, setEditVersion] = useState("");
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

  const createVersionMutation = useMutation({
    mutationFn: async (newVersion: {
      version: string;
      description: string;
      changes: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await (supabase as any).from("app_versions").insert({
        version: newVersion.version,
        description: newVersion.description,
        changes: newVersion.changes,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_versions"] });
      toast.success("Versão cadastrada com sucesso! Recarregando...");
      setVersion("");
      setDescription("");
      setChanges([]);
      setChangeInput("");
      // Refresh para reconhecer a nova versão
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar versão");
    },
  });

  const updateVersionMutation = useMutation({
    mutationFn: async (updatedVersion: {
      id: string;
      version: string;
      description: string;
      changes: string[];
    }) => {
      const { error } = await (supabase as any)
        .from("app_versions")
        .update({
          version: updatedVersion.version,
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
      setEditVersion("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim()) {
      toast.error("Número da versão é obrigatório");
      return;
    }
    createVersionMutation.mutate({ version, description, changes });
  };

  const handleStartEdit = (v: Version) => {
    setEditingVersionId(v.id);
    setEditVersion(v.version);
    setEditDescription(v.description || "");
    setEditChanges(v.changes || []);
    setEditChangeInput("");
    setEditingChangeIndex(null);
    setEditingChangeText("");
  };

  const handleCancelEdit = () => {
    setEditingVersionId(null);
    setEditVersion("");
    setEditDescription("");
    setEditChanges([]);
    setEditChangeInput("");
    setEditingChangeIndex(null);
    setEditingChangeText("");
  };

  const handleSaveEdit = () => {
    if (!editVersion.trim()) {
      toast.error("Número da versão é obrigatório");
      return;
    }
    if (editingVersionId) {
      updateVersionMutation.mutate({
        id: editingVersionId,
        version: editVersion,
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

  const handleDuplicate = (v: Version) => {
    setVersion(v.version);
    setDescription(v.description || "");
    setChanges(v.changes || []);
    toast.info("Versão duplicada! Altere os dados e salve.");
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmDelete = () => {
    if (deletingVersionId) {
      deleteVersionMutation.mutate(deletingVersionId);
      setDeletingVersionId(null);
    }
  };

  // For sync status, we need to check the latest version without filters
  const { data: latestVersion } = useQuery({
    queryKey: ["app_versions_latest"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_versions")
        .select("version")
        .order("released_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.version || null;
    },
  });

  const latestDbVersion = latestVersion;
  const isSynced = latestDbVersion === APP_VERSION;

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchFilter(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setShowDeployConfirm(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('trigger-deploy', {
        body: { version_description: `Versão ${APP_VERSION}` }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        toast.success(data.message || 'Deploy iniciado com sucesso!');
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
                <span className="text-green-600">✓ Sincronizado</span>
              ) : (
                <span className="text-destructive">
                  ⚠ Desincronizado - Cadastre a versão {APP_VERSION}
                </span>
              )}
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Deploy Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Deploy para Produção
          </CardTitle>
          <CardDescription>
            Dispare o deploy para a Hostinger diretamente pelo painel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm">
                <strong>Versão atual:</strong> {APP_VERSION}
              </p>
              <p className="text-sm text-muted-foreground">
                O deploy irá compilar e enviar a versão atual do código para produção.
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a 
                  href="https://github.com/agendasuperapi/renda-recorrente2/actions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver Actions
                </a>
              </Button>
              <Button
                onClick={() => setShowDeployConfirm(true)}
                disabled={isDeploying}
                className="gap-2"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Disparando...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Deploy para Produção
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Alert variant="destructive">
        <FileCode className="h-4 w-4" />
        <AlertTitle>Importante: Atualize o arquivo de versão</AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            <p>
              Após cadastrar uma nova versão no banco de dados, você também deve atualizar o arquivo{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm">src/config/version.ts</code>{" "}
              com o número da nova versão.
            </p>
            <p className="text-sm text-muted-foreground">
              Ative o Dev Mode no canto superior esquerdo para editar o arquivo.
            </p>
          </div>
        </AlertDescription>
      </Alert>

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
                <li>A versão no banco está sincronizada</li>
                <li>Não há erros no preview</li>
              </ul>
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

      {/* Create Version Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Versão
          </CardTitle>
          <CardDescription>
            Cadastre uma nova versão do aplicativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="version">Número da Versão *</Label>
              <Input
                id="version"
                placeholder="Ex: 4.1.71"
                value={version}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  setVersion(value);
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Breve descrição desta versão"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

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
                />
                <Button type="button" onClick={handleAddChange} variant="outline" className="w-full md:w-auto">
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
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button type="submit" disabled={createVersionMutation.isPending} className="w-full md:w-auto">
              {createVersionMutation.isPending ? "Salvando..." : "Salvar Versão"}
            </Button>
          </form>
        </CardContent>
      </Card>

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
                        <Label htmlFor={`edit-version-${v.id}`}>Número da Versão *</Label>
                        <Input
                          id={`edit-version-${v.id}`}
                          value={editVersion}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setEditVersion(value);
                          }}
                          placeholder="Ex: 4.1.71"
                        />
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
                        <div>
                          <h3 className="font-semibold text-lg">v{v.version}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(v.released_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(v)}
                            disabled={editingVersionId !== null}
                            title="Duplicar versão"
                            className="h-9 w-9 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(v)}
                            disabled={editingVersionId !== null}
                            title="Editar versão"
                            className="h-9 w-9 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingVersionId(v.id)}
                            disabled={deleteVersionMutation.isPending || editingVersionId !== null}
                            title="Excluir versão"
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
