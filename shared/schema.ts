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

// Schemas table - stores PostgreSQL schema definitions
export const schemas = pgTable("schemas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  prismaContent: text("prisma_content").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
export const schemasRelations = relations(schemas, ({ many }) => ({
  syncLogs: many(syncLogs),
}));

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  schema: one(schemas, {
    fields: [syncLogs.schemaId],
    references: [schemas.id],
  }),
}));

// Insert schemas
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
export type Schema = typeof schemas.$inferSelect;
export type InsertSchema = z.infer<typeof insertSchemaSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
