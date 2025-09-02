import fs from "fs/promises";
import path from "path";
import { storage } from "../storage";

export class SchemaService {
  private schemasDir = path.resolve(process.cwd(), "prisma-schemas");

  constructor() {
    this.ensureSchemasDirectory();
  }

  private async ensureSchemasDirectory() {
    try {
      await fs.access(this.schemasDir);
    } catch {
      await fs.mkdir(this.schemasDir, { recursive: true });
    }
  }

  async saveSchemaFile(schemaName: string, content: string): Promise<void> {
    const filePath = path.join(this.schemasDir, `${schemaName}.prisma`);
    await fs.writeFile(filePath, content, "utf-8");
  }

  async readSchemaFile(schemaName: string): Promise<string> {
    const filePath = path.join(this.schemasDir, `${schemaName}.prisma`);
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch {
      return "";
    }
  }

  async deleteSchemaFile(schemaName: string): Promise<void> {
    const filePath = path.join(this.schemasDir, `${schemaName}.prisma`);
    try {
      await fs.unlink(filePath);
    } catch {
      // File doesn't exist, ignore
    }
  }

  async listSchemaFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.schemasDir);
      return files.filter(file => file.endsWith(".prisma")).map(file => file.replace(".prisma", ""));
    } catch {
      return [];
    }
  }

  generateDefaultPrismaContent(schemaName: string): string {
    return `// Schema para ${schemaName}
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["${schemaName}"]
}

// Adicione seus modelos aqui
// Exemplo:
// model Example {
//   id        Int      @id @default(autoincrement())
//   name      String
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
//
//   @@schema("${schemaName}")
// }
`;
  }
}

export const schemaService = new SchemaService();
