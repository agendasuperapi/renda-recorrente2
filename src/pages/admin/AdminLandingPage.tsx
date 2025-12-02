import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, GripVertical, CheckCircle2, Search, Edit2, Copy, LucideProps } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  avatar_url: string | null;
  rating: number;
  is_active: boolean;
  order_position: number;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  order_position: number;
}

interface Feature {
  id: string;
  name: string;
  icon: string;
  is_active: boolean;
  order_position: number;
}

interface HeroImage {
  id: string;
  name: string;
  light_image_url: string | null;
  dark_image_url: string | null;
  alt_text: string;
}

interface AnnouncementBanner {
  id: string;
  text: string;
  subtitle: string;
  is_active: boolean;
  background_color: string;
  text_color: string;
  button_text: string | null;
  button_url: string | null;
}

interface BannerTemplate {
  id: string;
  name: string;
  description: string | null;
  text: string;
  subtitle: string;
  background_color: string;
  text_color: string;
  button_text: string | null;
  button_url: string | null;
  preview_image_url: string | null;
  is_active: boolean;
}

// Componente para renderizar ícone dinamicamente
const DynamicIcon = ({ name, ...props }: { name: keyof typeof dynamicIconImports } & Omit<LucideProps, 'ref'>) => {
  const Icon = lazy(dynamicIconImports[name]);
  return (
    <Suspense fallback={<div className="h-6 w-6 bg-muted animate-pulse rounded" />}>
      <Icon {...props} />
    </Suspense>
  );
};

// Converte de PascalCase para kebab-case
const getKebabCase = (str: string) => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
};

