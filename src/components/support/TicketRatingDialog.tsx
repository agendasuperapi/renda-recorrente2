import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketRatingDialogProps {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TicketRatingDialog({
  ticketId,
  open,
  onOpenChange,
  onSuccess,
}: TicketRatingDialogProps) {
  const isMobile = useIsMobile();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Por favor, selecione uma avaliação");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          rating,
          rating_comment: comment.trim() || null,
        })
        .eq("id", ticketId);

      if (error) throw error;

      toast.success("Obrigado pela sua avaliação!");
      setRating(0);
      setComment("");
      onSuccess();
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Erro ao enviar avaliação");
    } finally {
      setIsSubmitting(false);
    }
  };

  const Content = (
    <div className="space-y-6">
      {/* Stars */}
      <div className="flex flex-col items-center space-y-3">
        <Label className="text-center">Como foi seu atendimento?</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "w-10 h-10 transition-colors",
                  (hoveredRating || rating) >= star
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm text-muted-foreground">
            {rating === 1 && "Péssimo"}
            {rating === 2 && "Ruim"}
            {rating === 3 && "Regular"}
            {rating === 4 && "Bom"}
            {rating === 5 && "Excelente"}
          </p>
        )}
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label htmlFor="comment">Comentário (opcional)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte-nos mais sobre sua experiência..."
          className="min-h-[100px] resize-none"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">
          {comment.length}/500
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Pular
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enviar Avaliação
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Avaliar Atendimento</DrawerTitle>
            <DrawerDescription>
              Sua avaliação nos ajuda a melhorar nosso suporte
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            {Content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar Atendimento</DialogTitle>
          <DialogDescription>
            Sua avaliação nos ajuda a melhorar nosso suporte
          </DialogDescription>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
