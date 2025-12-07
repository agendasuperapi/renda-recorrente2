import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, X, Image as ImageIcon } from "lucide-react";
import { ReferenceSelector, Reference } from "./ReferenceSelector";

const ticketSchema = z.object({
  ticket_type: z.enum(["problema", "sugestao", "reclamacao", "duvida", "financeiro", "tecnico", "outro"]),
  priority: z.enum(["baixa", "normal", "alta", "urgente"]),
  subject: z.string().min(5, "O assunto deve ter pelo menos 5 caracteres").max(100, "O assunto deve ter no máximo 100 caracteres"),
  message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres").max(2000, "A mensagem deve ter no máximo 2000 caracteres"),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const typeOptions = [
  { value: "problema", label: "Problema" },
  { value: "sugestao", label: "Sugestão" },
  { value: "reclamacao", label: "Reclamação" },
  { value: "duvida", label: "Dúvida" },
  { value: "financeiro", label: "Financeiro" },
  { value: "tecnico", label: "Técnico" },
  { value: "outro", label: "Outro" },
];

const priorityOptions = [
  { value: "baixa", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export function CreateTicketDialog({ open, onOpenChange, onSuccess }: CreateTicketDialogProps) {
  const { userId } = useAuth();
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      ticket_type: "duvida",
      priority: "normal",
      subject: "",
      message: "",
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error("Máximo de 5 imagens permitido");
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} não é uma imagem válida`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede o tamanho máximo de 5MB`);
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (ticketId: string): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const image of images) {
      const ext = image.name.split('.').pop();
      const fileName = `${userId}/${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("support-attachments")
        .upload(fileName, image);

      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("support-attachments")
        .getPublicUrl(fileName);

      urls.push(urlData.publicUrl);
    }

    return urls;
  };

  const onSubmit = async (data: TicketFormData) => {
    if (!userId) return;

    setIsSubmitting(true);
    try {
      // Build metadata with references if any
      const metadata: Record<string, any> = {};
      if (references.length > 0) {
        metadata.references = references.map(ref => ({
          type: ref.type,
          id: ref.id,
          label: ref.label,
          details: ref.details
        }));
      }

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: userId,
          ticket_type: data.ticket_type,
          priority: data.priority,
          subject: data.subject,
          status: "open",
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Upload images if any
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages(ticket.id);
      }

      // Build message with references info
      let fullMessage = data.message;
      if (references.length > 0) {
        const refTexts = references.map(ref => {
          const typeLabels: Record<string, string> = {
            commission: "Comissão",
            referral: "Indicação", 
            sub_affiliate: "Sub-afiliado"
          };
          return `[${typeLabels[ref.type]}: ${ref.label}${ref.details ? ` - ${ref.details}` : ''}]`;
        });
        fullMessage = `${data.message}\n\n📎 Referências vinculadas:\n${refTexts.join('\n')}`;
      }

      // Create first message
      const { error: messageError } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: userId,
          message: fullMessage,
          image_urls: imageUrls,
          is_admin: false,
        });

      if (messageError) throw messageError;

      toast.success("Chamado criado com sucesso!");
      form.reset();
      setImages([]);
      setImagePreviews([]);
      setReferences([]);
      onSuccess();
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Erro ao criar chamado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const Content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ticket_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assunto</FormLabel>
              <FormControl>
                <Input placeholder="Descreva brevemente o problema" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva detalhadamente sua solicitação..."
                  className="min-h-[120px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image Upload */}
        <div className="space-y-2">
          <FormLabel>Anexar Imagens (opcional)</FormLabel>
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Até 5 imagens, máximo 5MB cada
          </p>
        </div>

        {/* Reference Selector */}
        <ReferenceSelector
          selectedReferences={references}
          onReferencesChange={setReferences}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar Chamado
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Novo Chamado</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto">
            {Content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Chamado</DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
