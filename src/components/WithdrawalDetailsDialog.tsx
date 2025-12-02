import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, CheckCircle, XCircle, Clock, ImagePlus, Undo2, FileText, Percent } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";

export type WithdrawalData = {
  id: string;
  affiliate_id: string;
  amount: number;
  status: string;
  pix_key: string;
  pix_type: string;
  requested_date: string;
  approved_date: string | null;
  paid_date: string | null;
  rejected_reason: string | null;
  approved_by: string | null;
  commission_ids: string[];
  payment_proof_url: string[];
  created_at: string;
  profiles?: {
    name: string;
    email: string;
    username: string;
  };
};

type PaymentProofFile = {
  file: File;
  previewUrl: string;
  id: string;
};

interface WithdrawalDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal: WithdrawalData | null;
  showAdminActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onPaid?: (id: string, proofs: PaymentProofFile[]) => void;
  onRevert?: (id: string) => void;
  isActionPending?: boolean;
}

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: React.ReactNode }> = {
    pending: { variant: "outline", label: "Pendente", icon: <Clock className="h-3 w-3" /> },
    approved: { variant: "secondary", label: "Aprovado", icon: <CheckCircle className="h-3 w-3" /> },
    paid: { variant: "default", label: "Pago", icon: <CheckCircle className="h-3 w-3" /> },
    rejected: { variant: "destructive", label: "Rejeitado", icon: <XCircle className="h-3 w-3" /> }
  };
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
};

