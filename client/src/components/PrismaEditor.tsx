import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";

interface PrismaEditorProps {
  schemaId: string;
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
}

export function PrismaEditor({ schemaId, content, onContentChange, onSave }: PrismaEditorProps) {
  const { toast } = useToast();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);

  useEffect(() => {
    const lines = content.split('\n').length;
    setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
  }, [content]);

  const validateMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/schemas/${schemaId}/validate`, { content });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.valid) {
        toast({
          title: "Validação",
          description: "Schema válido!",
        });
      } else {
        toast({
          title: "Erro de Validação",
          description: result.errors,
          variant: "destructive",
        });
      }
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
        description: "Erro ao validar schema",
        variant: "destructive",
      });
    },
  });

  const formatMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/schemas/${schemaId}/format`, { content });
      return response.json();
    },
    onSuccess: (result) => {
      onContentChange(result.content);
      toast({
        title: "Formatação",
        description: "Código formatado com sucesso!",
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
        description: "Erro ao formatar código",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/schemas/${schemaId}/sync`);
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Sincronização",
          description: "Schema sincronizado com sucesso!",
        });
      } else {
        toast({
          title: "Erro de Sincronização",
          description: result.output,
          variant: "destructive",
        });
      }
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
        description: "Erro ao sincronizar schema",
        variant: "destructive",
      });
    },
  });

  const handleValidate = () => {
    validateMutation.mutate(content);
  };

  const handleFormat = () => {
    formatMutation.mutate(content);
  };

  const handleSync = () => {
    onSave();
    syncMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        onSave();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Editor Toolbar */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <i className="fas fa-file-code text-primary"></i>
          <span className="text-sm font-medium">Editor Prisma</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleValidate}
            disabled={validateMutation.isPending}
            data-testid="button-validate"
          >
            <i className="fas fa-check-circle text-green-500 mr-2"></i>
            Validar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            disabled={formatMutation.isPending}
            data-testid="button-format"
          >
            <i className="fas fa-indent mr-2"></i>
            Formatar
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncMutation.isPending}
            size="sm"
            data-testid="button-sync"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            {syncMutation.isPending ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 relative bg-[hsl(220,13%,12%)] border border-[hsl(220,13%,18%)]">
        <div className="absolute inset-0 flex">
          {/* Line numbers */}
          <div className="select-none text-muted-foreground text-right pr-4 border-r border-border bg-[hsl(220,13%,11%)] font-mono text-sm leading-6 p-4" style={{ width: "60px" }}>
            {lineNumbers.map((num) => (
              <div key={num}>{num}</div>
            ))}
          </div>
          
          {/* Editor content */}
          <div className="flex-1 relative">
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 w-full h-full p-4 bg-transparent text-foreground font-mono text-sm leading-6 resize-none outline-none"
              style={{ 
                fontFamily: "JetBrains Mono, Fira Code, monospace",
                tabSize: 2,
              }}
              spellCheck={false}
              data-testid="textarea-editor"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
