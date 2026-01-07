import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BannerEditor } from "./BannerEditor";

export interface ImageEditorValue {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  overlayOpacity?: number;
  overlayColor?: string;
}

interface ImageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ImageEditorValue;
  onSave: (value: ImageEditorValue) => void;
  title?: string;
  bucket?: string;
  folder?: string;
  /** If true, shows only image upload without text overlay options */
  simpleMode?: boolean;
  /** Aspect ratio for crop dialog (e.g., 16/9) */
  aspectRatio?: number;
  /** Label for aspect ratio (e.g., "16:9 (400x225px)") */
  aspectRatioLabel?: string;
}

export const ImageEditorDialog = ({
  open,
  onOpenChange,
  value,
  onSave,
  title = "Editor de Imagem",
  bucket = "training-images",
  folder = "general",
  simpleMode = false,
  aspectRatio,
  aspectRatioLabel,
}: ImageEditorDialogProps) => {
  const [draft, setDraft] = useState<ImageEditorValue>(value);

  // Sync draft with value when dialog opens
  useEffect(() => {
    if (open) {
      setDraft({
        imageUrl: value.imageUrl || "",
        title: value.title || "",
        subtitle: value.subtitle || "",
        textColor: value.textColor || "#ffffff",
        textAlign: value.textAlign || "center",
        overlayColor: value.overlayColor || "#000000",
        overlayOpacity: value.overlayOpacity ?? 40,
      });
    }
  }, [open, value]);

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <BannerEditor
          value={draft}
          onChange={setDraft}
          bucket={bucket}
          folder={folder}
          simpleMode={simpleMode}
          aspectRatio={aspectRatio}
          aspectRatioLabel={aspectRatioLabel}
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!draft.imageUrl}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
