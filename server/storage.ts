import {
  users,
  schemas,
  syncLogs,
  type User,
  type UpsertUser,
  type Schema,
  type InsertSchema,
  type SyncLog,
  type InsertSyncLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Schema operations
  getSchemas(): Promise<Schema[]>;
  getSchema(id: string): Promise<Schema | undefined>;
  getSchemaByName(name: string): Promise<Schema | undefined>;
  createSchema(schema: InsertSchema): Promise<Schema>;
  updateSchema(id: string, schema: Partial<InsertSchema>): Promise<Schema>;
  deleteSchema(id: string): Promise<void>;
  
  // Sync log operations
  getSyncLogs(schemaId: string): Promise<SyncLog[]>;
  createSyncLog(log: InsertSyncLog): Promise<SyncLog>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Schema operations
  async getSchemas(): Promise<Schema[]> {
    return await db.select().from(schemas).orderBy(schemas.name);
  }

  async getSchema(id: string): Promise<Schema | undefined> {
    const [schema] = await db.select().from(schemas).where(eq(schemas.id, id));
    return schema;
  }

  async getSchemaByName(name: string): Promise<Schema | undefined> {
    const [schema] = await db.select().from(schemas).where(eq(schemas.name, name));
    return schema;
  }

  async createSchema(schemaData: InsertSchema): Promise<Schema> {
    const [schema] = await db
      .insert(schemas)
      .values(schemaData)
      .returning();
    return schema;
  }

  async updateSchema(id: string, schemaData: Partial<InsertSchema>): Promise<Schema> {
    const [schema] = await db
      .update(schemas)
      .set({ ...schemaData, updatedAt: new Date() })
      .where(eq(schemas.id, id))
      .returning();
    return schema;
  }

  async deleteSchema(id: string): Promise<void> {
    await db.delete(schemas).where(eq(schemas.id, id));
  }

  // Sync log operations
  async getSyncLogs(schemaId: string): Promise<SyncLog[]> {
    return await db
      .select()
      .from(syncLogs)
      .where(eq(syncLogs.schemaId, schemaId))
      .orderBy(desc(syncLogs.createdAt));
  }

  async createSyncLog(logData: InsertSyncLog): Promise<SyncLog> {
    const [log] = await db
      .insert(syncLogs)
      .values(logData)
      .returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
