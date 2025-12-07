import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImagePreviewDialogProps {
  imageUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImagePreviewDialog({
  imageUrl,
  open,
  onOpenChange,
}: ImagePreviewDialogProps) {
  if (!imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `imagem-${Date.now()}.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90">
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Download button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="absolute top-2 right-14 z-10 bg-black/50 hover:bg-black/70 text-white"
          >
            <Download className="w-5 h-5" />
          </Button>

          {/* Image */}
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-auto max-h-[85vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
