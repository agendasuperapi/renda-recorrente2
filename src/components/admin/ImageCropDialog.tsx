import { useState, useCallback, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Crop, ImageIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  imageFile: File;
  aspectRatio?: number;
  aspectRatioLabel?: string;
  onComplete: (blob: Blob) => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

const getCroppedImage = async (
  imageSrc: string,
  pixelCrop: Area,
  quality: number = 0.9
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
};

export const ImageCropDialog = ({
  open,
  onOpenChange,
  imageSrc,
  imageFile,
  aspectRatio = 16 / 9,
  aspectRatioLabel = "16:9",
  onComplete,
}: ImageCropDialogProps) => {
  const [mode, setMode] = useState<"original" | "crop">("original");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMode("original");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open]);

  const onCropCompleteHandler = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (mode === "original") {
        // Use original file as blob
        onComplete(imageFile);
        onOpenChange(false);
      } else if (croppedAreaPixels) {
        const croppedBlob = await getCroppedImage(imageSrc, croppedAreaPixels);
        onComplete(croppedBlob);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajustar Imagem</DialogTitle>
          <DialogDescription>
            Escolha manter o tamanho original ou recortar nas proporções recomendadas
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={mode}
          onValueChange={(value) => setMode(value as "original" | "crop")}
          className="grid grid-cols-2 gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="original" id="original" />
            <Label htmlFor="original" className="flex items-center gap-2 cursor-pointer">
              <ImageIcon className="h-4 w-4" />
              Manter tamanho original
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="crop" id="crop" />
            <Label htmlFor="crop" className="flex items-center gap-2 cursor-pointer">
              <Crop className="h-4 w-4" />
              Recortar ({aspectRatioLabel})
            </Label>
          </div>
        </RadioGroup>

        <div className="relative h-[350px] bg-muted rounded-lg overflow-hidden">
          {mode === "original" ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={imageSrc}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          ) : (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteHandler}
              onZoomChange={setZoom}
            />
          )}
        </div>

        {mode === "crop" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Use o scroll do mouse ou o controle acima para ajustar o zoom
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Processando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
