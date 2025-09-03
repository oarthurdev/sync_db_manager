import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { NewSchemaDialog } from "@/components/NewSchemaDialog";
import type { Schema } from "@shared/schema";

interface SchemaNavigatorProps {
  selectedSchemaId?: string;
  onSchemaSelect: (schema: Schema) => void;
  databaseConnectionId?: string;
}

export function SchemaNavigator({ selectedSchemaId, onSchemaSelect, databaseConnectionId }: SchemaNavigatorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewSchemaDialog, setShowNewSchemaDialog] = useState(false);

  const { data: schemas = [], isLoading } = useQuery<Schema[]>({
    queryKey: ["/api/schemas", databaseConnectionId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (databaseConnectionId) {
        params.append('databaseConnectionId', databaseConnectionId);
      }
      const response = await apiRequest("GET", `/api/schemas?${params.toString()}`);
      return response.json();
    },
    retry: false,
    enabled: !!databaseConnectionId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (schemaId: string) => {
      await apiRequest("DELETE", `/api/schemas/${schemaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schemas"] });
      toast({
        title: "Sucesso",
        description: "Schema deletado com sucesso!",
      });
    },
    onError: (error) => {
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
        description: "Erro ao deletar schema",
        variant: "destructive",
      });
    },
  });

  const filteredSchemas = schemas.filter((schema) =>
    schema.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteSchema = (e: React.MouseEvent, schemaId: string) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja deletar este schema?")) {
      deleteMutation.mutate(schemaId);
    }
  };

  if (isLoading) {
    return (
      <div className="w-64 bg-card border-r border-border flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando schemas...</div>
      </div>
    );
  }

  return (
    <>
      <div className="w-64 bg-gradient-to-b from-card to-card/80 border-r border-border/50 flex flex-col backdrop-blur-sm">
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-card/80 to-card/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-1 bg-primary/10 rounded">
                <i className="fas fa-layer-group text-primary text-sm"></i>
              </div>
              <h2 className="text-sm font-semibold text-foreground">Schemas</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-primary/5 border-primary/20 hover:bg-primary/10 transition-all duration-200"
              onClick={() => setShowNewSchemaDialog(true)}
              data-testid="button-new-schema"
            >
              <i className="fas fa-plus text-xs text-primary"></i>
            </Button>
          </div>
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar schemas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
              data-testid="input-search-schemas"
            />
            <div className="absolute right-3 top-2.5">
              <i className="fas fa-search text-muted-foreground text-xs"></i>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          {filteredSchemas.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-muted/20 rounded-full w-fit mx-auto mb-4">
                <i className="fas fa-database text-muted-foreground text-3xl"></i>
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {searchTerm ? "Schema não encontrado" : "Nenhum Schema"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm ? "Tente outro termo de busca" : "Crie seu primeiro schema para começar"}
              </p>
              {!searchTerm && (
                <Button
                  size="sm"
                  onClick={() => setShowNewSchemaDialog(true)}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Criar Schema
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSchemas.map((schema) => (
                <div key={schema.id}>
                  <div 
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer group transition-all duration-200 border ${
                      selectedSchemaId === schema.id 
                        ? "bg-gradient-to-r from-primary/15 to-primary/5 border-primary/30 shadow-lg" 
                        : "bg-gradient-to-r from-background/50 to-background/30 border-border/30 hover:from-accent/50 hover:to-accent/30 hover:border-border/50 hover:shadow-md"
                    }`}
                    onClick={() => onSchemaSelect(schema)}
                    data-testid={`schema-item-${schema.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        selectedSchemaId === schema.id ? "bg-primary/20" : "bg-blue-500/10"
                      }`}>
                        <i className={`fas fa-database text-sm ${
                          selectedSchemaId === schema.id ? "text-primary" : "text-blue-500"
                        }`}></i>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground">{schema.name}</span>
                        {schema.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{schema.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDeleteSchema(e, schema.id)}
                        data-testid={`button-delete-schema-${schema.id}`}
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border/50 bg-gradient-to-r from-card/60 to-card/30">
          <Button
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-lg hover:shadow-xl"
            onClick={() => setShowNewSchemaDialog(true)}
            data-testid="button-create-schema"
          >
            <i className="fas fa-plus mr-2"></i>
            Novo Schema
          </Button>
        </div>
      </div>

      <NewSchemaDialog
        open={showNewSchemaDialog}
        onOpenChange={setShowNewSchemaDialog}
        databaseConnectionId={databaseConnectionId}
      />
    </>
  );
}
