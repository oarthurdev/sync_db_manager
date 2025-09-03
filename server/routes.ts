import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./supabaseAuth";
import { schemaService } from "./services/schema";
import { prismaService } from "./services/prisma";
import { databaseService } from "./services/database";
import {
  insertSchemaSchema,
  insertSyncLogSchema,
  insertDatabaseConnectionSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Database Connection routes
  app.get(
    "/api/database-connections",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const connections = await storage.getDatabaseConnections(userId);
        res.json(connections);
      } catch (error) {
        console.error("Error fetching database connections:", error);
        res.status(500).json({ message: "Erro ao buscar conexões de banco" });
      }
    },
  );

  app.get(
    "/api/database-connections/:id",
    isAuthenticated,
    async (req, res) => {
      try {
        const connection = await storage.getDatabaseConnection(req.params.id);
        if (!connection) {
          return res.status(404).json({ message: "Conexão não encontrada" });
        }
        res.json(connection);
      } catch (error) {
        console.error("Error fetching database connection:", error);
        res.status(500).json({ message: "Erro ao buscar conexão" });
      }
    },
  );

  app.post(
    "/api/database-connections",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const validatedData = insertDatabaseConnectionSchema.parse({
          ...req.body,
          userId: req.user.id,
        });

        // Testa a conexão antes de salvar
        const testResult = await databaseService.testConnection(
          validatedData as any,
        );
        if (!testResult.success) {
          return res.status(400).json({
            message: "Falha ao conectar com o banco",
            error: testResult.error,
          });
        }

        const connection =
          await storage.createDatabaseConnection(validatedData);
        res.json(connection);
      } catch (error: any) {
        console.error("Error creating database connection:", error);
        if (error.name === "ZodError") {
          return res
            .status(400)
            .json({ message: "Dados inválidos", errors: error.errors });
        }
        res.status(500).json({ message: "Erro ao criar conexão de banco" });
      }
    },
  );

  app.put(
    "/api/database-connections/:id",
    isAuthenticated,
    async (req, res) => {
      try {
        const existingConnection = await storage.getDatabaseConnection(
          req.params.id,
        );
        if (!existingConnection) {
          return res.status(404).json({ message: "Conexão não encontrada" });
        }

        const validatedData = insertDatabaseConnectionSchema
          .partial()
          .parse(req.body);

        // Se mudou os dados de conexão, testa novamente
        if (
          validatedData.host ||
          validatedData.port ||
          validatedData.database ||
          validatedData.username ||
          validatedData.password
        ) {
          const testConfig = { ...existingConnection, ...validatedData };
          const testResult = await databaseService.testConnection(
            testConfig as any,
          );
          if (!testResult.success) {
            return res.status(400).json({
              message: "Falha ao conectar com o banco",
              error: testResult.error,
            });
          }
        }

        const connection = await storage.updateDatabaseConnection(
          req.params.id,
          validatedData,
        );
        res.json(connection);
      } catch (error: any) {
        console.error("Error updating database connection:", error);
        if (error.name === "ZodError") {
          return res
            .status(400)
            .json({ message: "Dados inválidos", errors: error.errors });
        }
        res.status(500).json({ message: "Erro ao atualizar conexão de banco" });
      }
    },
  );

  app.delete(
    "/api/database-connections/:id",
    isAuthenticated,
    async (req, res) => {
      try {
        const connection = await storage.getDatabaseConnection(req.params.id);
        if (!connection) {
          return res.status(404).json({ message: "Conexão não encontrada" });
        }

        // Fecha a conexão ativa se existir
        await databaseService.closeConnection(req.params.id);

        await storage.deleteDatabaseConnection(req.params.id);
        res.json({ message: "Conexão deletada com sucesso" });
      } catch (error) {
        console.error("Error deleting database connection:", error);
        res.status(500).json({ message: "Erro ao deletar conexão de banco" });
      }
    },
  );

  app.post(
    "/api/database-connections/:id/test",
    isAuthenticated,
    async (req, res) => {
      try {
        const connection = await storage.getDatabaseConnection(req.params.id);
        if (!connection) {
          return res.status(404).json({ message: "Conexão não encontrada" });
        }

        const testResult = await databaseService.testConnection(connection);
        res.json(testResult);
      } catch (error) {
        console.error("Error testing database connection:", error);
        res.status(500).json({ message: "Erro ao testar conexão" });
      }
    },
  );

  // Schema routes
  app.get("/api/schemas", isAuthenticated, async (req, res) => {
    try {
      const databaseConnectionId = req.query.databaseConnectionId as string;
      const schemas = await storage.getSchemas(databaseConnectionId);
      res.json(schemas);
    } catch (error) {
      console.error("Error fetching schemas:", error);
      res.status(500).json({ message: "Erro ao buscar schemas" });
    }
  });

  app.get("/api/schemas/:id", isAuthenticated, async (req, res) => {
    try {
      const schema = await storage.getSchema(req.params.id);
      if (!schema) {
        return res.status(404).json({ message: "Schema não encontrado" });
      }
      res.json(schema);
    } catch (error) {
      console.error("Error fetching schema:", error);
      res.status(500).json({ message: "Erro ao buscar schema" });
    }
  });

  app.post("/api/schemas", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSchemaSchema.parse(req.body);

      // Verifica se a conexão de banco existe
      const dbConnection = await storage.getDatabaseConnection(
        validatedData.databaseConnectionId,
      );
      if (!dbConnection) {
        return res
          .status(400)
          .json({ message: "Conexão de banco não encontrada" });
      }

      // Check if schema name already exists for this database connection
      const existing = await storage.getSchemaByName(
        validatedData.name,
        validatedData.databaseConnectionId,
      );
      if (existing) {
        return res
          .status(400)
          .json({
            message: "Schema com este nome já existe para esta conexão",
          });
      }

      // Generate default Prisma content if not provided
      if (!validatedData.prismaContent) {
        validatedData.prismaContent =
          schemaService.generateDefaultPrismaContent(validatedData.name);
      }

      // Gera hash do schema para detecção de mudanças
      const schemaHash = databaseService.generateSchemaHash(
        validatedData.prismaContent,
      );

      const schema = await storage.createSchema({
        ...validatedData,
        schemaHash,
      });

      await schemaService.saveSchemaFile(
        `${dbConnection.name}_${schema.name}`,
        schema.prismaContent,
      );

      res.json(schema);
    } catch (error: any) {
      console.error("Error creating schema:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar schema" });
    }
  });

  app.put("/api/schemas/:id", isAuthenticated, async (req, res) => {
    try {
      const schema = await storage.getSchema(req.params.id);
      if (!schema) {
        return res.status(404).json({ message: "Schema não encontrado" });
      }

      const updates = insertSchemaSchema.partial().parse(req.body);
      const updatedSchema = await storage.updateSchema(req.params.id, updates);

      if (updates.prismaContent) {
        await schemaService.saveSchemaFile(
          updatedSchema.name,
          updates.prismaContent,
        );
      }

      res.json(updatedSchema);
    } catch (error: any) {
      console.error("Error updating schema:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar schema" });
    }
  });

  app.delete("/api/schemas/:id", isAuthenticated, async (req, res) => {
    try {
      const schema = await storage.getSchema(req.params.id);
      if (!schema) {
        return res.status(404).json({ message: "Schema não encontrado" });
      }

      await storage.deleteSchema(req.params.id);
      await schemaService.deleteSchemaFile(schema.name);

      res.json({ message: "Schema deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting schema:", error);
      res.status(500).json({ message: "Erro ao deletar schema" });
    }
  });

  // Prisma operations
  app.post("/api/schemas/:id/validate", isAuthenticated, async (req, res) => {
    try {
      const { content } = req.body;
      const result = await prismaService.validateSchema(content);
      res.json(result);
    } catch (error) {
      console.error("Error validating schema:", error);
      res.status(500).json({ message: "Erro ao validar schema" });
    }
  });

  app.post("/api/schemas/:id/format", isAuthenticated, async (req, res) => {
    try {
      const { content } = req.body;
      const formatted = await prismaService.formatSchema(content);
      res.json({ content: formatted });
    } catch (error) {
      console.error("Error formatting schema:", error);
      res.status(500).json({ message: "Erro ao formatar schema" });
    }
  });

  app.post("/api/schemas/:id/sync", isAuthenticated, async (req, res) => {
    try {
      const schema = await storage.getSchema(req.params.id);
      if (!schema) {
        return res.status(404).json({ message: "Schema não encontrado" });
      }

      // Log sync start
      await storage.createSyncLog({
        schemaId: schema.id,
        status: "pending",
        message: "Iniciando sincronização...",
      });

      const result = await prismaService.syncSchema(
        schema.name,
        schema.prismaContent,
      );

      // Log sync result
      await storage.createSyncLog({
        schemaId: schema.id,
        status: result.success ? "success" : "error",
        message: result.success
          ? "Sincronização concluída com sucesso"
          : "Erro durante sincronização",
        output: result.output,
      });

      res.json(result);
    } catch (error) {
      console.error("Error syncing schema:", error);
      res.status(500).json({ message: "Erro ao sincronizar schema" });
    }
  });

  // Sync logs
  app.get("/api/schemas/:id/logs", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getSyncLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
      res.status(500).json({ message: "Erro ao buscar logs" });
    }
  });

  // Schema comparison and auto-sync routes
  app.post("/api/schemas/:id/compare", isAuthenticated, async (req, res) => {
    try {
      const schema = await storage.getSchema(req.params.id);
      if (!schema) {
        return res.status(404).json({ message: "Schema não encontrado" });
      }

      const dbConnection = await storage.getDatabaseConnection(
        schema.databaseConnectionId,
      );
      if (!dbConnection) {
        return res
          .status(404)
          .json({ message: "Conexão de banco não encontrada" });
      }

      const comparison = await databaseService.compareSchemas(
        dbConnection,
        schema.name,
        schema.prismaContent,
      );

      res.json(comparison);
    } catch (error) {
      console.error("Error comparing schemas:", error);
      res.status(500).json({ message: "Erro ao comparar schemas" });
    }
  });

  app.post("/api/schemas/:id/auto-sync", isAuthenticated, async (req, res) => {
    try {
      const schema = await storage.getSchema(req.params.id);
      if (!schema) {
        return res.status(404).json({ message: "Schema não encontrado" });
      }

      const dbConnection = await storage.getDatabaseConnection(
        schema.databaseConnectionId,
      );
      if (!dbConnection) {
        return res
          .status(404)
          .json({ message: "Conexão de banco não encontrada" });
      }

      // Compara schemas primeiro
      const comparison = await databaseService.compareSchemas(
        dbConnection,
        schema.name,
        schema.prismaContent,
      );

      if (!comparison.needsSync) {
        return res.json({
          success: true,
          message: "Schema já está sincronizado",
          needsSync: false,
        });
      }

      // Log sync start
      await storage.createSyncLog({
        schemaId: schema.id,
        status: "pending",
        message: `Sincronização automática iniciada. Diferenças: ${comparison.differences.join("; ")}`,
      });

      // Executa a sincronização usando a conexão específica
      const result = await prismaService.syncSchema(
        schema.name,
        schema.prismaContent,
      );

      if (result.success) {
        // Atualiza o hash e timestamp da última sincronização
        const newHash = databaseService.generateSchemaHash(
          schema.prismaContent,
        );
        await storage.updateSchema(schema.id, {
          schemaHash: newHash,
          lastSyncedAt: new Date(),
        });
      }

      // Log sync result
      await storage.createSyncLog({
        schemaId: schema.id,
        status: result.success ? "success" : "error",
        message: result.success
          ? "Sincronização automática concluída com sucesso"
          : "Erro durante sincronização automática",
        output: result.output,
      });

      res.json({
        ...result,
        needsSync: !result.success,
        differences: comparison.differences,
      });
    } catch (error) {
      console.error("Error in auto-sync:", error);
      res
        .status(500)
        .json({ message: "Erro ao executar sincronização automática" });
    }
  });

  app.get("/api/schemas/:id/sync-status", isAuthenticated, async (req, res) => {
    try {
      const schema = await storage.getSchema(req.params.id);
      if (!schema) {
        return res.status(404).json({ message: "Schema não encontrado" });
      }

      const currentHash = databaseService.generateSchemaHash(
        schema.prismaContent,
      );
      const hasChanges = currentHash !== schema.schemaHash;

      res.json({
        hasChanges,
        lastSyncedAt: schema.lastSyncedAt,
        currentHash,
        storedHash: schema.schemaHash,
      });
    } catch (error) {
      console.error("Error checking sync status:", error);
      res
        .status(500)
        .json({ message: "Erro ao verificar status de sincronização" });
    }
  });

  // Database introspection
  app.post("/api/database/introspect", async (req, res) => {
    try {
      const result = await prismaService.introspectDatabase();
      res.json(result);
    } catch (error) {
      console.error("Error introspecting database:", error);
      res.status(500).json({ message: "Erro ao introspectar banco de dados" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
