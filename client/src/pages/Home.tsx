import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchemaNavigator } from "@/components/SchemaNavigator";
import { PrismaEditor } from "@/components/PrismaEditor";
import { DatabaseViewer } from "@/components/DatabaseViewer";
import { DatabaseConnectionManager } from "@/components/DatabaseConnectionManager";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Schema, User, DatabaseConnection } from "@shared/schema";

export default function Home() {
  const { user, isLoading } = useAuth() as { user: User | null; isLoading: boolean; };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConnection, setSelectedConnection] = useState<DatabaseConnection | null>(null);
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
      <header className="bg-gradient-to-r from-card to-card/80 border-b border-border/50 flex items-center justify-between px-6 py-3 h-16 backdrop-blur-sm">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <i className="fas fa-database text-primary text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">PostgreSchema Manager</h1>
              <p className="text-xs text-muted-foreground">Gerencie schemas PostgreSQL com facilidade</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-green-700 dark:text-green-400 font-medium">PostgreSQL Conectado</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm"
            className="bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 transition-all duration-200"
            data-testid="button-sync-all"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Sincronizar Tudo
          </Button>
          <div className="flex items-center space-x-3 px-3 py-2 bg-muted/30 rounded-full border border-border/50">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Avatar do usuário" 
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
                data-testid="img-user-avatar"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center ring-2 ring-primary/20">
                <i className="fas fa-user text-primary-foreground text-sm"></i>
              </div>
            )}
            <span className="text-sm font-medium" data-testid="text-user-name">
              {user?.firstName || user?.lastName 
                ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                : user?.email || "Usuário"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="hover:bg-destructive/10 hover:text-destructive transition-colors ml-2"
              data-testid="button-logout"
            >
              <i className={`fas ${logoutMutation.isPending ? 'fa-spinner fa-spin' : 'fa-sign-out-alt'}`}></i>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        <Tabs defaultValue="connections" className="flex-1 flex flex-col">
          <div className="bg-card border-b border-border px-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="connections">
                <i className="fas fa-database mr-2"></i>
                Conexões
              </TabsTrigger>
              <TabsTrigger value="schemas" disabled={!selectedConnection}>
                <i className="fas fa-sitemap mr-2"></i>
                Schemas
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="connections" className="flex-1 flex mt-0">
            <div className="w-80 border-r border-border p-4">
              <DatabaseConnectionManager
                selectedConnectionId={selectedConnection?.id}
                onConnectionSelect={setSelectedConnection}
              />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <i className="fas fa-database text-muted-foreground text-4xl mb-4"></i>
                <h3 className="text-lg font-medium mb-2">Gerenciar Conexões</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure suas conexões PostgreSQL para sincronizar schemas do Prisma com diferentes bancos de dados.
                </p>
                {selectedConnection && (
                  <div className="bg-card border rounded-lg p-4 text-left">
                    <h4 className="font-medium mb-2">Conexão Selecionada:</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div><strong>Nome:</strong> {selectedConnection.name}</div>
                      <div><strong>Host:</strong> {selectedConnection.host}:{selectedConnection.port}</div>
                      <div><strong>Database:</strong> {selectedConnection.database}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schemas" className="flex-1 flex mt-0">
            {selectedConnection ? (
              <>
                <SchemaNavigator
                  selectedSchemaId={selectedSchema?.id}
                  onSchemaSelect={handleSchemaSelect}
                  databaseConnectionId={selectedConnection.id}
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <i className="fas fa-exclamation-triangle text-muted-foreground text-4xl mb-4"></i>
                  <h3 className="text-lg font-medium mb-2">Nenhuma Conexão Selecionada</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione uma conexão de banco na aba "Conexões" para gerenciar schemas
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Bar */}
      <div className="bg-gradient-to-r from-card/90 to-card/60 border-t border-border/50 px-6 py-3 flex items-center justify-between text-sm backdrop-blur-sm">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 px-2 py-1 bg-green-500/10 rounded-md">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-green-700 dark:text-green-400 font-medium">PostgreSQL: Conectado</span>
          </div>
          {selectedSchema && (
            <>
              <div className="flex items-center space-x-2">
                <i className="fas fa-file-code text-primary"></i>
                <span className="font-medium">{selectedSchema.name}</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <i className="fas fa-clock text-xs"></i>
                <span>
                  {selectedSchema.updatedAt ? new Date(selectedSchema.updatedAt).toLocaleString('pt-BR') : ""}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-500/10 rounded-md border border-yellow-500/20">
              <i className="fas fa-exclamation-triangle text-yellow-500 text-xs"></i>
              <span className="text-yellow-700 dark:text-yellow-400 font-medium">Alterações não salvas</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
