import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminBanks() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Gerenciar Bancos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">
              Por favor, execute o arquivo <code className="bg-muted px-2 py-1 rounded">create-banks-accounts.sql</code> no Supabase SQL Editor primeiro.
            </p>
            <Button asChild>
              <a 
                href="https://supabase.com/dashboard/project/adpnzkvzvjbervzrqhhx/sql/new" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Abrir SQL Editor
              </a>
            </Button>
            <div className="mt-4">
              <Link to="/admin/accounts">
                <Button variant="outline">Ir para Contas</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
