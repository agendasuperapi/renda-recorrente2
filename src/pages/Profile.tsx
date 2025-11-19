import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Profile = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    username: "",
    phone: "",
    cpf: "",
    gender: "",
    birth_date: "",
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
    pix_type: "",
    pix_key: "",
    affiliate_code: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    if (data) {
      setProfile({
        name: data.name || "",
        username: data.username || "",
        phone: data.phone || "",
        cpf: data.cpf || "",
        gender: data.gender || "",
        birth_date: data.birth_date || "",
        cep: data.cep || "",
        street: data.street || "",
        number: data.number || "",
        complement: data.complement || "",
        neighborhood: data.neighborhood || "",
        city: data.city || "",
        state: data.state || "",
        instagram: data.instagram || "",
        facebook: data.facebook || "",
        tiktok: data.tiktok || "",
        pix_type: data.pix_type || "",
        pix_key: data.pix_key || "",
        affiliate_code: data.affiliate_code || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        username: profile.username,
        phone: profile.phone,
        cpf: profile.cpf,
        gender: profile.gender,
        birth_date: profile.birth_date || null,
        cep: profile.cep,
        street: profile.street,
        number: profile.number,
        complement: profile.complement,
        neighborhood: profile.neighborhood,
        city: profile.city,
        state: profile.state,
        instagram: profile.instagram,
        facebook: profile.facebook,
        tiktok: profile.tiktok,
        pix_type: profile.pix_type,
        pix_key: profile.pix_key,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Perfil atualizado",
      description: "Suas informações foram salvas com sucesso!",
    });
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cadastro Afiliado</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e de pagamento
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="username">Nome de Usuário</Label>
                  <Input
                    id="username"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={profile.cpf}
                    onChange={(e) => setProfile({ ...profile, cpf: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={profile.birth_date}
                    onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gênero</Label>
                  <Select
                    value={profile.gender}
                    onValueChange={(value) => setProfile({ ...profile, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={profile.cep}
                    onChange={(e) => setProfile({ ...profile, cep: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={profile.street}
                    onChange={(e) => setProfile({ ...profile, street: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={profile.number}
                    onChange={(e) => setProfile({ ...profile, number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={profile.complement}
                    onChange={(e) => setProfile({ ...profile, complement: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={profile.neighborhood}
                    onChange={(e) => setProfile({ ...profile, neighborhood: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={profile.state}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                    maxLength={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Redes Sociais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={profile.instagram}
                    onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                    placeholder="@usuario"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={profile.facebook}
                    onChange={(e) => setProfile({ ...profile, facebook: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input
                    id="tiktok"
                    value={profile.tiktok}
                    onChange={(e) => setProfile({ ...profile, tiktok: e.target.value })}
                    placeholder="@usuario"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pix_type">Tipo de Chave PIX</Label>
                  <Select
                    value={profile.pix_type}
                    onValueChange={(value) => setProfile({ ...profile, pix_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pix_key">Chave PIX</Label>
                  <Input
                    id="pix_key"
                    value={profile.pix_key}
                    onChange={(e) => setProfile({ ...profile, pix_key: e.target.value })}
                  />
                </div>
              </div>

              {profile.affiliate_code && (
                <div>
                  <Label>Código de Afiliado</Label>
                  <Input value={profile.affiliate_code} disabled />
                </div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
