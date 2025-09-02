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
}

export function SchemaNavigator({ selectedSchemaId, onSchemaSelect }: SchemaNavigatorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewSchemaDialog, setShowNewSchemaDialog] = useState(false);

  const { data: schemas = [], isLoading } = useQuery<Schema[]>({
    queryKey: ["/api/schemas"],
    retry: false,
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
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-foreground">Schemas</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowNewSchemaDialog(true)}
              data-testid="button-new-schema"
            >
              <i className="fas fa-plus text-xs"></i>
            </Button>
          </div>
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar schemas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8"
              data-testid="input-search-schemas"
            />
            <i className="fas fa-search absolute right-3 top-2.5 text-muted-foreground text-xs"></i>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {filteredSchemas.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-database text-muted-foreground text-2xl mb-2"></i>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Nenhum schema encontrado" : "Nenhum schema criado ainda"}
              </p>
            </div>
          ) : (
            filteredSchemas.map((schema) => (
              <div key={schema.id} className="mb-1">
                <div 
                  className={`flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer group ${
                    selectedSchemaId === schema.id ? "bg-accent" : ""
                  }`}
                  onClick={() => onSchemaSelect(schema)}
                  data-testid={`schema-item-${schema.id}`}
                >
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-database text-primary text-sm"></i>
                    <span className="text-sm font-medium">{schema.name}</span>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => handleDeleteSchema(e, schema.id)}
                      data-testid={`button-delete-schema-${schema.id}`}
                    >
                      <i className="fas fa-trash text-xs"></i>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-border">
          <Button
            className="w-full"
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
      />
    </>
  );
}
