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
    <div className="w-80 bg-card border-l border-border flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-2 bg-card border-b border-border rounded-none">
          <TabsTrigger 
            value="structure" 
            className="data-[state=active]:bg-accent"
            data-testid="tab-structure"
          >
            <i className="fas fa-sitemap text-primary mr-2"></i>
            Estrutura
          </TabsTrigger>
          <TabsTrigger 
            value="logs" 
            className="data-[state=active]:bg-accent"
            data-testid="tab-logs"
          >
            <i className="fas fa-terminal mr-2"></i>
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="flex-1 mt-0">
          <ScrollArea className="h-full p-3">
            {!schemaId ? (
              <div className="text-center py-8">
                <i className="fas fa-sitemap text-muted-foreground text-2xl mb-2"></i>
                <p className="text-sm text-muted-foreground">
                  Selecione um schema para ver sua estrutura
                </p>
              </div>
            ) : models.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-table text-muted-foreground text-2xl mb-2"></i>
                <p className="text-sm text-muted-foreground">
                  Nenhum modelo encontrado neste schema
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {models.map((model) => (
                  <div key={model.name} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm">{model.name}</h3>
                      <span className="text-xs text-muted-foreground">{currentSchema?.name}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      {model.fields.map((field) => (
                        <div key={field.name} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{field.name}</span>
                          <span className="font-mono text-primary">{field.type}</span>
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
              <div className="text-center py-8">
                <i className="fas fa-terminal text-muted-foreground text-2xl mb-2"></i>
                <p className="text-sm text-muted-foreground">
                  Selecione um schema para ver os logs
                </p>
              </div>
            ) : logsLoading ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Carregando logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-file-alt text-muted-foreground text-2xl mb-2"></i>
                <p className="text-sm text-muted-foreground">
                  Nenhum log de sincronização ainda
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-md border text-xs ${
                      log.status === "success"
                        ? "bg-green-500/10 border-green-500/20 text-green-400"
                        : log.status === "error"
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                    }`}
                    data-testid={`log-entry-${log.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{log.message}</span>
                      <span className="text-muted-foreground">
                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ""}
                      </span>
                    </div>
                    {log.output && (
                      <pre className="whitespace-pre-wrap text-xs font-mono mt-2">
                        {log.output}
                      </pre>
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
