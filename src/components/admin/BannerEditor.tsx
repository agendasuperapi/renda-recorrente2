import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  Smartphone, 
  Tablet, 
  Monitor,
  AlignLeft,
  AlignCenter,
  AlignRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BannerEditorProps {
  value: {
    imageUrl: string;
    title?: string;
    subtitle?: string;
    textColor?: string;
    textAlign?: "left" | "center" | "right";
    overlayOpacity?: number;
    overlayColor?: string;
  };
  onChange: (value: BannerEditorProps["value"]) => void;
  bucket?: string;
  folder?: string;
  /** If true, hides text overlay options and shows only image upload */
  simpleMode?: boolean;
}

type DevicePreview = "mobile" | "tablet" | "desktop";

const deviceDimensions = {
  mobile: { width: 375, height: 200, label: "Celular" },
  tablet: { width: 768, height: 280, label: "Tablet" },
  desktop: { width: 1200, height: 350, label: "Computador" },
};

export const BannerEditor = ({
  value,
  onChange,
  bucket = "training-images",
  folder = "banners",
  simpleMode = false,
}: BannerEditorProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [activePreview, setActivePreview] = useState<DevicePreview>("desktop");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Tipo de arquivo inválido. Use JPG, PNG, WebP ou GIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || 'jpg';
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const fileName = `${folder}/${Date.now()}_${uniqueId}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      onChange({ ...value, imageUrl: urlData.publicUrl });
      toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar imagem: " + error.message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    onChange({ ...value, imageUrl: "" });
  };

  const getPreviewStyle = () => {
    const device = deviceDimensions[activePreview];
    return {
      width: "100%",
      maxWidth: device.width,
      aspectRatio: `${device.width} / ${device.height}`,
    };
  };

  const getTextAlignClass = () => {
    switch (value.textAlign) {
      case "left":
        return "items-start text-left";
      case "right":
        return "items-end text-right";
      default:
        return "items-center text-center";
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="space-y-2">
        <Label>Imagem de Fundo</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {value.imageUrl ? "Trocar Imagem" : "Enviar Imagem"}
          </Button>
          {value.imageUrl && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Input
          type="url"
          value={value.imageUrl}
          onChange={(e) => onChange({ ...value, imageUrl: e.target.value })}
          placeholder="Ou cole uma URL de imagem..."
          className="text-sm"
        />
      </div>

      {/* Text Content - only shown if not simpleMode */}
      {!simpleMode && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={value.title || ""}
                onChange={(e) => onChange({ ...value, title: e.target.value })}
                placeholder="Digite o título..."
              />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo (opcional)</Label>
              <Input
                value={value.subtitle || ""}
                onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
                placeholder="Digite o subtítulo..."
              />
            </div>
          </div>

          {/* Styling Options */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Cor do Texto</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={value.textColor || "#ffffff"}
                  onChange={(e) => onChange({ ...value, textColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={value.textColor || "#ffffff"}
                  onChange={(e) => onChange({ ...value, textColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor da Sobreposição</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={value.overlayColor || "#000000"}
                  onChange={(e) => onChange({ ...value, overlayColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={value.overlayColor || "#000000"}
                  onChange={(e) => onChange({ ...value, overlayColor: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alinhamento</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={value.textAlign === "left" ? "default" : "outline"}
                  size="icon"
                  onClick={() => onChange({ ...value, textAlign: "left" })}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={value.textAlign === "center" || !value.textAlign ? "default" : "outline"}
                  size="icon"
                  onClick={() => onChange({ ...value, textAlign: "center" })}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={value.textAlign === "right" ? "default" : "outline"}
                  size="icon"
                  onClick={() => onChange({ ...value, textAlign: "right" })}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Overlay Opacity */}
          <div className="space-y-2">
            <Label>Opacidade da Sobreposição: {value.overlayOpacity ?? 50}%</Label>
            <Slider
              value={[value.overlayOpacity ?? 50]}
              onValueChange={([val]) => onChange({ ...value, overlayOpacity: val })}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </>
      )}

      {/* Device Preview Selector */}
      <div className="space-y-2">
        <Label>Pré-visualização</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={activePreview === "mobile" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePreview("mobile")}
            className="flex-1"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Celular
          </Button>
          <Button
            type="button"
            variant={activePreview === "tablet" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePreview("tablet")}
            className="flex-1"
          >
            <Tablet className="h-4 w-4 mr-2" />
            Tablet
          </Button>
          <Button
            type="button"
            variant={activePreview === "desktop" ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePreview("desktop")}
            className="flex-1"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Computador
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">
          {deviceDimensions[activePreview].label} ({deviceDimensions[activePreview].width}x{deviceDimensions[activePreview].height}px)
        </Label>
        <div className="flex justify-center bg-muted/30 p-4 rounded-lg border">
          <div
            className="relative overflow-hidden rounded-lg shadow-lg transition-all duration-300"
            style={getPreviewStyle()}
          >
            {/* Background Image */}
            {value.imageUrl ? (
              <img
                src={value.imageUrl}
                alt="Banner preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/40 flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}

            {/* Overlay - only shown if not simpleMode */}
            {!simpleMode && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: value.overlayColor || "#000000",
                  opacity: (value.overlayOpacity ?? 50) / 100,
                }}
              />
            )}

            {/* Text Content - only shown if not simpleMode */}
            {!simpleMode && (
              <div
                className={cn(
                  "absolute inset-0 flex flex-col justify-center p-4 sm:p-6 lg:p-8",
                  getTextAlignClass()
                )}
              >
                {value.title && (
                  <h2
                    className={cn(
                      "font-bold leading-tight",
                      activePreview === "mobile" ? "text-lg" : activePreview === "tablet" ? "text-2xl" : "text-3xl"
                    )}
                    style={{ color: value.textColor || "#ffffff" }}
                  >
                    {value.title}
                  </h2>
                )}
                {value.subtitle && (
                  <p
                    className={cn(
                      "mt-1 opacity-90",
                      activePreview === "mobile" ? "text-sm" : activePreview === "tablet" ? "text-base" : "text-lg"
                    )}
                    style={{ color: value.textColor || "#ffffff" }}
                  >
                    {value.subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
