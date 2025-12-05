import { useState, useEffect } from "react";
import { QrCodePix } from "qrcode-pix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, QrCode, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PixQRCodeProps {
  pixKey: string;
  pixType: string;
  amount: number;
  recipientName: string;
  transactionId: string;
}

export function PixQRCode({ pixKey, pixType, amount, recipientName, transactionId }: PixQRCodeProps) {
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [brCode, setBrCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setIsLoading(true);
        
        // Limpar o nome do destinatário (remover caracteres especiais)
        const cleanName = recipientName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .substring(0, 25)
          .trim() || "Afiliado";

        // Gerar ID da transação (máx 25 caracteres)
        const txId = transactionId
          .replace(/-/g, "")
          .substring(0, 25);

        const qrCodePix = QrCodePix({
          version: "01",
          key: pixKey,
          name: cleanName,
          city: "Brasil",
          transactionId: txId,
          value: amount,
        });

        const rawPix = qrCodePix.payload();
        setBrCode(rawPix);

        const base64 = await qrCodePix.base64();
        setQrCodeBase64(base64);
      } catch (error) {
        console.error("Erro ao gerar QR Code PIX:", error);
        toast.error("Erro ao gerar QR Code PIX");
      } finally {
        setIsLoading(false);
      }
    };

    if (pixKey && amount > 0) {
      generateQRCode();
    }
  }, [pixKey, amount, recipientName, transactionId]);

  const handleCopyBrCode = async () => {
    try {
      await navigator.clipboard.writeText(brCode);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar código");
    }
  };

  const handleCopyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      toast.success("Chave PIX copiada!");
    } catch (error) {
      toast.error("Erro ao copiar chave PIX");
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Gerando QR Code...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-5 w-5 text-primary" />
          QR Code PIX para Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        <div className="flex justify-center">
          {qrCodeBase64 ? (
            <img
              src={qrCodeBase64}
              alt="QR Code PIX"
              className="w-48 h-48 rounded-lg border-4 border-background shadow-lg"
            />
          ) : (
            <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Erro ao gerar QR</p>
            </div>
          )}
        </div>

        {/* Valor */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Valor do saque</p>
          <p className="text-2xl font-bold text-primary">
            {Number(amount).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })}
          </p>
        </div>

        {/* Chave PIX */}
        <div className="bg-background rounded-lg p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Chave PIX ({pixType.toUpperCase()})</p>
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-sm truncate flex-1">{pixKey}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyPixKey}
              className="h-7 px-2"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Beneficiário */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Beneficiário</p>
          <p className="text-sm font-medium">{recipientName}</p>
        </div>

        {/* Botão Copiar Código PIX */}
        <Button
          onClick={handleCopyBrCode}
          className="w-full"
          variant={copied ? "secondary" : "default"}
        >
          {copied ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Código Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Código PIX (Copia e Cola)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
