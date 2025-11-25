import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const AdminStripeEvents = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["stripe-events", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("stripe_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchTerm) {
        query = query.or(
          `event_id.ilike.%${searchTerm}%,event_type.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleViewDetails = (event: any) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const getStatusBadge = (processed: boolean) => {
    if (processed) {
      return (
        <Badge variant="default" className="bg-success text-success-foreground">
          <CheckCircle className="w-3 h-3 mr-1" />
          Processado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  const getEventTypeBadge = (eventType: string) => {
    const colors: Record<string, string> = {
      "checkout.session.completed": "bg-primary text-primary-foreground",
      "customer.subscription.created": "bg-success text-success-foreground",
      "customer.subscription.updated": "bg-info text-info-foreground",
      "customer.subscription.deleted": "bg-destructive text-destructive-foreground",
      "invoice.paid": "bg-success text-success-foreground",
      "invoice.payment_failed": "bg-destructive text-destructive-foreground",
    };

    return (
      <Badge className={colors[eventType] || "bg-muted"}>
        {eventType}
      </Badge>
    );
  };

  if (isLoading) {
    return <TableSkeleton title="Eventos Stripe" columns={6} rows={10} showSearch />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Eventos Stripe</h1>
        <p className="text-muted-foreground">
          Monitore todos os eventos recebidos do Stripe via webhooks
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID do evento, tipo ou email..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events && events.length > 0 ? (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-xs">
                        {event.event_id.substring(0, 20)}...
                      </TableCell>
                      <TableCell>
                        {getEventTypeBadge(event.event_type)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {event.email || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(event.processed)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(event)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhum evento encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-info/5 border-info/20">
          <CardHeader>
            <CardTitle className="text-sm">Sobre os Eventos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Os eventos são recebidos automaticamente via webhooks</p>
            <p>• Todos os eventos são armazenados para auditoria</p>
            <p>• Os eventos processados são marcados automaticamente</p>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20">
          <CardHeader>
            <CardTitle className="text-sm">Tipos de Eventos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>checkout.session.completed</strong> - Pagamento concluído</p>
            <p>• <strong>subscription.created/updated</strong> - Assinatura criada/atualizada</p>
            <p>• <strong>invoice.paid/failed</strong> - Fatura paga/falhada</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Event ID</p>
                  <p className="text-sm font-mono break-all">{selectedEvent.event_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <div className="mt-1">{getEventTypeBadge(selectedEvent.event_type)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedEvent.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data</p>
                  <p className="text-sm">
                    {format(new Date(selectedEvent.created_at), "dd/MM/yyyy HH:mm:ss", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedEvent.processed)}</div>
                </div>
                {selectedEvent.user_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                    <p className="text-sm font-mono text-xs break-all">{selectedEvent.user_id}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Dados do Evento (JSON)
                </p>
                <ScrollArea className="h-[300px] rounded-md border bg-muted/50 p-4">
                  <pre className="text-xs">
                    {JSON.stringify(selectedEvent.event_data, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStripeEvents;
