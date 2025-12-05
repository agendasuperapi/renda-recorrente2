import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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

// CRC16 CCITT implementation for browser
function crc16ccitt(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
    crc &= 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Generate PIX EMV payload
function generatePixPayload(
  pixKey: string,
  name: string,
  city: string,
  amount: number,
  transactionId: string
): string {
  const formatField = (id: string, value: string): string => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  // Clean name and city (remove special characters)
  const cleanName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .substring(0, 25)
    .trim() || "Afiliado";

  const cleanCity = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .substring(0, 15)
    .trim() || "Brasil";

  const cleanTxId = transactionId
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 25) || "***";

  // GUI for PIX
  const gui = formatField("00", "br.gov.bcb.pix");
  // PIX key
  const key = formatField("01", pixKey);
  // Merchant Account Information (ID 26)
  const merchantAccountInfo = formatField("26", gui + key);

  // Build payload
  let payload = "";
  payload += formatField("00", "01"); // Payload Format Indicator
  payload += merchantAccountInfo; // Merchant Account Information
  payload += formatField("52", "0000"); // Merchant Category Code
  payload += formatField("53", "986"); // Transaction Currency (BRL)
  
  if (amount > 0) {
    payload += formatField("54", amount.toFixed(2)); // Transaction Amount
  }
  
  payload += formatField("58", "BR"); // Country Code
  payload += formatField("59", cleanName); // Merchant Name
  payload += formatField("60", cleanCity); // Merchant City
  payload += formatField("62", formatField("05", cleanTxId)); // Additional Data Field (Transaction ID)
  payload += "6304"; // CRC16 placeholder

  // Calculate CRC16
  const crc = crc16ccitt(payload);
  
  return payload + crc;
}

// Generate QR Code as data URL using Canvas API
async function generateQRCodeDataURL(text: string): Promise<string> {
  // Using a simple QR code generator approach
  // We'll use the qrcode library which is already installed
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 256,
    margin: 2,
  });
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
        
        // Generate PIX payload
        const payload = generatePixPayload(
          pixKey,
          recipientName,
          "Brasil",
          amount,
          transactionId
        );
        
        setBrCode(payload);

        // Generate QR Code
        const qrDataUrl = await generateQRCodeDataURL(payload);
        setQrCodeBase64(qrDataUrl);
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
      <Card className="border border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="mt-1 text-xs text-muted-foreground">Gerando QR Code...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-primary/30 bg-primary/5">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <QrCode className="h-4 w-4" />
          PIX - {Number(amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </div>
        
        {/* QR Code */}
        <div className="flex justify-center">
          {qrCodeBase64 ? (
            <img
              src={qrCodeBase64}
              alt="QR Code PIX"
              className="w-32 h-32 rounded border-2 border-background shadow"
            />
          ) : (
            <div className="w-32 h-32 bg-muted rounded flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Erro</p>
            </div>
          )}
        </div>

        {/* Chave PIX compacta */}
        <div className="bg-background rounded p-2 text-xs">
          <span className="text-muted-foreground">{pixType.toUpperCase()}: </span>
          <span className="font-mono">{pixKey}</span>
        </div>

        {/* Botão Copiar */}
        <Button
          onClick={handleCopyBrCode}
          className="w-full h-8 text-xs"
          size="sm"
          variant={copied ? "secondary" : "default"}
        >
          {copied ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copiar Código PIX
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
