import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { DatabaseConnection, InsertDatabaseConnection } from "@shared/schema";

interface DatabaseConnectionManagerProps {
  onConnectionSelect?: (connection: DatabaseConnection) => void;
  selectedConnectionId?: string;
}

export function DatabaseConnectionManager({ onConnectionSelect, selectedConnectionId }: DatabaseConnectionManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewConnectionDialog, setShowNewConnectionDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertDatabaseConnection>>({
    name: "",
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
    sslMode: "prefer"
  });

  const { data: connections = [], isLoading } = useQuery<DatabaseConnection[]>({
    queryKey: ["/api/database-connections"],
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertDatabaseConnection) => {
      const response = await apiRequest("POST", "/api/database-connections", data);
      return response.json();
    },
    onSuccess: (newConnection) => {
      queryClient.invalidateQueries({ queryKey: ["/api/database-connections"] });
      setShowNewConnectionDialog(false);
      setFormData({
        name: "",
        host: "",
        port: "5432",
        database: "",
        username: "",
        password: "",
        sslMode: "prefer"
      });
      toast({
        title: "Sucesso",
        description: "Conexão de banco criada com sucesso!",
      });
      onConnectionSelect?.(newConnection);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conexão",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiRequest("POST", `/api/database-connections/${connectionId}/test`);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: result.success ? "Conexão OK" : "Falha na Conexão",
        description: result.success 
          ? "Conexão com o banco estabelecida com sucesso!" 
          : result.error,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao testar conexão",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      await apiRequest("DELETE", `/api/database-connections/${connectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database-connections"] });
      toast({
        title: "Sucesso",
        description: "Conexão deletada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao deletar conexão",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateConnection = () => {
    if (!formData.name || !formData.host || !formData.database || !formData.username || !formData.password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData as InsertDatabaseConnection);
  };

  const handleDeleteConnection = (connectionId: string) => {
    if (confirm("Tem certeza que deseja deletar esta conexão?")) {
      deleteMutation.mutate(connectionId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-sm text-muted-foreground">Carregando conexões...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Conexões de Banco</h3>
        <Dialog open={showNewConnectionDialog} onOpenChange={setShowNewConnectionDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <i className="fas fa-plus mr-2"></i>
              Nova Conexão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Conexão PostgreSQL</DialogTitle>
              <DialogDescription>
                Configure os dados de conexão com seu banco PostgreSQL
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Conexão *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Ex: Produção, Desenvolvimento..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="host">Host *</Label>
                  <Input
                    id="host"
                    value={formData.host || ""}
                    onChange={(e) => handleInputChange("host", e.target.value)}
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <Label htmlFor="port">Porta</Label>
                  <Input
                    id="port"
                    value={formData.port || ""}
                    onChange={(e) => handleInputChange("port", e.target.value)}
                    placeholder="5432"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="database">Database *</Label>
                <Input
                  id="database"
                  value={formData.database || ""}
                  onChange={(e) => handleInputChange("database", e.target.value)}
                  placeholder="nome_do_banco"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Usuário *</Label>
                  <Input
                    id="username"
                    value={formData.username || ""}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    placeholder="postgres"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password || ""}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateConnection}
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? "Criando..." : "Criar Conexão"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewConnectionDialog(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {connections.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              <i className="fas fa-database text-2xl mb-2 block"></i>
              Nenhuma conexão configurada. Clique em "Nova Conexão" para começar.
            </CardContent>
          </Card>
        ) : (
          connections.map((connection) => (
            <Card 
              key={connection.id} 
              className={`cursor-pointer transition-colors ${
                selectedConnectionId === connection.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onConnectionSelect?.(connection)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <i className="fas fa-database text-sm"></i>
                    {connection.name}
                    {connection.isActive && (
                      <Badge variant="outline" className="text-xs">Ativo</Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        testConnectionMutation.mutate(connection.id);
                      }}
                      disabled={testConnectionMutation.isPending}
                      title="Testar Conexão"
                    >
                      <i className="fas fa-plug text-xs"></i>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConnection(connection.id);
                      }}
                      title="Deletar Conexão"
                    >
                      <i className="fas fa-trash text-xs text-red-500"></i>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-xs">
                  {connection.host}:{connection.port}/{connection.database}
                  <br />
                  Usuário: {connection.username}
                </CardDescription>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}