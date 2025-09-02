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
      <div className="bg-gradient-to-r from-card to-card/80 border-b border-border/50 px-6 py-3 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <i className="fas fa-file-code text-primary"></i>
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">Editor Prisma</span>
            <p className="text-xs text-muted-foreground">Editor com destaque de sintaxe</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={validateMutation.isPending}
            className="bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/20 transition-all duration-200"
            data-testid="button-validate"
          >
            <i className={`fas ${validateMutation.isPending ? 'fa-spinner fa-spin' : 'fa-check-circle'} mr-2`}></i>
            {validateMutation.isPending ? 'Validando...' : 'Validar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFormat}
            disabled={formatMutation.isPending}
            className="bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20 transition-all duration-200"
            data-testid="button-format"
          >
            <i className={`fas ${formatMutation.isPending ? 'fa-spinner fa-spin' : 'fa-magic'} mr-2`}></i>
            {formatMutation.isPending ? 'Formatando...' : 'Formatar'}
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncMutation.isPending}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            data-testid="button-sync"
          >
            <i className={`fas ${syncMutation.isPending ? 'fa-spinner fa-spin' : 'fa-sync-alt'} mr-2`}></i>
            {syncMutation.isPending ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 relative bg-gradient-to-br from-[hsl(220,13%,12%)] to-[hsl(220,13%,10%)] border border-[hsl(220,13%,18%)]/50 shadow-2xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute inset-0 flex relative z-10">
          {/* Line numbers */}
          <div className="select-none text-muted-foreground/70 text-right pr-4 border-r border-border/30 bg-gradient-to-b from-[hsl(220,13%,11%)] to-[hsl(220,13%,9%)] font-mono text-sm leading-6 p-4 backdrop-blur-sm" style={{ width: "60px" }}>
            {lineNumbers.map((num) => (
              <div key={num} className="hover:text-muted-foreground transition-colors">{num}</div>
            ))}
          </div>
          
          {/* Editor content */}
          <div className="flex-1 relative">
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="// Defina seu schema Prisma aqui..."
              className="absolute inset-0 w-full h-full p-6 bg-transparent text-foreground font-mono text-sm leading-6 resize-none outline-none placeholder:text-muted-foreground/50 selection:bg-primary/20"
              style={{ 
                fontFamily: "JetBrains Mono, 'Fira Code', 'Source Code Pro', Consolas, monospace",
                tabSize: 2,
                textShadow: "0 0 1px rgba(255,255,255,0.1)"
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