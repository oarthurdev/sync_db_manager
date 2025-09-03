import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Database connections table - stores multiple PostgreSQL database configurations
export const databaseConnections = pgTable("database_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  host: varchar("host").notNull(),
  port: varchar("port").notNull().default("5432"),
  database: varchar("database").notNull(),
  username: varchar("username").notNull(),
  password: varchar("password").notNull(),
  sslMode: varchar("ssl_mode").default("prefer"),
  isActive: boolean("is_active").default(true),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas table - stores PostgreSQL schema definitions
export const schemas = pgTable("schemas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  prismaContent: text("prisma_content").notNull(),
  databaseConnectionId: varchar("database_connection_id").notNull().references(() => databaseConnections.id),
  lastSyncedAt: timestamp("last_synced_at"),
  schemaHash: varchar("schema_hash"), // Para detectar mudanças
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique constraint: schema name per database connection
  index("unique_schema_per_db").on(table.name, table.databaseConnectionId)
]);

// Sync logs table - stores synchronization history
export const syncLogs = pgTable("sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schemaId: varchar("schema_id").notNull().references(() => schemas.id),
  status: varchar("status", { enum: ["success", "error", "pending"] }).notNull(),
  message: text("message"),
  output: text("output"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  databaseConnections: many(databaseConnections),
}));

export const databaseConnectionsRelations = relations(databaseConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [databaseConnections.userId],
    references: [users.id],
  }),
  schemas: many(schemas),
}));

export const schemasRelations = relations(schemas, ({ one, many }) => ({
  databaseConnection: one(databaseConnections, {
    fields: [schemas.databaseConnectionId],
    references: [databaseConnections.id],
  }),
  syncLogs: many(syncLogs),
}));

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  schema: one(schemas, {
    fields: [syncLogs.schemaId],
    references: [schemas.id],
  }),
}));

// Insert schemas
export const insertDatabaseConnectionSchema = createInsertSchema(databaseConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchemaSchema = createInsertSchema(schemas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSyncLogSchema = createInsertSchema(syncLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type DatabaseConnection = typeof databaseConnections.$inferSelect;
export type InsertDatabaseConnection = z.infer<typeof insertDatabaseConnectionSchema>;
export type Schema = typeof schemas.$inferSelect;
export type InsertSchema = z.infer<typeof insertSchemaSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
