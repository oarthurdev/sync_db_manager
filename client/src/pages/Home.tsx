import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SchemaNavigator } from "@/components/SchemaNavigator";
import { PrismaEditor } from "@/components/PrismaEditor";
import { DatabaseViewer } from "@/components/DatabaseViewer";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Schema, User } from "@shared/schema";

export default function Home() {
  const { user, isLoading } = useAuth() as { user: User | null; isLoading: boolean; };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
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
  }, [user, isLoading, toast]);

  // Update editor content when schema changes
  useEffect(() => {
    if (selectedSchema) {
      setEditorContent(selectedSchema.prismaContent);
      setHasUnsavedChanges(false);
    }
  }, [selectedSchema]);

  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedSchema) return;
      
      const response = await apiRequest("PUT", `/api/schemas/${selectedSchema.id}`, {
        prismaContent: content,
      });
      return response.json();
    },
    onSuccess: (updatedSchema) => {
      setSelectedSchema(updatedSchema);
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/schemas"] });
      toast({
        title: "Salvo",
        description: "Schema salvo com sucesso!",
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
        description: "Erro ao salvar schema",
        variant: "destructive",
      });
    },
  });

  const handleSchemaSelect = (schema: Schema) => {
    if (hasUnsavedChanges) {
      if (confirm("Você tem alterações não salvas. Deseja continuar?")) {
        setSelectedSchema(schema);
      }
    } else {
      setSelectedSchema(schema);
    }
  };

  const handleContentChange = (content: string) => {
    setEditorContent(content);
    setHasUnsavedChanges(content !== selectedSchema?.prismaContent);
  };

  const handleSave = () => {
    if (selectedSchema && hasUnsavedChanges) {
      saveMutation.mutate(editorContent);
    }
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.reload();
    },
    onError: () => {
      // Force logout even if API call fails
      queryClient.clear();
      window.location.reload();
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-2xl text-primary mb-2"></i>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border flex items-center justify-between px-4 py-2 h-12">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <i className="fas fa-database text-primary text-lg"></i>
            <h1 className="text-lg font-semibold">PostgreSchema Manager</h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>PostgreSQL Conectado</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm"
            data-testid="button-sync-all"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Sincronizar Tudo
          </Button>
          <div className="flex items-center space-x-2 text-sm">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Avatar do usuário" 
                className="w-6 h-6 rounded-full object-cover"
                data-testid="img-user-avatar"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <i className="fas fa-user text-primary-foreground text-xs"></i>
              </div>
            )}
            <span data-testid="text-user-name">
              {user?.firstName || user?.lastName 
                ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                : user?.email || "Usuário"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        <SchemaNavigator
          selectedSchemaId={selectedSchema?.id}
          onSchemaSelect={handleSchemaSelect}
        />

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          {selectedSchema ? (
            <>
              {/* Editor Tabs */}
              <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-file-code text-primary"></i>
                  <span className="text-sm font-medium">{selectedSchema.name}.prisma</span>
                  {hasUnsavedChanges && (
                    <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Alterações não salvas"></span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Ctrl+S para salvar
                </div>
              </div>

              <PrismaEditor
                schemaId={selectedSchema.id}
                content={editorContent}
                onContentChange={handleContentChange}
                onSave={handleSave}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-file-code text-muted-foreground text-4xl mb-4"></i>
                <h3 className="text-lg font-medium mb-2">Nenhum Schema Selecionado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecione um schema na barra lateral ou crie um novo para começar
                </p>
              </div>
            </div>
          )}
        </div>

        <DatabaseViewer schemaId={selectedSchema?.id} />
      </div>

      {/* Status Bar */}
      <div className="bg-card border-t border-border px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-muted-foreground">PostgreSQL: Conectado</span>
          </div>
          {selectedSchema && (
            <>
              <div className="text-muted-foreground">Schema: {selectedSchema.name}</div>
              <div className="text-muted-foreground">
                Última atualização: {selectedSchema.updatedAt ? new Date(selectedSchema.updatedAt).toLocaleString() : ""}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {hasUnsavedChanges && (
            <div className="text-yellow-500">Alterações não salvas</div>
          )}
        </div>
      </div>
    </div>
  );
}
