import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SyncLog, Schema } from "@shared/schema";

interface DatabaseViewerProps {
  schemaId?: string;
}

export function DatabaseViewer({ schemaId }: DatabaseViewerProps) {
  const [activeTab, setActiveTab] = useState("structure");

  const { data: logs = [], isLoading: logsLoading } = useQuery<SyncLog[]>({
    queryKey: ["/api/schemas", schemaId, "logs"],
    enabled: !!schemaId,
    retry: false,
  });

  const parseModelsFromPrisma = (content: string) => {
    const models: Array<{ name: string; fields: Array<{ name: string; type: string }> }> = [];
    const modelRegex = /model\s+(\w+)\s*{([^}]*)}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const fieldsContent = match[2];
      
      const fieldRegex = /(\w+)\s+(\w+[\?\[\]]*)/g;
      const fields: Array<{ name: string; type: string }> = [];
      let fieldMatch;

      while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
        if (!fieldMatch[1].startsWith("@@") && !fieldMatch[1].startsWith("@")) {
          fields.push({
            name: fieldMatch[1],
            type: fieldMatch[2],
          });
        }
      }

      models.push({ name: modelName, fields });
    }

    return models;
  };

  const { data: currentSchema } = useQuery<Schema>({
    queryKey: ["/api/schemas", schemaId],
    enabled: !!schemaId,
    retry: false,
  });

  const models = currentSchema ? parseModelsFromPrisma(currentSchema.prismaContent) : [];

  return (
    <div className="w-80 bg-gradient-to-b from-card to-card/80 border-l border-border/50 flex flex-col backdrop-blur-sm">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-card to-card/60 border-b border-border/50 rounded-none p-1">
          <TabsTrigger 
            value="structure" 
            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-200"
            data-testid="tab-structure"
          >
            <i className="fas fa-sitemap mr-2"></i>
            Estrutura
          </TabsTrigger>
          <TabsTrigger 
            value="logs" 
            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-200"
            data-testid="tab-logs"
          >
            <i className="fas fa-terminal mr-2"></i>
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="flex-1 mt-0">
          <ScrollArea className="h-full p-3">
            {!schemaId ? (
              <div className="text-center py-12">
                <div className="p-4 bg-muted/20 rounded-full w-fit mx-auto mb-4">
                  <i className="fas fa-sitemap text-muted-foreground text-3xl"></i>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Estrutura do Database</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione um schema para visualizar sua estrutura
                </p>
              </div>
            ) : models.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-orange-500/10 rounded-full w-fit mx-auto mb-4">
                  <i className="fas fa-table text-orange-500 text-3xl"></i>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Schema Vazio</h3>
                <p className="text-sm text-muted-foreground">
                  Nenhum modelo encontrado neste schema
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-1 bg-primary/10 rounded">
                    <i className="fas fa-database text-primary text-xs"></i>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{models.length} modelo(s)</span>
                </div>
                {models.map((model) => (
                  <div key={model.name} className="border border-border/50 rounded-xl p-4 bg-gradient-to-br from-background/50 to-background/30 hover:from-background/70 hover:to-background/50 transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-blue-500/10 rounded">
                          <i className="fas fa-table text-blue-500 text-xs"></i>
                        </div>
                        <h3 className="font-semibold text-sm text-foreground">{model.name}</h3>
                      </div>
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/30 rounded">{model.fields.length} campos</span>
                    </div>
                    <div className="space-y-2">
                      {model.fields.map((field) => (
                        <div key={field.name} className="flex items-center justify-between py-1 px-2 bg-muted/20 rounded-md">
                          <span className="text-xs text-muted-foreground font-medium">{field.name}</span>
                          <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{field.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="logs" className="flex-1 mt-0">
          <ScrollArea className="h-full p-3">
            {!schemaId ? (
              <div className="text-center py-12">
                <div className="p-4 bg-muted/20 rounded-full w-fit mx-auto mb-4">
                  <i className="fas fa-terminal text-muted-foreground text-3xl"></i>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Logs de Sincronização</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione um schema para visualizar os logs
                </p>
              </div>
            ) : logsLoading ? (
              <div className="text-center py-12">
                <div className="p-4 bg-blue-500/10 rounded-full w-fit mx-auto mb-4">
                  <i className="fas fa-spinner fa-spin text-blue-500 text-3xl"></i>
                </div>
                <p className="text-sm text-muted-foreground">Carregando logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-500/10 rounded-full w-fit mx-auto mb-4">
                  <i className="fas fa-file-alt text-gray-500 text-3xl"></i>
                </div>
                <h3 className="font-semibold text-foreground mb-2">Nenhum Log</h3>
                <p className="text-sm text-muted-foreground">
                  Nenhuma operação de sincronização registrada ainda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-1 bg-primary/10 rounded">
                    <i className="fas fa-history text-primary text-xs"></i>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{logs.length} operação(ões)</span>
                </div>
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-xl border text-xs transition-all duration-200 hover:shadow-lg ${
                      log.status === "success"
                        ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 text-green-700 dark:text-green-400"
                        : log.status === "error"
                        ? "bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 text-red-700 dark:text-red-400"
                        : "bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                    }`}
                    data-testid={`log-entry-${log.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <i className={`fas ${
                          log.status === "success" ? "fa-check-circle" :
                          log.status === "error" ? "fa-times-circle" : "fa-exclamation-circle"
                        }`}></i>
                        <span className="font-semibold">{log.message}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString('pt-BR') : ""}
                      </span>
                    </div>
                    {log.output && (
                      <div className="mt-3 p-2 bg-background/30 rounded-md border border-border/30">
                        <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground">
                          {log.output}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