const SortableTestimonialRow = ({ testimonial, onEdit, onDelete }: { 
  testimonial: Testimonial; 
  onEdit: (t: Testimonial) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: testimonial.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={testimonial.avatar_url || undefined} alt={testimonial.name} />
            <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{testimonial.name}</span>
            <span className="text-sm text-muted-foreground line-clamp-2">{testimonial.content}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>{testimonial.role}</TableCell>
      <TableCell>{"⭐".repeat(testimonial.rating)}</TableCell>
      <TableCell>
        <Badge variant={testimonial.is_active ? "default" : "secondary"}>
          {testimonial.is_active ? "Ativo" : "Inativo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(testimonial)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(testimonial.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

const SortableFaqRow = ({ faq, onEdit, onDelete }: { 
  faq: FAQ; 
  onEdit: (f: FAQ) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: faq.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell>
        <div className="space-y-2">
          <p className="font-bold">{faq.question}</p>
          <p className="text-sm text-muted-foreground">{faq.answer}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={faq.is_active ? "default" : "secondary"}>
          {faq.is_active ? "Ativo" : "Inativo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(faq)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(faq.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

const SortableFeatureRow = ({ feature, onEdit, onDelete }: { 
  feature: Feature; 
  onEdit: (f: Feature) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: feature.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Converte de PascalCase para kebab-case para o dynamicIconImports
  const getKebabCase = (str: string) => {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  };

  const iconName = getKebabCase(feature.icon) as keyof typeof dynamicIconImports;

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{feature.name}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {dynamicIconImports[iconName] ? (
            <DynamicIcon name={iconName} className="h-4 w-4 text-primary" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm text-muted-foreground">{feature.icon}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={feature.is_active ? "default" : "secondary"}>
          {feature.is_active ? "Ativo" : "Inativo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(feature)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(feature.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

const AdminLandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [announcementBanner, setAnnouncementBanner] = useState<AnnouncementBanner | null>(null);
  const [bannerTemplates, setBannerTemplates] = useState<BannerTemplate[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<BannerTemplate | null>(null);
  const [iconSearch, setIconSearch] = useState("");
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [uploadingHeroImage, setUploadingHeroImage] = useState<string | null>(null);
  
  const [bannerForm, setBannerForm] = useState({
    text: "",
    subtitle: "",
    is_active: true,
    background_color: "#10b981",
    text_color: "#ffffff",
    button_text: "",
    button_url: "",
  });

  const [testimonialForm, setTestimonialForm] = useState({
    name: "",
    role: "",
    content: "",
    avatar_url: "",
    rating: 5,
    is_active: true,
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    is_active: true,
  });

  const [featureForm, setFeatureForm] = useState({
    name: "",
    icon: "CheckCircle2",
    is_active: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const allIconNames = Object.keys(dynamicIconImports) as Array<keyof typeof dynamicIconImports>;
  
  const filteredIcons = allIconNames.filter(iconName =>
    iconName.toLowerCase().includes(iconSearch.toLowerCase())
  );

  // Preview do ícone selecionado
  const selectedIconKebab = getKebabCase(featureForm.icon) as keyof typeof dynamicIconImports;

  useEffect(() => {
    fetchTestimonials();
    fetchFaqs();
    fetchFeatures();
    fetchHeroImages();
    fetchAnnouncementBanner();
    fetchBannerTemplates();
  }, []);

  // Força a atualização do form quando o banner é carregado
  useEffect(() => {
    if (announcementBanner) {
      setBannerForm({
        text: announcementBanner.text || "",
        subtitle: announcementBanner.subtitle || "",
        is_active: announcementBanner.is_active ?? true,
        background_color: announcementBanner.background_color || "#10b981",
        text_color: announcementBanner.text_color || "#ffffff",
        button_text: announcementBanner.button_text || "",
        button_url: announcementBanner.button_url || "",
      });
    }
  }, [announcementBanner]);

  const fetchTestimonials = async () => {
    const { data } = await (supabase as any)
      .from("landing_testimonials")
      .select("*")
      .order("order_position");
    if (data) setTestimonials(data as Testimonial[]);
  };

  const fetchFaqs = async () => {
    const { data } = await (supabase as any)
      .from("landing_faqs")
      .select("*")
      .order("order_position");
    if (data) setFaqs(data as FAQ[]);
  };

  const fetchFeatures = async () => {
    const { data } = await (supabase as any)
      .from("landing_features")
      .select("*")
      .order("order_position");
    if (data) setFeatures(data as Feature[]);
  };

  const fetchHeroImages = async () => {
    const { data } = await (supabase as any)
      .from("landing_hero_images")
      .select("*")
      .order("name");
    if (data) setHeroImages(data as HeroImage[]);
  };

  const fetchAnnouncementBanner = async () => {
    const { data } = await (supabase as any)
      .from("landing_announcement_banner")
      .select("*")
      .maybeSingle();
    
    if (data) {
      setAnnouncementBanner(data as AnnouncementBanner);
      setBannerForm({
        text: data.text || "",
        subtitle: data.subtitle || "",
        is_active: data.is_active ?? true,
        background_color: data.background_color || "#10b981",
        text_color: data.text_color || "#ffffff",
        button_text: data.button_text || "",
        button_url: data.button_url || "",
      });
    } else {
      // Reset form if no banner exists
      setBannerForm({
        text: "",
        subtitle: "",
        is_active: true,
        background_color: "#10b981",
        text_color: "#ffffff",
        button_text: "",
        button_url: "",
      });
    }
  };

  const fetchBannerTemplates = async () => {
    const { data } = await (supabase as any)
      .from("banner_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at");
    
    if (data) {
      setBannerTemplates(data as BannerTemplate[]);
    }
  };

  const applyTemplate = (template: BannerTemplate) => {
    setBannerForm({
      text: template.text,
      subtitle: template.subtitle,
      background_color: template.background_color,
      text_color: template.text_color,
      button_text: template.button_text || "",
      button_url: template.button_url || "",
      is_active: bannerForm.is_active,
    });
    setShowTemplateDialog(false);
    toast({
      title: "Template aplicado!",
      description: `Template "${template.name}" foi aplicado ao banner.`,
    });
  };

  const handleSaveAsTemplate = async () => {
    if (!bannerForm.text) {
      toast({
        title: "Erro",
        description: "O texto principal é obrigatório para salvar como template",
        variant: "destructive"
      });
      return;
    }

    if (editingTemplate) {
      // Atualizando template existente
      try {
        const { error } = await (supabase as any)
          .from("banner_templates")
          .update({
            text: bannerForm.text,
            subtitle: bannerForm.subtitle,
            background_color: bannerForm.background_color,
            text_color: bannerForm.text_color,
            button_text: bannerForm.button_text,
            button_url: bannerForm.button_url,
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: `Template "${editingTemplate.name}" atualizado com sucesso!`
        });
        
        setEditingTemplate(null);
        fetchBannerTemplates();
      } catch (error: any) {
        toast({
          title: "Erro ao atualizar template",
          description: error.message,
          variant: "destructive"
        });
      }
    } else {
      // Criando novo template
      const templateName = prompt("Digite um nome para o template:");
      if (!templateName) return;

      try {
        const { error } = await (supabase as any)
          .from("banner_templates")
          .insert([{
            name: templateName,
            text: bannerForm.text,
            subtitle: bannerForm.subtitle,
            background_color: bannerForm.background_color,
            text_color: bannerForm.text_color,
            button_text: bannerForm.button_text,
            button_url: bannerForm.button_url,
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Template salvo com sucesso!"
        });
        
        fetchBannerTemplates();
      } catch (error: any) {
        toast({
          title: "Erro ao salvar template",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  const handleEditTemplate = (template: BannerTemplate) => {
    setEditingTemplate(template);
    setBannerForm({
      text: template.text,
      subtitle: template.subtitle,
      background_color: template.background_color,
      text_color: template.text_color,
      button_text: template.button_text || "",
      button_url: template.button_url || "",
      is_active: bannerForm.is_active,
    });
    setShowTemplateDialog(false);
    toast({
      title: "Template carregado",
      description: `Template "${template.name}" carregado para edição. Clique em "Salvar Template" para atualizar.`,
    });
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Deseja realmente excluir o template "${templateName}"?`)) {
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("banner_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Template excluído com sucesso!"
      });
      
      fetchBannerTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDuplicateTemplate = async (template: BannerTemplate) => {
    const newName = prompt("Digite um nome para o novo template:", `${template.name} (cópia)`);
    if (!newName) return;

    try {
      const { error } = await (supabase as any)
        .from("banner_templates")
        .insert([{
          name: newName,
          description: template.description,
          text: template.text,
          subtitle: template.subtitle,
          background_color: template.background_color,
          text_color: template.text_color,
          button_text: template.button_text,
          button_url: template.button_url,
          is_active: template.is_active,
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Template duplicado com sucesso!"
      });
      
      fetchBannerTemplates();
    } catch (error: any) {
      toast({
        title: "Erro ao duplicar template",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSaveBanner = async () => {
    try {
      if (announcementBanner?.id) {
        // Update existing
        const { error } = await (supabase as any)
          .from("landing_announcement_banner")
          .update(bannerForm)
          .eq("id", announcementBanner.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await (supabase as any)
          .from("landing_announcement_banner")
          .insert([bannerForm]);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Banner salvo com sucesso!"
      });
      
      fetchAnnouncementBanner();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const compressImage = async (file: File, maxWidth: number = 1200): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if needed
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/webp',
            0.85
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleHeroImageUpload = async (
    heroImageId: string,
    file: File,
    theme: 'light' | 'dark'
  ) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive"
      });
      return;
    }

    setUploadingHeroImage(`${heroImageId}-${theme}`);

    try {
      // Compress image
      const compressedBlob = await compressImage(file);
      
      const fileExt = 'webp';
      const fileName = `${heroImageId}-${theme}-${Date.now()}.${fileExt}`;
      const filePath = `hero/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, compressedBlob);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Update database
      const updateData = theme === 'light' 
        ? { light_image_url: publicUrl }
        : { dark_image_url: publicUrl };

      const { error: updateError } = await (supabase as any)
        .from("landing_hero_images")
        .update(updateData)
        .eq("id", heroImageId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Sucesso",
        description: `Imagem ${theme === 'light' ? 'clara' : 'escura'} atualizada!`
      });

      fetchHeroImages();
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingHeroImage(null);
    }
  };

  const resetTestimonialForm = () => {
    setTestimonialForm({
      name: "",
      role: "",
      content: "",
      avatar_url: "",
      rating: 5,
      is_active: true,
    });
    setEditingTestimonial(null);
    setShowTestimonialForm(false);
  };

  const resetFaqForm = () => {
    setFaqForm({
      question: "",
      answer: "",
      is_active: true,
    });
    setEditingFaq(null);
    setShowFaqForm(false);
  };

  const resetFeatureForm = () => {
    setFeatureForm({
      name: "",
      icon: "CheckCircle2",
      is_active: true,
    });
    setEditingFeature(null);
    setShowFeatureForm(false);
  };

  const handleSaveTestimonial = async () => {
    if (!testimonialForm.name || !testimonialForm.role || !testimonialForm.content) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (editingTestimonial) {
      const { error } = await (supabase as any)
        .from("landing_testimonials")
        .update(testimonialForm)
        .eq("id", editingTestimonial.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Depoimento atualizado!"
      });
    } else {
      const maxOrder = testimonials.length > 0 
        ? Math.max(...testimonials.map(t => t.order_position))
        : -1;

      const { error } = await (supabase as any)
        .from("landing_testimonials")
        .insert([{ ...testimonialForm, order_position: maxOrder + 1 }]);

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Depoimento criado!"
      });
    }

    resetTestimonialForm();
    fetchTestimonials();
  };

  const handleSaveFaq = async () => {
    if (!faqForm.question || !faqForm.answer) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (editingFaq) {
      const { error } = await (supabase as any)
        .from("landing_faqs")
        .update(faqForm)
        .eq("id", editingFaq.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "FAQ atualizada!"
      });
    } else {
      const maxOrder = faqs.length > 0 
        ? Math.max(...faqs.map(f => f.order_position))
        : -1;

      const { error } = await (supabase as any)
        .from("landing_faqs")
        .insert([{ ...faqForm, order_position: maxOrder + 1 }]);

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "FAQ criada!"
      });
    }

    resetFaqForm();
    fetchFaqs();
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este depoimento?")) return;

    const { error } = await (supabase as any)
      .from("landing_testimonials")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Depoimento excluído!"
    });
    fetchTestimonials();
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta FAQ?")) return;

    const { error } = await (supabase as any)
      .from("landing_faqs")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "FAQ excluída!"
    });
    fetchFaqs();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `testimonials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setTestimonialForm({ ...testimonialForm, avatar_url: publicUrl });

      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const editTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialForm({
      name: testimonial.name,
      role: testimonial.role,
      content: testimonial.content,
      avatar_url: testimonial.avatar_url || "",
      rating: testimonial.rating,
      is_active: testimonial.is_active,
    });
    setShowTestimonialForm(true);
  };

  const editFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      is_active: faq.is_active,
    });
    setShowFaqForm(true);
  };

  const editFeature = (feature: Feature) => {
    setEditingFeature(feature);
    setFeatureForm({
      name: feature.name,
      icon: feature.icon,
      is_active: feature.is_active,
    });
    setShowFeatureForm(true);
  };

  const handleSaveFeature = async () => {
    if (!featureForm.name || !featureForm.icon) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (editingFeature) {
      const { error } = await (supabase as any)
        .from("landing_features")
        .update(featureForm)
        .eq("id", editingFeature.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Funcionalidade atualizada!"
      });
    } else {
      const maxOrder = features.length > 0 
        ? Math.max(...features.map(f => f.order_position))
        : -1;

      const { error } = await (supabase as any)
        .from("landing_features")
        .insert([{ ...featureForm, order_position: maxOrder + 1 }]);

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Funcionalidade criada!"
      });
    }

    resetFeatureForm();
    fetchFeatures();
  };

  const handleDeleteFeature = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta funcionalidade?")) return;

    const { error } = await (supabase as any)
      .from("landing_features")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Funcionalidade excluída!"
    });
    fetchFeatures();
  };

  const handleDragEndFeatures = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = features.findIndex((f) => f.id === active.id);
    const newIndex = features.findIndex((f) => f.id === over.id);

    const newFeatures = arrayMove(features, oldIndex, newIndex);
    setFeatures(newFeatures);

    // Update order_position for all items
    const updates = newFeatures.map((feature, index) => 
      (supabase as any)
        .from("landing_features")
        .update({ order_position: index })
        .eq("id", feature.id)
    );

    await Promise.all(updates);

    toast({
      title: "Sucesso",
      description: "Ordem atualizada!"
    });
  };

  const handleDragEndTestimonials = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = testimonials.findIndex((t) => t.id === active.id);
    const newIndex = testimonials.findIndex((t) => t.id === over.id);

    const newTestimonials = arrayMove(testimonials, oldIndex, newIndex);
    setTestimonials(newTestimonials);

    // Update order_position for all items
    const updates = newTestimonials.map((testimonial, index) => 
      (supabase as any)
        .from("landing_testimonials")
        .update({ order_position: index })
        .eq("id", testimonial.id)
    );

    await Promise.all(updates);

    toast({
      title: "Sucesso",
      description: "Ordem atualizada!"
    });
  };

  const handleDragEndFaqs = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = faqs.findIndex((f) => f.id === active.id);
    const newIndex = faqs.findIndex((f) => f.id === over.id);

    const newFaqs = arrayMove(faqs, oldIndex, newIndex);
    setFaqs(newFaqs);

    // Update order_position for all items
    const updates = newFaqs.map((faq, index) => 
      (supabase as any)
        .from("landing_faqs")
        .update({ order_position: index })
        .eq("id", faq.id)
    );

    await Promise.all(updates);

    toast({
      title: "Sucesso",
      description: "Ordem atualizada!"
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração da Landing Page</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os depoimentos e perguntas frequentes da sua landing page
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="w-full lg:w-auto"
        >
          Ir para Landing Page
        </Button>
      </div>

      <Tabs defaultValue="banner" className="w-full">
        <TabsList>
          <TabsTrigger value="banner">Banner de Anúncio</TabsTrigger>
          <TabsTrigger value="hero">Imagens</TabsTrigger>
          <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="features">Funcionalidades</TabsTrigger>
        </TabsList>

        <TabsContent value="banner" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Banner de Anúncio</CardTitle>
              <CardDescription>
                Configure o banner de destaque que aparece no topo da página para promoções, lançamentos e anúncios especiais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-muted-foreground">
                  Use templates prontos ou personalize seu banner
                </div>
                <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      📋 Escolher Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Templates de Banners</DialogTitle>
                      <DialogDescription>
                        Escolha um template pré-definido para facilitar a criação do seu banner
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bannerTemplates.map((template) => (
                          <Card key={template.id} className="hover:border-primary transition-all">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <CardTitle className="text-lg">{template.name}</CardTitle>
                                  <CardDescription>{template.description}</CardDescription>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicateTemplate(template);
                                    }}
                                    title="Duplicar template"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTemplate(template);
                                    }}
                                    title="Editar nome"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTemplate(template.id, template.name);
                                    }}
                                    title="Excluir template"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div 
                                className="p-4 rounded-md mb-2"
                                style={{ 
                                  backgroundColor: template.background_color,
                                  color: template.text_color 
                                }}
                              >
                                <div 
                                  className="rich-text-preview text-sm"
                                  dangerouslySetInnerHTML={{ __html: template.text }}
                                />
                                {template.subtitle && (
                                  <div 
                                    className="rich-text-preview text-xs mt-1 opacity-90"
                                    dangerouslySetInnerHTML={{ __html: template.subtitle }}
                                  />
                                )}
                              </div>
                              <Button size="sm" className="w-full" onClick={() => applyTemplate(template)}>
                                Aplicar Template
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner-text">Texto Principal do Banner</Label>
                <div className="border rounded-md">
                  <ReactQuill
                    theme="snow"
                    value={bannerForm.text}
                    onChange={(value) => setBannerForm({ ...bannerForm, text: value })}
                    modules={{
                      toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'size': ['small', false, 'large', 'huge'] }],
                        ['clean']
                      ]
                    }}
                    placeholder="⚡ BLACK ZEN ⚡  Plano Anual com 50% Desconto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner-subtitle">Subtítulo (opcional)</Label>
                <div className="border rounded-md">
                  <ReactQuill
                    theme="snow"
                    value={bannerForm.subtitle}
                    onChange={(value) => setBannerForm({ ...bannerForm, subtitle: value })}
                    modules={{
                      toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'size': ['small', false, 'large'] }],
                        ['clean']
                      ]
                    }}
                    placeholder="🔥 Oferta por tempo limitado!"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bg-color">Cor de Fundo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bg-color"
                      type="color"
                      value={bannerForm.background_color}
                      onChange={(e) => setBannerForm({ ...bannerForm, background_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={bannerForm.background_color}
                      onChange={(e) => setBannerForm({ ...bannerForm, background_color: e.target.value })}
                      placeholder="#10b981"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text-color">Cor do Texto</Label>
                  <div className="flex gap-2">
                    <Input
                      id="text-color"
                      type="color"
                      value={bannerForm.text_color}
                      onChange={(e) => setBannerForm({ ...bannerForm, text_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={bannerForm.text_color}
                      onChange={(e) => setBannerForm({ ...bannerForm, text_color: e.target.value })}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="button-text">Texto do Botão (opcional)</Label>
                  <Input
                    id="button-text"
                    placeholder="APROVEITAR AGORA!"
                    value={bannerForm.button_text}
                    onChange={(e) => setBannerForm({ ...bannerForm, button_text: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="button-url">Link do Botão (opcional)</Label>
                  <Input
                    id="button-url"
                    placeholder="#planos ou https://..."
                    value={bannerForm.button_url}
                    onChange={(e) => setBannerForm({ ...bannerForm, button_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="banner-active"
                  checked={bannerForm.is_active}
                  onCheckedChange={(checked) => setBannerForm({ ...bannerForm, is_active: checked })}
                />
                <Label htmlFor="banner-active">Banner ativo (visível na página)</Label>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div 
                  className="w-full py-3 px-6 text-center rounded-md"
                  style={{ 
                    backgroundColor: bannerForm.background_color,
                  }}
                >
                  <div className="flex flex-col md:flex-row items-center justify-center gap-3">
                    <div className="flex-1 text-center">
                      {bannerForm.text ? (
                        <div 
                          className="text-sm font-semibold rich-text-preview"
                          dangerouslySetInnerHTML={{ __html: bannerForm.text }}
                          style={{ color: bannerForm.text_color }}
                        />
                      ) : (
                        <p className="text-sm font-semibold" style={{ color: bannerForm.text_color }}>
                          Digite o texto principal acima
                        </p>
                      )}
                      {bannerForm.subtitle && (
                        <div 
                          className="text-xs mt-1 rich-text-preview"
                          dangerouslySetInnerHTML={{ __html: bannerForm.subtitle }}
                          style={{ color: bannerForm.text_color }}
                        />
                      )}
                    </div>
                    {bannerForm.button_text && (
                      <Button size="sm" className="shrink-0">
                        {bannerForm.button_text}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveBanner} className="flex-1">
                  Salvar Banner
                </Button>
                <Button onClick={handleSaveAsTemplate} variant="secondary" className="flex-1">
                  {editingTemplate ? `Atualizar Template "${editingTemplate.name}"` : "Salvar Template"}
                </Button>
                {editingTemplate && (
                  <Button 
                    onClick={() => {
                      setEditingTemplate(null);
                      toast({
                        title: "Edição cancelada",
                        description: "Voltando ao modo de criação de template"
                      });
                    }} 
                    variant="outline"
                  >
                    Cancelar Edição
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hero" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Imagens da Landing Page</CardTitle>
              <CardDescription>
                Gerencie todas as imagens da landing page. As imagens serão comprimidas automaticamente para melhor performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {heroImages.map((heroImage) => (
                <Card key={heroImage.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{heroImage.name}</CardTitle>
                    <CardDescription>{heroImage.alt_text}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Light Theme */}
                      <div className="space-y-2">
                        <Label>Imagem Tema Claro</Label>
                        {heroImage.light_image_url && (
                          <div className="border rounded-lg p-4 bg-white">
                            <img
                              src={heroImage.light_image_url}
                              alt={`${heroImage.alt_text} - Claro`}
                              className="max-h-40 mx-auto object-contain"
                            />
                          </div>
                        )}
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleHeroImageUpload(heroImage.id, file, 'light');
                          }}
                          disabled={uploadingHeroImage === `${heroImage.id}-light`}
                        />
                        {uploadingHeroImage === `${heroImage.id}-light` && (
                          <p className="text-sm text-muted-foreground">Comprimindo e enviando...</p>
                        )}
                      </div>

                      {/* Dark Theme */}
                      <div className="space-y-2">
                        <Label>Imagem Tema Escuro</Label>
                        {heroImage.dark_image_url && (
                          <div className="border rounded-lg p-4 bg-gray-900">
                            <img
                              src={heroImage.dark_image_url}
                              alt={`${heroImage.alt_text} - Escuro`}
                              className="max-h-40 mx-auto object-contain"
                            />
                          </div>
                        )}
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleHeroImageUpload(heroImage.id, file, 'dark');
                          }}
                          disabled={uploadingHeroImage === `${heroImage.id}-dark`}
                        />
                        {uploadingHeroImage === `${heroImage.id}-dark` && (
                          <p className="text-sm text-muted-foreground">Comprimindo e enviando...</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testimonials" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Depoimentos</CardTitle>
                  <CardDescription>Gerencie os depoimentos de clientes. Arraste para reordenar.</CardDescription>
                </div>
                <Button
                  onClick={() => setShowTestimonialForm(!showTestimonialForm)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showTestimonialForm ? "Cancelar" : "Novo Depoimento"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showTestimonialForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingTestimonial ? "Editar Depoimento" : "Novo Depoimento"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                          id="name"
                          value={testimonialForm.name}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Cargo/Função *</Label>
                        <Input
                          id="role"
                          value={testimonialForm.role}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, role: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="content">Depoimento *</Label>
                      <Textarea
                        id="content"
                        value={testimonialForm.content}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, content: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="avatar_upload">Avatar</Label>
                        <Input
                          id="avatar_upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={uploadingAvatar}
                        />
                        {uploadingAvatar && (
                          <p className="text-sm text-muted-foreground mt-1">Enviando imagem...</p>
                        )}
                        {testimonialForm.avatar_url && !uploadingAvatar && (
                          <div className="mt-2">
                            <img 
                              src={testimonialForm.avatar_url} 
                              alt="Preview" 
                              className="h-16 w-16 rounded-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="rating">Avaliação (1-5)</Label>
                        <Input
                          id="rating"
                          type="number"
                          min="1"
                          max="5"
                          value={testimonialForm.rating}
                          onChange={(e) => setTestimonialForm({ ...testimonialForm, rating: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={testimonialForm.is_active}
                        onCheckedChange={(checked) => setTestimonialForm({ ...testimonialForm, is_active: checked })}
                      />
                      <Label htmlFor="active">Ativo</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveTestimonial}>
                        {editingTestimonial ? "Atualizar" : "Criar"}
                      </Button>
                      <Button variant="outline" onClick={resetTestimonialForm}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndTestimonials}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={testimonials.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {testimonials.map((testimonial) => (
                        <SortableTestimonialRow
                          key={testimonial.id}
                          testimonial={testimonial}
                          onEdit={editTestimonial}
                          onDelete={handleDeleteTestimonial}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Perguntas Frequentes</CardTitle>
                  <CardDescription>Gerencie as FAQs da landing page. Arraste para reordenar.</CardDescription>
                </div>
                <Button
                  onClick={() => setShowFaqForm(!showFaqForm)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showFaqForm ? "Cancelar" : "Nova FAQ"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showFaqForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingFaq ? "Editar FAQ" : "Nova FAQ"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="question">Pergunta *</Label>
                      <Input
                        id="question"
                        value={faqForm.question}
                        onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="answer">Resposta *</Label>
                      <Textarea
                        id="answer"
                        value={faqForm.answer}
                        onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="faq_active"
                        checked={faqForm.is_active}
                        onCheckedChange={(checked) => setFaqForm({ ...faqForm, is_active: checked })}
                      />
                      <Label htmlFor="faq_active">Ativo</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveFaq}>
                        {editingFaq ? "Atualizar" : "Criar"}
                      </Button>
                      <Button variant="outline" onClick={resetFaqForm}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndFaqs}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Pergunta e Resposta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={faqs.map(f => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {faqs.map((faq) => (
                        <SortableFaqRow
                          key={faq.id}
                          faq={faq}
                          onEdit={editFaq}
                          onDelete={handleDeleteFaq}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Funcionalidades</CardTitle>
                  <CardDescription>Gerencie as funcionalidades do sistema exibidas na landing page. Arraste para reordenar.</CardDescription>
                </div>
                <Button
                  onClick={() => setShowFeatureForm(!showFeatureForm)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showFeatureForm ? "Cancelar" : "Nova Funcionalidade"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showFeatureForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {editingFeature ? "Editar Funcionalidade" : "Nova Funcionalidade"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="feature_name">Nome *</Label>
                      <Input
                        id="feature_name"
                        value={featureForm.name}
                        onChange={(e) => setFeatureForm({ ...featureForm, name: e.target.value })}
                        placeholder="Ex: Dashboard completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="feature_icon">Ícone *</Label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Input
                            id="feature_icon"
                            value={featureForm.icon}
                            onChange={(e) => setFeatureForm({ ...featureForm, icon: e.target.value })}
                            placeholder="Ex: CheckCircle2"
                            readOnly
                          />
                        </div>
                        <Dialog open={iconDialogOpen} onOpenChange={setIconDialogOpen}>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm">
                              <Search className="h-4 w-4 mr-2" />
                              Selecionar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Selecione um ícone</DialogTitle>
                              <DialogDescription>
                                Pesquise e selecione o ícone que deseja usar
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Pesquisar ícone..."
                                  value={iconSearch}
                                  onChange={(e) => setIconSearch(e.target.value)}
                                  className="pl-10"
                                />
                              </div>
                              <ScrollArea className="h-96">
                                <div className="grid grid-cols-6 gap-3 p-1">
                                  {filteredIcons.slice(0, 200).map((iconName) => {
                                    // Converte de kebab-case para PascalCase para exibição
                                    const displayName = iconName
                                      .split('-')
                                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                      .join('');
                                    
                                    return (
                                      <button
                                        key={iconName}
                                        type="button"
                                        onClick={() => {
                                          setFeatureForm({ ...featureForm, icon: displayName });
                                          setIconDialogOpen(false);
                                          setIconSearch("");
                                        }}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:border-primary hover:bg-accent ${
                                          featureForm.icon === displayName ? "border-primary bg-accent" : "border-border"
                                        }`}
                                      >
                                        <DynamicIcon name={iconName} className="h-6 w-6" />
                                        <span className="text-xs text-center break-all">{displayName}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {filteredIcons.length > 200 && (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    Mostrando 200 de {filteredIcons.length} ícones. Continue pesquisando para refinar.
                                  </p>
                                )}
                              </ScrollArea>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
                          {dynamicIconImports[selectedIconKebab] ? (
                            <DynamicIcon name={selectedIconKebab} className="h-5 w-5 text-primary" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                          <span className="text-sm text-muted-foreground">Preview</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="feature_active"
                        checked={featureForm.is_active}
                        onCheckedChange={(checked) => setFeatureForm({ ...featureForm, is_active: checked })}
                      />
                      <Label htmlFor="feature_active">Ativo</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveFeature}>
                        {editingFeature ? "Atualizar" : "Criar"}
                      </Button>
                      <Button variant="outline" onClick={resetFeatureForm}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndFeatures}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Ícone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={features.map(f => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {features.map((feature) => (
                        <SortableFeatureRow
                          key={feature.id}
                          feature={feature}
                          onEdit={editFeature}
                          onDelete={handleDeleteFeature}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLandingPage;
