import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export class PrismaService {
  private schemasDir = path.resolve(process.cwd(), "prisma-schemas");

  async validateSchema(schemaContent: string): Promise<{ valid: boolean; errors?: string }> {
    try {
      // Create temporary schema file for validation
      const tempPath = path.join(this.schemasDir, "temp-validation.prisma");
      await import("fs/promises").then(fs => fs.writeFile(tempPath, schemaContent));
      
      // Run prisma validate
      await execAsync(`npx prisma validate --schema="${tempPath}"`);
      
      // Clean up temp file
      await import("fs/promises").then(fs => fs.unlink(tempPath));
      
      return { valid: true };
    } catch (error: any) {
      return { 
        valid: false, 
        errors: error.message || "Erro de validação desconhecido" 
      };
    }
  }

  async formatSchema(schemaContent: string): Promise<string> {
    try {
      // Create temporary schema file
      const tempPath = path.join(this.schemasDir, "temp-format.prisma");
      await import("fs/promises").then(fs => fs.writeFile(tempPath, schemaContent));
      
      // Run prisma format
      await execAsync(`npx prisma format --schema="${tempPath}"`);
      
      // Read formatted content
      const formatted = await import("fs/promises").then(fs => fs.readFile(tempPath, "utf-8"));
      
      // Clean up temp file
      await import("fs/promises").then(fs => fs.unlink(tempPath));
      
      return formatted;
    } catch (error) {
      // If formatting fails, return original content
      return schemaContent;
    }
  }

  async syncSchema(schemaName: string, schemaContent: string): Promise<{ success: boolean; output: string }> {
    try {
      const schemaPath = path.join(this.schemasDir, `${schemaName}.prisma`);
      
      // Save schema content to file
      await import("fs/promises").then(fs => fs.writeFile(schemaPath, schemaContent));
      
      // Run prisma db push
      const { stdout, stderr } = await execAsync(
        `npx prisma db push --schema="${schemaPath}"`,
        { 
          env: { 
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL 
          }
        }
      );
      
      const output = stdout + (stderr ? `\nErros:\n${stderr}` : "");
      
      return { success: true, output };
    } catch (error: any) {
      return { 
        success: false, 
        output: error.message || "Erro durante sincronização" 
      };
    }
  }

  async introspectDatabase(): Promise<{ success: boolean; output: string; schema?: string }> {
    try {
      const { stdout } = await execAsync(`npx prisma db pull`, {
        env: { 
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL 
        }
      });
      
      return { success: true, output: stdout, schema: stdout };
    } catch (error: any) {
      return { 
        success: false, 
        output: error.message || "Erro durante introspecção" 
      };
    }
  }
}

export const prismaService = new PrismaService();
