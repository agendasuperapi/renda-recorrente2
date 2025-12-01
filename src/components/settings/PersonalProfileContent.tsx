import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, User, MapPin, Share2, Instagram, Facebook, Video } from "lucide-react";
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
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    instagram: "",
    facebook: "",
    tiktok: "",
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
        .select("name, username, cpf, phone, birth_date, gender, cep, street, number, complement, neighborhood, city, state, instagram, facebook, tiktok")
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
          cep: formatCEP(data.cep || ""),
          street: data.street || "",
          number: data.number || "",
          complement: data.complement || "",
          neighborhood: data.neighborhood || "",
          city: data.city || "",
          state: data.state || "",
          instagram: data.instagram || "",
          facebook: data.facebook || "",
          tiktok: data.tiktok || "",
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

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
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

  const handleCpfChange = async (value: string) => {
    const formatted = formatCPF(value);
    setFormData({ ...formData, cpf: formatted });
    
    const cleanCpf = formatted.replace(/\D/g, "");
    if (cleanCpf.length === 11) {
      await checkCpfAvailability(formatted);
      
      // Após verificar disponibilidade, consultar dados do CPF
      try {
        const { data, error } = await supabase.functions.invoke('consultar-cpf', {
          body: { 
            cpf: cleanCpf,
            birthDate: formData.birth_date || undefined
          },
        });

        if (error) throw error;

        if (!data.error) {
          const updates: any = {};
          
          if (data.name) {
            updates.name = data.name;
          }
          
          if (data.birthDate && data.birthDate !== '****-**-**') {
            updates.birth_date = data.birthDate;
          }
          
          if (data.gender) {
            const genderMap: { [key: string]: string } = {
              'm': 'masculino',
              'f': 'feminino',
              'male': 'masculino',
              'female': 'feminino'
            };
            updates.gender = genderMap[data.gender.toLowerCase()] || data.gender;
          }

          if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, ...updates }));
            toast.success("Dados encontrados e preenchidos automaticamente!");
          }
        }
      } catch (error) {
        console.error('Erro ao consultar CPF:', error);
        // Não mostra erro para o usuário, apenas não preenche automaticamente
      }
    } else {
      setCpfStatus({ checking: false, available: null, existingUser: null });
    }
  };

  const handleCepChange = async (value: string) => {
    const formatted = formatCEP(value);
    setFormData({ ...formData, cep: formatted });

    const cleanCep = formatted.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
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
      const cleanCep = formData.cep.replace(/\D/g, "");

      const { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          username: formData.username,
          cpf: cleanCpf || null,
          phone: cleanPhone || null,
          birth_date: formData.birth_date || null,
          gender: formData.gender || null,
          cep: cleanCep || null,
          street: formData.street || null,
          number: formData.number || null,
          complement: formData.complement || null,
          neighborhood: formData.neighborhood || null,
          city: formData.city || null,
          state: formData.state || null,
          instagram: formData.instagram || null,
          facebook: formData.facebook || null,
          tiktok: formData.tiktok || null,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Dados atualizados com sucesso!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar dados");
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
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Meu Perfil</CardTitle>
            <CardDescription className="text-sm">
              Gerencie suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="personal" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Dados Pessoais</span>
                  <span className="sm:hidden">Dados</span>
                </TabsTrigger>
                <TabsTrigger value="address" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                  Endereço
                </TabsTrigger>
                <TabsTrigger value="social" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Redes Sociais</span>
                  <span className="sm:hidden">Redes</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="name" className="text-sm">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Seu nome completo"
                    required
                    className="text-sm sm:text-base"
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
              </TabsContent>

              <TabsContent value="address" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Nome da rua"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="123"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      placeholder="Apto, bloco, etc"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Nome do bairro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@seuusuario"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook" className="flex items-center gap-2">
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </Label>
                  <Input
                    id="facebook"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="facebook.com/seuusuario"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tiktok" className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    TikTok
                  </Label>
                  <Input
                    id="tiktok"
                    value={formData.tiktok}
                    onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                    placeholder="@seuusuario"
                  />
                </div>
              </TabsContent>
            </Tabs>
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
