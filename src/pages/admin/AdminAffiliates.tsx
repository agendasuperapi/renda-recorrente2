import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

const AdminAffiliates = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { data: affiliates, isLoading } = useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      // Buscar perfis de afiliados
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Buscar subscriptions
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from("subscriptions")
        .select("user_id, plan_id, status, plans(name, billing_period)")
        .in("status", ["active", "trialing"]);

      if (subscriptionsError) throw subscriptionsError;

      // Buscar indicações
      const { data: referrals, error: referralsError } = await supabase
        .from("referrals")
        .select("referrer_id");

      if (referralsError) throw referralsError;

      // Criar maps
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const subscriptionsMap = new Map(
        subscriptions?.map(s => [s.user_id, s]) || []
      );
      
      // Contar indicações por afiliado
      const referralsCount = new Map();
      referrals?.forEach(r => {
        const count = referralsCount.get(r.referrer_id) || 0;
        referralsCount.set(r.referrer_id, count + 1);
      });

      // Filtrar apenas afiliados (não admins)
      return profiles
        ?.filter(profile => rolesMap.get(profile.id) !== "super_admin")
        .map(profile => {
          const subscription = subscriptionsMap.get(profile.id);
          return {
            ...profile,
            planName: subscription?.plans?.name || "Sem plano",
            planPeriod: subscription?.plans?.billing_period || "-",
            planStatus: subscription?.status || "inactive",
            referralsCount: referralsCount.get(profile.id) || 0
          };
        }) || [];
    },
  });

  const filteredAffiliates = affiliates?.filter(affiliate => 
    affiliate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    affiliate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    affiliate.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil((filteredAffiliates?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAffiliates = filteredAffiliates?.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "trial"> = {
      active: "default",
      trialing: "trial",
      inactive: "secondary",
      cancelled: "destructive"
    };
    return variants[status] || "secondary";
  };

  const getInitials = (name: string) => {
    return name?.substring(0, 2).toUpperCase() || "AF";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Afiliados</h1>
        <p className="text-muted-foreground">
          Gerencie todos os afiliados cadastrados
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou username..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Afiliado</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Indicações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {[...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : paginatedAffiliates && paginatedAffiliates.length > 0 ? (
                paginatedAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {affiliate.avatar_url && (
                            <AvatarImage src={affiliate.avatar_url} alt={affiliate.name} />
                          )}
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(affiliate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{affiliate.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{affiliate.email || "-"}</TableCell>
                    <TableCell>{affiliate.username || "-"}</TableCell>
                    <TableCell>{affiliate.planName}</TableCell>
                    <TableCell className="capitalize">{affiliate.planPeriod}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusBadge(affiliate.planStatus)}>
                          {affiliate.planStatus === "active" 
                            ? "Ativo" 
                            : affiliate.planStatus === "trialing" 
                              ? "Em teste" 
                              : "Inativo"}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {affiliate.referralsCount}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum afiliado encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {filteredAffiliates && filteredAffiliates.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredAffiliates.length)} de {filteredAffiliates.length} afiliados
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <PaginationItem key={page}>
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAffiliates;
