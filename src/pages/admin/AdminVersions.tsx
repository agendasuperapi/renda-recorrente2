import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { GitBranch, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

  const latestDbVersion = versions?.[0]?.version;
  const isSynced = latestDbVersion === APP_VERSION;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <GitBranch className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Gerenciamento de Versões</h1>
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
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">v{v.version}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(v.released_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteVersionMutation.mutate(v.id)}
                      disabled={deleteVersionMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
    </div>
  );
}
