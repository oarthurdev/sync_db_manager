import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./supabaseAuth";
import { schemaService } from "./services/schema";
import { prismaService } from "./services/prisma";
import { insertSchemaSchema, insertSyncLogSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Schema routes
  app.get("/api/schemas", isAuthenticated, async (req, res) => {
    try {
      const schemas = await storage.getSchemas();
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
      
      // Check if schema name already exists
      const existing = await storage.getSchemaByName(validatedData.name);
      if (existing) {
        return res.status(400).json({ message: "Schema com este nome já existe" });
      }

      // Generate default Prisma content if not provided
      if (!validatedData.prismaContent) {
        validatedData.prismaContent = schemaService.generateDefaultPrismaContent(validatedData.name);
      }

      const schema = await storage.createSchema(validatedData);
      await schemaService.saveSchemaFile(schema.name, schema.prismaContent);
      
      res.json(schema);
    } catch (error: any) {
      console.error("Error creating schema:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
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
        await schemaService.saveSchemaFile(updatedSchema.name, updates.prismaContent);
      }
      
      res.json(updatedSchema);
    } catch (error: any) {
      console.error("Error updating schema:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
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

      const result = await prismaService.syncSchema(schema.name, schema.prismaContent);
      
      // Log sync result
      await storage.createSyncLog({
        schemaId: schema.id,
        status: result.success ? "success" : "error",
        message: result.success ? "Sincronização concluída com sucesso" : "Erro durante sincronização",
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

  // Database introspection
  app.post("/api/database/introspect", isAuthenticated, async (req, res) => {
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
