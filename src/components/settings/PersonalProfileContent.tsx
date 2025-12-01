import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { UsernameEditDialog } from "@/components/UsernameEditDialog";

export const PersonalProfileContent = () => {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    cpf: "",
    phone: "",
    birth_date: "",
    gender: "",
  });

  const [cpfStatus, setCpfStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    existingUser: string | null;
  }>({
    checking: false,
    available: null,
    existingUser: null,
  });

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
  }>({
    checking: false,
    available: null,
  });

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("name, username, cpf, phone, birth_date, gender")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name || "",
          username: data.username || "",
          cpf: formatCPF(data.cpf || ""),
          phone: formatPhone(data.phone || ""),
          birth_date: data.birth_date || "",
          gender: data.gender || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast.error("Erro ao carregar perfil");
    } finally {
      setLoadingProfile(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

  const checkCpfAvailability = async (cpf: string) => {
    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      setCpfStatus({ checking: false, available: null, existingUser: null });
      return;
    }

    setCpfStatus({ checking: true, available: null, existingUser: null });

    try {
      const { data, error } = await supabase.functions.invoke('check-cpf-availability', {
        body: { cpf: cleanCpf, userId }
      });

      if (error) throw error;

      setCpfStatus({
        checking: false,
        available: data.available,
        existingUser: data.existingUser,
      });
    } catch (error) {
      console.error("Error checking CPF:", error);
      setCpfStatus({ checking: false, available: null, existingUser: null });
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameStatus({ checking: false, available: null });
      return;
    }

    setUsernameStatus({ checking: true, available: null });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', userId)
        .maybeSingle();

      if (error) throw error;

      setUsernameStatus({
        checking: false,
        available: data === null,
      });
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameStatus({ checking: false, available: null });
    }
  };

  const handleCpfChange = (value: string) => {
    const formatted = formatCPF(value);
    setFormData({ ...formData, cpf: formatted });
    
    const cleanCpf = formatted.replace(/\D/g, "");
    if (cleanCpf.length === 11) {
      checkCpfAvailability(formatted);
    } else {
      setCpfStatus({ checking: false, available: null, existingUser: null });
    }
  };

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setFormData({ ...formData, username: cleaned });
    
    if (cleaned.length >= 3) {
      checkUsernameAvailability(cleaned);
    } else {
      setUsernameStatus({ checking: false, available: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cpfStatus.available === false) {
      toast.error("CPF já cadastrado por outro usuário");
      return;
    }

    if (usernameStatus.available === false) {
      toast.error("Username já está em uso");
      return;
    }

    setLoading(true);

    try {
      const cleanCpf = formData.cpf.replace(/\D/g, "");
      const cleanPhone = formData.phone.replace(/\D/g, "");

      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          username: formData.username,
          cpf: cleanCpf || null,
          phone: cleanPhone || null,
          birth_date: formData.birth_date || null,
          gender: formData.gender || null,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Dados pessoais atualizados com sucesso!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar dados pessoais");
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
            <CardDescription>
              Atualize suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="seu_username"
                  required
                  disabled
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUsernameDialog(true)}
                >
                  Editar
                </Button>
              </div>
              {usernameStatus.checking && (
                <p className="text-sm text-muted-foreground">Verificando...</p>
              )}
              {usernameStatus.available === true && (
                <p className="text-sm text-green-600">Username disponível</p>
              )}
              {usernameStatus.available === false && (
                <p className="text-sm text-destructive">Username já está em uso</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                placeholder="000.000.000-00"
                maxLength={14}
              />
              {cpfStatus.checking && (
                <p className="text-sm text-muted-foreground">Verificando CPF...</p>
              )}
              {cpfStatus.available === false && cpfStatus.existingUser && (
                <p className="text-sm text-destructive">
                  CPF já cadastrado por {cpfStatus.existingUser}
                </p>
              )}
              {cpfStatus.available === true && (
                <p className="text-sm text-green-600">CPF disponível</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de Nascimento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gênero</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu gênero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                  <SelectItem value="prefer_not_say">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </form>

      <UsernameEditDialog
        open={showUsernameDialog}
        onOpenChange={setShowUsernameDialog}
        currentUsername={formData.username}
        userId={userId || ""}
        onSuccess={() => {
          loadProfile();
          setShowUsernameDialog(false);
        }}
      />
    </>
  );
};
