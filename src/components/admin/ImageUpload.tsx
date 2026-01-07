import React, { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ImageEditorDialog, ImageEditorValue } from "./ImageEditorDialog";
import { ImageCropDialog } from "./ImageCropDialog";

// Aspect ratio mappings for crop dialog with recommended dimensions
const ASPECT_RATIOS: Record<string, { ratio: number; label: string }> = {
  "aspect-video": { ratio: 16 / 9, label: "16:9 (400x225px)" },
  "aspect-[16/9]": { ratio: 16 / 9, label: "16:9 (400x225px)" },
  "aspect-[3/1]": { ratio: 3 / 1, label: "3:1 (1200x400px)" },
  "aspect-[4/3]": { ratio: 4 / 3, label: "4:3" },
  "aspect-[3/4]": { ratio: 3 / 4, label: "3:4" },
  "aspect-square": { ratio: 1, label: "1:1" },
  "aspect-[1/1]": { ratio: 1, label: "1:1" },
  "aspect-[2/1]": { ratio: 2 / 1, label: "2:1" },
  "aspect-[21/9]": { ratio: 21 / 9, label: "21:9" },
};

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  aspectRatio?: string;
  hint?: string;
  /** If true, shows the advanced editor button */
  showEditor?: boolean;
  /** 
   * If true, the editor will show text overlay options (title, subtitle, colors, alignment).
   * Set to true for banners that need text overlays.
   * Defaults to true for full editing capabilities.
   */
  editorWithText?: boolean;
  /** Additional image metadata for editor */
  editorValue?: ImageEditorValue;
  /** Callback for full editor value changes */
  onEditorChange?: (value: ImageEditorValue) => void;
  /** If true, shows crop dialog when selecting image (default: true) */
  showCropDialog?: boolean;
}

export const ImageUpload = ({
  label,
  value,
  onChange,
  bucket = "training-images",
  folder = "general",
  aspectRatio = "aspect-video",
  hint,
  showEditor = true,
  editorWithText = true,
  editorValue,
  onEditorChange,
  showCropDialog = true,
}: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectRatioConfig = ASPECT_RATIOS[aspectRatio] || { ratio: 16 / 9, label: "16:9" };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Tipo de arquivo inválido. Use JPG, PNG, WebP ou GIF.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    if (showCropDialog) {
      // Open crop dialog
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImageSrc(reader.result as string);
        setSelectedFile(file);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    } else {
      // Upload directly without crop
      await uploadFile(file);
    }
  };

  const uploadFile = async (fileOrBlob: File | Blob) => {
    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = fileOrBlob instanceof File 
        ? fileOrBlob.name.split(".").pop()?.toLowerCase() || 'jpg'
        : 'jpg';
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const fileName = `${folder}/${Date.now()}_${uniqueId}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileOrBlob, {
          cacheControl: "3600",
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      onChange(urlData.publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar imagem: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropComplete = async (blob: Blob) => {
    await uploadFile(blob);
    setSelectedFile(null);
    setSelectedImageSrc("");
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      // Extract path from URL
      const urlParts = value.split(`${bucket}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from(bucket).remove([filePath]);
      }
    } catch (error) {
      console.error("Error removing file:", error);
    }

    onChange("");
  };

  const handleEditorSave = (newValue: ImageEditorValue) => {
    onChange(newValue.imageUrl);
    if (onEditorChange) {
      onEditorChange(newValue);
    }
  };

  const currentEditorValue: ImageEditorValue = editorValue || {
    imageUrl: value,
    title: "",
    subtitle: "",
    textColor: "#ffffff",
    textAlign: "center",
    overlayColor: "#000000",
    overlayOpacity: 40,
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className={`relative ${aspectRatio} bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden`}>
        {value ? (
          <>
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
            />
            
            {/* Show text overlay preview if configured */}
            {editorWithText && currentEditorValue && (currentEditorValue.title || currentEditorValue.subtitle) && (
              <>
                {/* Overlay background */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundColor: currentEditorValue.overlayColor || "#000000",
                    opacity: (currentEditorValue.overlayOpacity ?? 40) / 100
                  }}
                />
                {/* Text content */}
                <div 
                  className={`absolute inset-0 flex flex-col justify-center px-4 pointer-events-none ${
                    currentEditorValue.textAlign === "left" ? "items-start text-left" :
                    currentEditorValue.textAlign === "right" ? "items-end text-right" :
                    "items-center text-center"
                  }`}
                >
                  {currentEditorValue.title && (
                    <h4
                      className="text-sm sm:text-base md:text-lg font-bold leading-tight"
                      style={{ color: currentEditorValue.textColor || "#ffffff" }}
                    >
                      {currentEditorValue.title}
                    </h4>
                  )}
                  {currentEditorValue.subtitle && (
                    <p
                      className="mt-1 text-xs sm:text-sm opacity-90 line-clamp-2"
                      style={{ color: currentEditorValue.textColor || "#ffffff" }}
                    >
                      {currentEditorValue.subtitle}
                    </p>
                  )}
                </div>
              </>
            )}
            
            {/* Hover actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {showEditor && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditorOpen(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-1" />
                Trocar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-1" />
                Remover
              </Button>
            </div>
          </>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Clique para enviar</span>
                {showEditor && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditorOpen(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Abrir editor avançado
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}

      {/* URL Manual fallback */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">ou cole uma URL:</span>
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="h-8 text-xs"
        />
      </div>

      {/* Image Editor Dialog */}
      {showEditor && (
        <ImageEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          value={currentEditorValue}
          onSave={handleEditorSave}
          title={`Editar: ${label}`}
          bucket={bucket}
          folder={folder}
          simpleMode={!editorWithText}
          aspectRatio={aspectRatioConfig.ratio}
          aspectRatioLabel={aspectRatioConfig.label}
        />
      )}

      {/* Image Crop Dialog */}
      {showCropDialog && selectedFile && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={(open) => {
            setCropDialogOpen(open);
            if (!open) {
              setSelectedFile(null);
              setSelectedImageSrc("");
            }
          }}
          imageSrc={selectedImageSrc}
          imageFile={selectedFile}
          aspectRatio={aspectRatioConfig.ratio}
          aspectRatioLabel={aspectRatioConfig.label}
          onComplete={handleCropComplete}
        />
      )}
    </div>
  );
};
