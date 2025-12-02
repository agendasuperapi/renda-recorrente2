import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { GitBranch, Plus, Trash2, AlertCircle, CheckCircle2, Pencil, X, Check, Copy, FileCode } from "lucide-react";
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
import { APP_VERSION } from "@/config/version";

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
  const [version, setVersion] = useState("");
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

  const { data: versions, isLoading } = useQuery({
    queryKey: ["app_versions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_versions")
        .select("*")
        .order("released_at", { ascending: false });

      if (error) throw error;
      return data as Version[];
    },
  });

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
      toast.success("Versão cadastrada com sucesso!");
      setVersion("");
      setDescription("");
      setChanges([]);
      setChangeInput("");
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

  const latestDbVersion = versions?.[0]?.version;
  const isSynced = latestDbVersion === APP_VERSION;

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
                onChange={(e) => setVersion(e.target.value)}
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
              <div className="flex gap-2">
                <Input
                  id="change"
                  placeholder="Digite uma mudança e clique em Adicionar"
                  value={changeInput}
                  onChange={(e) => setChangeInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddChange())}
                />
                <Button type="button" onClick={handleAddChange} variant="outline">
                  Adicionar
                </Button>
              </div>
              {changes.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {changes.map((change, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <span className="flex-1">• {change}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveChange(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button type="submit" disabled={createVersionMutation.isPending}>
              {createVersionMutation.isPending ? "Salvando..." : "Salvar Versão"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Versions List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Versões</CardTitle>
          <CardDescription>
            Todas as versões cadastradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : versions && versions.length > 0 ? (
            <div className="space-y-4">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`border rounded-lg p-4 space-y-2 ${
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
                          onChange={(e) => setEditVersion(e.target.value)}
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
                        <div className="flex gap-2">
                          <Input
                            value={editChangeInput}
                            onChange={(e) => setEditChangeInput(e.target.value)}
                            placeholder="Adicionar nova mudança"
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEditChange())}
                          />
                          <Button type="button" onClick={handleAddEditChange} variant="outline" size="sm">
                            Adicionar
                          </Button>
                        </div>
                        {editChanges.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {editChanges.map((change, index) => (
                              <li key={index} className="flex items-center gap-2 text-sm">
                                {editingChangeIndex === index ? (
                                  <>
                                    <Input
                                      value={editingChangeText}
                                      onChange={(e) => setEditingChangeText(e.target.value)}
                                      className="flex-1"
                                      onKeyPress={(e) => e.key === "Enter" && handleSaveEditChange(index)}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSaveEditChange(index)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEditChange}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex-1">• {change}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleStartEditChange(index)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveEditChange(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveEdit}
                          disabled={updateVersionMutation.isPending}
                          size="sm"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {updateVersionMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">v{v.version}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(v.released_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(v)}
                            disabled={editingVersionId !== null}
                            title="Duplicar versão"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(v)}
                            disabled={editingVersionId !== null}
                            title="Editar versão"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingVersionId(v.id)}
                            disabled={deleteVersionMutation.isPending || editingVersionId !== null}
                            title="Excluir versão"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {v.description && (
                        <p className="text-sm">{v.description}</p>
                      )}
                      {v.changes && v.changes.length > 0 && (
                        <ul className="text-sm space-y-1">
                          {v.changes.map((change, idx) => (
                            <li key={idx}>• {change}</li>
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
              Nenhuma versão cadastrada ainda.
            </p>
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