export function WithdrawalDetailsDialog({
  open,
  onOpenChange,
  withdrawal,
  showAdminActions = false,
  onApprove,
  onReject,
  onPaid,
  onRevert,
  isActionPending = false
}: WithdrawalDetailsDialogProps) {
  const isMobile = useIsMobile();
  const [rejectReason, setRejectReason] = useState("");
  const [paymentProofs, setPaymentProofs] = useState<PaymentProofFile[]>([]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  // Buscar comissões do saque
  const { data: commissions } = useQuery({
    queryKey: ["withdrawal-commissions", withdrawal?.id],
    queryFn: async () => {
      if (!withdrawal?.commission_ids || withdrawal.commission_ids.length === 0) return [];
      const { data, error } = await supabase
        .from("commissions")
        .select(`
          *,
          products (nome),
          subscriptions (
            plans (name)
          ),
          unified_users (name, email)
        `)
        .in("id", withdrawal.commission_ids);
      if (error) throw error;
      return data;
    },
    enabled: !!withdrawal?.id && open
  });

  const handleAddProof = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const newProofs: PaymentProofFile[] = [];
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newProofs.push({
          file,
          previewUrl: reader.result as string,
          id: crypto.randomUUID()
        });
        if (newProofs.length === files.length) {
          setPaymentProofs(prev => [...prev, ...newProofs]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveProof = (id: string) => {
    setPaymentProofs(prev => prev.filter(p => p.id !== id));
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setRejectReason("");
      setPaymentProofs([]);
    }
    onOpenChange(open);
  };

  if (!withdrawal) return null;

  const DetailsContent = () => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Afiliado</p>
        <p className="font-medium">{withdrawal.profiles?.name}</p>
        <p className="text-xs text-muted-foreground">{withdrawal.profiles?.email}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Status</p>
        {getStatusBadge(withdrawal.status)}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Valor</p>
        <p className="font-bold text-lg">
          {Number(withdrawal.amount).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          })}
        </p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Data Solicitação</p>
        <p className="font-medium">
          {format(new Date(withdrawal.requested_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Chave PIX</p>
        <p className="font-mono text-sm">{withdrawal.pix_key}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Tipo PIX</p>
        <p className="uppercase">{withdrawal.pix_type}</p>
      </div>
      {withdrawal.approved_date && (
        <div>
          <p className="text-sm text-muted-foreground">Data Aprovação</p>
          <p className="font-medium">
            {format(new Date(withdrawal.approved_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
        </div>
      )}
      {withdrawal.paid_date && (
        <div>
          <p className="text-sm text-muted-foreground">Data Pagamento</p>
          <p className="font-medium">
            {format(new Date(withdrawal.paid_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
        </div>
      )}
      {withdrawal.rejected_reason && (
        <div className="col-span-2">
          <p className="text-sm text-muted-foreground">Motivo da Rejeição</p>
          <p className="text-destructive">{withdrawal.rejected_reason}</p>
        </div>
      )}
    </div>
  );

  const PaymentProofsSection = () => (
    <>
      {(withdrawal.status === "approved" || withdrawal.status === "paid") && (
        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label>
              {withdrawal.status === "paid" ? "Comprovantes anexados" : "Anexar Comprovantes de Pagamento PIX"}
            </Label>
            {showAdminActions && withdrawal.status !== "paid" && (
              <div className="mt-2">
                <input
                  id="payment-proof-dialog"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddProof}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('payment-proof-dialog')?.click()}
                  className="w-full"
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Adicionar Comprovantes
                </Button>
              </div>
            )}
          </div>

          {((paymentProofs.length > 0 && withdrawal.status !== "paid") ||
            (withdrawal.status === "paid" && withdrawal.payment_proof_url && withdrawal.payment_proof_url.length > 0)) && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Comprovantes de Pagamento ({paymentProofs.length > 0 ? paymentProofs.length : withdrawal.payment_proof_url?.length || 0})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {paymentProofs.length > 0 && withdrawal.status !== "paid" && paymentProofs.map(proof => (
                  <div key={proof.id} className="relative group">
                    <img
                      src={proof.previewUrl}
                      alt="Pré-visualização do comprovante"
                      className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        setViewerImageUrl(proof.previewUrl);
                        setImageViewerOpen(true);
                      }}
                    />
                    {showAdminActions && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveProof(proof.id)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}

                {withdrawal.status === "paid" && withdrawal.payment_proof_url && withdrawal.payment_proof_url.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Comprovante ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        setViewerImageUrl(url);
                        setImageViewerOpen(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {withdrawal.status === "paid" && (!withdrawal.payment_proof_url || withdrawal.payment_proof_url.length === 0) && (
            <p className="text-xs text-muted-foreground">Nenhum comprovante anexado</p>
          )}
        </div>
      )}
    </>
  );

  const CommissionsTable = () => (
    <>
      {commissions && commissions.length > 0 ? (
        isMobile ? (
          <div className="space-y-2">
            {commissions.map((commission: any) => (
              <Card key={commission.id} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="text-sm font-medium truncate">{commission.unified_users?.name || "N/A"}</p>
                      <p className="text-xs text-muted-foreground truncate">{commission.unified_users?.email || "N/A"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        N{commission.level || 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{commission.percentage}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Produto</p>
                      <p className="font-medium truncate">{commission.products?.nome || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Plano</p>
                      <p className="font-medium truncate">{commission.subscriptions?.plans?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {format(new Date(commission.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-semibold">
                        {Number(commission.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Produto/Plano</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Nível/%</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission: any) => (
                  <TableRow key={commission.id}>
                    <TableCell className="text-xs whitespace-nowrap py-2">
                      {format(new Date(commission.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{commission.products?.nome || "N/A"}</span>
                        <span className="text-xs text-muted-foreground">{commission.subscriptions?.plans?.name || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium truncate max-w-[120px]">{commission.unified_users?.name || "N/A"}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{commission.unified_users?.email || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          N{commission.level || 1}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{commission.percentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-right py-2">
                      {Number(commission.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Nenhuma comissão vinculada a este saque
        </p>
      )}
    </>
  );

  const AdminActions = () => {
    if (!showAdminActions) return null;

    return (
      <>
        {withdrawal.status === "pending" && (
          <>
            <Button
              variant="destructive"
              onClick={() => onReject?.(withdrawal.id, rejectReason)}
              disabled={isActionPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              variant="default"
              onClick={() => onApprove?.(withdrawal.id)}
              disabled={isActionPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          </>
        )}
        {withdrawal.status === "approved" && (
          <Button
            variant="default"
            onClick={() => onPaid?.(withdrawal.id, paymentProofs)}
            disabled={isActionPending || paymentProofs.length === 0}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Marcar como Pago
          </Button>
        )}
        {withdrawal.status === "paid" && (
          <Button
            variant="outline"
            onClick={() => onRevert?.(withdrawal.id)}
            disabled={isActionPending}
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Estornar Pagamento
          </Button>
        )}
      </>
    );
  };

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={handleDialogChange}>
          <DrawerContent className="max-h-[95vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle>Detalhes do Saque</DrawerTitle>
            </DrawerHeader>
            <Tabs defaultValue="details" className="w-full px-4">
              <TabsList className="grid w-full grid-cols-2 mb-3">
                <TabsTrigger value="details" className="gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  Detalhes
                </TabsTrigger>
                <TabsTrigger value="commissions" className="gap-1.5 text-xs">
                  <Percent className="h-3.5 w-3.5" />
                  Comissões ({withdrawal.commission_ids?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-0">
                <ScrollArea className="h-[calc(85vh-180px)]">
                  <div className="space-y-3 pr-3">
                    <DetailsContent />
                    {showAdminActions && withdrawal.status === "pending" && (
                      <div className="space-y-2 pt-3 border-t mt-3">
                        <Textarea
                          placeholder="Motivo da rejeição (se aplicável)"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          className="min-h-[70px] text-sm"
                        />
                      </div>
                    )}
                    <PaymentProofsSection />
                  </div>
                </ScrollArea>
                {showAdminActions && (
                  <DrawerFooter className="pt-3 px-0">
                    <div className="flex gap-2 w-full">
                      <AdminActions />
                    </div>
                  </DrawerFooter>
                )}
              </TabsContent>

              <TabsContent value="commissions" className="mt-0">
                <ScrollArea className="h-[calc(85vh-180px)]">
                  <CommissionsTable />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </DrawerContent>
        </Drawer>

        <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center bg-black/95">
              <img
                src={viewerImageUrl || ""}
                alt="Comprovante de pagamento em tamanho completo"
                className="max-w-full max-h-[95vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Saque</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details" className="gap-2">
                <FileText className="h-4 w-4" />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="commissions" className="gap-2">
                <Percent className="h-4 w-4" />
                Comissões ({withdrawal.commission_ids?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <DetailsContent />
              {showAdminActions && withdrawal.status === "pending" && (
                <div className="space-y-2 pt-4 border-t">
                  <Textarea
                    placeholder="Motivo da rejeição (se aplicável)"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              )}
              <PaymentProofsSection />
              {showAdminActions && (
                <DialogFooter>
                  <AdminActions />
                </DialogFooter>
              )}
            </TabsContent>

            <TabsContent value="commissions" className="space-y-4">
              <CommissionsTable />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center bg-black/95">
            <img
              src={viewerImageUrl || ""}
              alt="Comprovante de pagamento em tamanho completo"
              className="max-w-full max-h-[95vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
