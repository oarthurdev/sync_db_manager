
# PostgreSchema Manager

Um gerenciador visual de schemas PostgreSQL que permite criar, editar e sincronizar definições de schema de banco de dados através de uma interface web moderna.

## 🌟 Funcionalidades

### 📊 Gerenciamento Visual de Schemas
- Interface intuitiva para navegar e organizar múltiplos schemas
- Editor de código integrado com syntax highlighting para arquivos Prisma
- Validação em tempo real de schemas usando Prisma CLI
- Formatação automática de código com indicadores visuais para mudanças não salvas

### 🔄 Sincronização Automática
- Detecção inteligente de mudanças nos schemas
- Sincronização automática com bancos de dados PostgreSQL
- Histórico completo de operações e logs de sincronização
- Comparação de schemas entre código e banco de dados

### 🔌 Conexões de Banco
- Suporte para múltiplas conexões PostgreSQL
- Teste de conectividade em tempo real
- Gerenciamento seguro de credenciais
- Introspection automática de bancos existentes

### 🔐 Autenticação e Segurança
- Autenticação integrada com Replit
- Sessões seguras com armazenamento em PostgreSQL
- Controle de acesso por usuário

## 🛠️ Tecnologias

### Frontend
- **React 18** - Framework principal para interface do usuário
- **TypeScript** - Tipagem estática para maior confiabilidade
- **Tailwind CSS** - Framework CSS utility-first para estilização
- **Radix UI** - Componentes acessíveis e sem estilo
- **shadcn/ui** - Sistema de design baseado em Radix UI
- **TanStack Query** - Gerenciamento de estado do servidor e cache
- **React Hook Form** - Manipulação eficiente de formulários
- **Zod** - Validação de schemas e tipos
- **Wouter** - Roteamento leve para React

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web minimalista
- **TypeScript** - Tipagem estática no backend
- **Prisma** - Toolkit de banco de dados
- **Drizzle ORM** - ORM type-safe para operações de banco
- **Neon Database** - Banco PostgreSQL serverless
- **Supabase** - Serviços de autenticação

### Ferramentas de Desenvolvimento
- **Vite** - Build tool e servidor de desenvolvimento
- **ESBuild** - Bundler rápido para produção
- **TSX** - Executor TypeScript para desenvolvimento

## 🚀 Instalação e Configuração

### 1. Clone o Repositório
```bash
git clone https://github.com/oarthurdev/sync_db_manager
cd postgreschema-manager
```

### 2. Instale as Dependências
```bash
npm install
```

### 3. Configure as Variáveis de Ambiente
Crie um arquivo `.env` baseado no `.env.example`:

```env
DATABASE_URL=postgresql://username:password@host:port/database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 4. Execute o Projeto
Para desenvolvimento:
```bash
npm run dev
```

Para produção:
```bash
npm run build
npm start
```

O aplicativo estará disponível em `http://localhost:5000`

## 📁 Estrutura do Projeto

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── hooks/         # Hooks customizados
│   │   ├── lib/           # Utilitários e configurações
│   │   └── pages/         # Páginas da aplicação
├── server/                # Backend Express
│   ├── services/          # Serviços de negócio
│   ├── routes.ts          # Definição de rotas da API
│   └── storage.ts         # Camada de acesso a dados
├── shared/                # Código compartilhado
│   └── schema.ts          # Schemas Zod compartilhados
├── prisma-schemas/        # Arquivos de schema Prisma gerados
└── dist/                  # Build de produção
```

## 🔧 API Endpoints

### Autenticação
- `GET /api/auth/user` - Obter usuário atual
- `POST /api/auth/logout` - Fazer logout

### Conexões de Banco
- `GET /api/database-connections` - Listar conexões
- `POST /api/database-connections` - Criar nova conexão
- `PUT /api/database-connections/:id` - Atualizar conexão
- `DELETE /api/database-connections/:id` - Deletar conexão
- `POST /api/database-connections/:id/test` - Testar conexão

### Schemas
- `GET /api/schemas` - Listar schemas
- `POST /api/schemas` - Criar novo schema
- `PUT /api/schemas/:id` - Atualizar schema
- `DELETE /api/schemas/:id` - Deletar schema
- `POST /api/schemas/:id/validate` - Validar schema
- `POST /api/schemas/:id/format` - Formatar schema
- `POST /api/schemas/:id/sync` - Sincronizar schema
- `POST /api/schemas/:id/compare` - Comparar schema
- `POST /api/schemas/:id/auto-sync` - Sincronização automática

### Banco de Dados
- `POST /api/database/introspect` - Introspectar banco existente

## 🎯 Como Usar

### 1. Configurar Conexão de Banco
1. Acesse a página principal
2. Clique em "Nova Conexão"
3. Preencha os dados de conexão do PostgreSQL
4. Teste a conexão antes de salvar

### 2. Criar um Schema
1. Selecione uma conexão de banco
2. Clique em "Novo Schema"
3. Defina nome e descrição
4. Escreva o código Prisma no editor

### 3. Sincronizar com o Banco
1. Valide o schema usando o botão "Validar"
2. Use "Sincronizar" para aplicar as mudanças no banco
3. Monitore os logs de sincronização

### 4. Introspecção de Banco Existente
1. Para bancos com tabelas existentes
2. Use "Introspectar Banco" para gerar schemas automaticamente
3. Os schemas serão criados com base na estrutura atual

## 🔍 Funcionalidades Avançadas

### Detecção de Mudanças
O sistema detecta automaticamente quando um schema foi modificado e precisa ser sincronizado, usando hash de conteúdo para comparação.

### Sincronização Inteligente
A funcionalidade de auto-sync compara o schema atual com o banco de dados e executa apenas as mudanças necessárias.

### Validação em Tempo Real
Todos os schemas são validados usando o Prisma CLI antes da sincronização, garantindo que apenas código válido seja aplicado.

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique os logs de sincronização na interface
2. Confirme se as credenciais de banco estão corretas
3. Valide o schema Prisma antes de sincronizar
4. Consulte a documentação do Prisma para sintaxe específica
