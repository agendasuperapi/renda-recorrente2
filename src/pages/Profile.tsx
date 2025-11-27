import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, KeyboardEvent, useRef } from "react";
import { User, CheckCircle2, XCircle, Loader2, Edit2, Camera } from "lucide-react";
import { UsernameEditDialog } from "@/components/UsernameEditDialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingCpf, setCheckingCpf] = useState(false);
  const [cpfAvailable, setCpfAvailable] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
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
    avatar_url: "",
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [viewAvatarOpen, setViewAvatarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setCurrentUserId(user.id);

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
        avatar_url: data.avatar_url || "",
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (!form) return;

      const inputs = Array.from(form.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
        'input:not([type="submit"]):not([disabled]), select, textarea, button[type="submit"]'
      ));
      
      const currentIndex = inputs.indexOf(e.currentTarget);
      const nextInput = inputs[currentIndex + 1];
      
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const formatCep = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 5) {
      return cleaned;
    }
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) {
      return cleaned;
    }
    if (cleaned.length <= 7) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    }
    if (cleaned.length <= 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handleCepChange = async (value: string) => {
    // Remove caracteres não numéricos
    const cleanCep = value.replace(/\D/g, '');
    setProfile({ ...profile, cep: cleanCep });

    // Busca CEP quando tiver 8 dígitos
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setProfile(prev => ({
            ...prev,
            cep: cleanCep,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          }));
          
          toast({
            title: "CEP encontrado",
            description: "Endereço preenchido automaticamente!",
          });
        } else {
          toast({
            title: "CEP não encontrado",
            description: "Verifique o CEP digitado.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        toast({
          title: "Erro ao buscar CEP",
          description: "Não foi possível buscar o endereço.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setProfile({ ...profile, phone: cleaned });
  };

  const checkCpfAvailability = async (cpf: string) => {
    if (!cpf || cpf.length !== 11) {
      setCpfAvailable(null);
      return false;
    }

    setCheckingCpf(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-cpf-availability', {
        body: { cpf, userId: currentUserId }
      });

      if (error) throw error;

      const isAvailable = data.available;
      setCpfAvailable(isAvailable);
      
      if (!isAvailable) {
        toast({
          title: "CPF já cadastrado",
          description: `Este CPF já está sendo utilizado${data.existingUser ? ` por ${data.existingUser}` : ''}.`,
          variant: "destructive",
        });
      }
      
      return isAvailable;
    } catch (error) {
      console.error('Erro ao verificar CPF:', error);
      setCpfAvailable(null);
      toast({
        title: "Erro ao verificar CPF",
        description: "Não foi possível verificar a disponibilidade do CPF.",
        variant: "destructive",
      });
      return false;
    } finally {
      setCheckingCpf(false);
    }
  };

  const handleCpfChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setProfile({ ...profile, cpf: cleaned });
    
    // Reset CPF availability when changing
    if (cleaned.length !== 11) {
      setCpfAvailable(null);
    }

    // Verifica disponibilidade e consulta CPF quando tiver 11 dígitos
    if (cleaned.length === 11) {
      // Primeiro verifica se o CPF já está cadastrado
      const isAvailable = await checkCpfAvailability(cleaned);
      
      // Só consulta os dados se o CPF estiver disponível
      if (isAvailable) {
        try {
          const { data, error } = await supabase.functions.invoke('consultar-cpf', {
            body: { 
              cpf: cleaned,
              birthDate: profile.birth_date || undefined
            },
          });

          if (error) throw error;

          if (!data.error) {
            const updates: any = {};
            
            // Preenche nome completo
            if (data.name) {
              updates.name = data.name;
            }
            
            // Preenche data de nascimento se disponível
            if (data.birthDate && data.birthDate !== '****-**-**') {
              updates.birth_date = data.birthDate;
            }
            
            // Preenche gênero se disponível
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
              setProfile(prev => ({ ...prev, ...updates }));
              toast({
                title: "Dados encontrados",
                description: "Informações preenchidas automaticamente!",
              });
            }
          } else {
            toast({
              title: "CPF não encontrado na base",
              description: "Não foi possível consultar os dados do CPF, mas você pode prosseguir com o cadastro.",
            });
          }
        } catch (error) {
          console.error('Erro ao consultar CPF:', error);
          toast({
            title: "Erro ao consultar CPF",
            description: "Não foi possível buscar os dados, mas você pode prosseguir com o cadastro.",
          });
        }
      }
    }
  };

  const formatCpf = (value: string) => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const normalizeUsername = (value: string) => {
    // Remove espaços e caracteres especiais, mantém apenas letras e números
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', currentUserId)
        .maybeSingle();

      if (error) throw error;

      // Se data existe, significa que o username já está em uso
      setUsernameAvailable(data === null);
    } catch (error) {
      console.error('Erro ao verificar username:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    const normalized = normalizeUsername(value);
    setProfile({ ...profile, username: normalized });
    
    // Debounce para verificar disponibilidade
    if (normalized.length >= 3) {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(normalized);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setUsernameAvailable(null);
    }
  };

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB for original)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Create object URL for cropping
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setCropDialogOpen(true);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCroppedImage = async (croppedImageBlob: Blob) => {
    setUploadingAvatar(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
        if (oldPath && oldPath.startsWith('profiles/')) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload compressed and cropped avatar
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedImageBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });

      // Cleanup
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop("");
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro ao fazer upload",
        description: "Não foi possível atualizar sua foto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar se o CPF está disponível antes de salvar
    if (profile.cpf && cpfAvailable === false) {
      toast({
        title: "CPF já cadastrado",
        description: "Este CPF já está sendo utilizado por outro usuário.",
        variant: "destructive",
      });
      return;
    }
    
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Cadastro Afiliado</h1>
            <p className="text-muted-foreground">
              Gerencie suas informações pessoais e de pagamento
            </p>
          </div>
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar 
                className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => profile.avatar_url && setViewAvatarOpen(true)}
              >
                <AvatarImage src={profile.avatar_url} alt={profile.name} />
                <AvatarFallback className="text-2xl">
                  {profile.name?.charAt(0)?.toUpperCase() || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <p className="text-xs text-muted-foreground text-center">
              Clique para {profile.avatar_url ? 'visualizar ou ' : ''}alterar<br />foto de perfil
            </p>
          </div>
        </div>

        <UsernameEditDialog
          open={usernameDialogOpen}
          onOpenChange={setUsernameDialogOpen}
          currentUsername={profile.username}
          userId={currentUserId}
          onSuccess={loadProfile}
        />

        <AvatarCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
        />

        {/* Avatar Preview Dialog */}
        <Dialog open={viewAvatarOpen} onOpenChange={setViewAvatarOpen}>
          <DialogContent className="max-w-2xl p-0">
            <div className="relative w-full aspect-square">
              <img 
                src={profile.avatar_url} 
                alt={profile.name}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>

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
                    onKeyDown={handleKeyDown}
                    required
                  />
                </div>
                <div className="relative">
                  <Label htmlFor="username">Nome de Usuário</Label>
                  <div className="flex gap-2">
                    <Input
                      id="username"
                      value={profile.username}
                      disabled
                      placeholder="seuusername"
                      className="bg-muted"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setUsernameDialogOpen(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <div className="relative">
                    <Input
                      id="cpf"
                      value={formatCpf(profile.cpf)}
                      onChange={(e) => handleCpfChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className={cpfAvailable === false ? "border-destructive" : cpfAvailable === true ? "border-green-500" : ""}
                    />
                    {checkingCpf && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!checkingCpf && cpfAvailable === true && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                    {!checkingCpf && cpfAvailable === false && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <XCircle className="h-4 w-4 text-destructive" />
                      </div>
                    )}
                  </div>
                  {cpfAvailable === true && profile.cpf.length === 11 && (
                    <p className="text-xs text-green-600 mt-1">CPF disponível para cadastro</p>
                  )}
                  {cpfAvailable === false && (
                    <p className="text-xs text-destructive mt-1">CPF já cadastrado no sistema</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formatPhone(profile.phone)}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={profile.birth_date}
                    onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
                    onKeyDown={handleKeyDown}
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
                    value={formatCep(profile.cep)}
                    onChange={(e) => handleCepChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div>
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={profile.street}
                    onChange={(e) => setProfile({ ...profile, street: e.target.value })}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div>
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={profile.number}
                    onChange={(e) => setProfile({ ...profile, number: e.target.value })}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div>
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={profile.complement}
                    onChange={(e) => setProfile({ ...profile, complement: e.target.value })}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div>
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={profile.neighborhood}
                    onChange={(e) => setProfile({ ...profile, neighborhood: e.target.value })}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={profile.state}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
                    placeholder="@usuario"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={profile.facebook}
                    onChange={(e) => setProfile({ ...profile, facebook: e.target.value })}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div>
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input
                    id="tiktok"
                    value={profile.tiktok}
                    onChange={(e) => setProfile({ ...profile, tiktok: e.target.value })}
                    onKeyDown={handleKeyDown}
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
                    onKeyDown={handleKeyDown}
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
  );
};

export default Profile;
