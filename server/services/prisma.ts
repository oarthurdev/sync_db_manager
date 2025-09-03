import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export class PrismaService {
  private schemasDir = path.resolve(process.cwd(), "prisma-schemas");

  async validateSchema(
    schemaContent: string,
  ): Promise<{ valid: boolean; errors?: string }> {
    try {
      // Create temporary schema file for validation
      const tempPath = path.join(this.schemasDir, "temp-validation.prisma");
      await import("fs/promises").then((fs) =>
        fs.writeFile(tempPath, schemaContent),
      );

      // Run prisma validate
      await execAsync(`npx prisma validate --schema="${tempPath}"`);

      // Clean up temp file
      await import("fs/promises").then((fs) => fs.unlink(tempPath));

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        errors: error.message || "Erro de validação desconhecido",
      };
    }
  }

  async formatSchema(schemaContent: string): Promise<string> {
    try {
      // Create temporary schema file
      const tempPath = path.join(this.schemasDir, "temp-format.prisma");
      await import("fs/promises").then((fs) =>
        fs.writeFile(tempPath, schemaContent),
      );

      // Run prisma format
      await execAsync(`npx prisma format --schema="${tempPath}"`);

      // Read formatted content
      const formatted = await import("fs/promises").then((fs) =>
        fs.readFile(tempPath, "utf-8"),
      );

      // Clean up temp file
      await import("fs/promises").then((fs) => fs.unlink(tempPath));

      return formatted;
    } catch (error) {
      // If formatting fails, return original content
      return schemaContent;
    }
  }

  async syncSchema(
    schemaName: string,
    schemaContent: string,
    connectionString?: string,
  ): Promise<{ success: boolean; output: string }> {
    try {
      const schemaPath = path.join(this.schemasDir, `${schemaName}.prisma`);

      // Save schema content to file
      await import("fs/promises").then((fs) =>
        fs.writeFile(schemaPath, schemaContent),
      );

      // Use the provided connection string or fall back to the default DATABASE_URL
      const databaseUrl = connectionString || process.env.DATABASE_URL;

      // Run prisma db push
      const { stdout, stderr } = await execAsync(
        `npx prisma db push --schema="${schemaPath}"`,
        {
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
          },
        },
      );

      const output = stdout + (stderr ? `\nErros:\n${stderr}` : "");

      return { success: true, output };
    } catch (error: any) {
      return {
        success: false,
        output: error.message || "Erro durante sincronização",
      };
    }
  }

  async introspectDatabase(
    connectionString?: string,
    databaseConnection?: any,
  ): Promise<{ success: boolean; output: string; schemas?: { [schemaName: string]: string } }> {
    try {
      // Use the provided connection string or fall back to the default DATABASE_URL
      const databaseUrl = connectionString || process.env.DATABASE_URL;
      
      let availableSchemas: string[] = [];
      
      // If we have a database connection object, get all available schemas
      if (databaseConnection) {
        const { DatabaseService } = await import('./database');
        const dbService = new DatabaseService();
        availableSchemas = await dbService.getAllSchemas(databaseConnection);
      } else {
        // Fallback to just 'public' schema if no connection provided
        availableSchemas = ['public'];
      }
      
      // Create one comprehensive schema with all schemas listed
      const tempSchemaName = `introspect_multi_${Date.now()}`;
      const tempSchemaPath = path.join(
        this.schemasDir,
        `${tempSchemaName}.prisma`,
      );
      
      // Create schema with all available schemas listed to handle cross-references
      const multiSchemaDefinition = `
// Multi-schema introspection with cross-schema support
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = [${availableSchemas.map(s => `"${s}"`).join(', ')}]
}
`.trim();
      
      // Save the schema file
      await import("fs/promises").then((fs) =>
        fs.writeFile(tempSchemaPath, multiSchemaDefinition),
      );
      
      // Run prisma db pull with all schemas
      const { stdout } = await execAsync(
        `npx prisma db pull --schema="${tempSchemaPath}"`,
        {
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
          },
        },
      );
      
      // Read the generated schema content
      const fullGeneratedSchema = await import("fs/promises").then((fs) =>
        fs.readFile(tempSchemaPath, "utf8"),
      );
      
      // Now create individual schema files for each schema
      const generatedSchemas: { [schemaName: string]: string } = {};
      
      for (const schemaName of availableSchemas) {
        const individualSchemaName = `${schemaName}_${Date.now()}`;
        const individualSchemaPath = path.join(
          this.schemasDir,
          `${individualSchemaName}.prisma`,
        );
        
        // Create individual schema with models filtered for this specific schema
        const individualSchema = this.createSchemaForSpecificSchema(
          fullGeneratedSchema,
          schemaName,
          availableSchemas,
        );
        
        // Save individual schema file
        await import("fs/promises").then((fs) =>
          fs.writeFile(individualSchemaPath, individualSchema),
        );
        
        generatedSchemas[schemaName] = individualSchema;
      }
      
      // Clean up temporary file
      await import("fs/promises").then((fs) =>
        fs.unlink(tempSchemaPath).catch(() => {}),
      );
      
      return { 
        success: true, 
        output: stdout, 
        schemas: generatedSchemas 
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.message || "Erro durante introspecção",
      };
    }
  }

  /**
   * Creates a schema file focused on a specific schema with cross-schema support
   */
  private createSchemaForSpecificSchema(
    fullSchema: string,
    targetSchema: string,
    allSchemas: string[],
  ): string {
    const lines = fullSchema.split('\n');
    const result: string[] = [];
    let inModel = false;
    let currentModelLines: string[] = [];
    let currentModelSchema = '';
    
    for (const line of lines) {
      // Always include generator and datasource sections
      if (line.includes('generator ') || line.includes('datasource ') || 
          line.includes('provider =') || line.includes('url =') || 
          line.includes('schemas =')) {
        result.push(line);
        continue;
      }
      
      // Check if starting a model
      if (line.startsWith('model ')) {
        if (inModel && currentModelLines.length > 0) {
          // Finish previous model if it belongs to target schema
          if (currentModelSchema === targetSchema || currentModelSchema === '') {
            result.push(...currentModelLines);
            result.push('}');
          }
        }
        
        inModel = true;
        currentModelLines = [line];
        currentModelSchema = targetSchema; // Default to target schema
        continue;
      }
      
      if (inModel) {
        // Look for schema specification within model
        if (line.includes('@@schema(')) {
          const match = line.match(/@@schema\("([^"]+)"\)/);
          if (match) {
            currentModelSchema = match[1];
          }
        }
        
        currentModelLines.push(line);
        
        // Check if ending model
        if (line.startsWith('}')) {
          // Include this model only if it belongs to target schema
          if (currentModelSchema === targetSchema) {
            result.push(...currentModelLines);
          }
          inModel = false;
          currentModelLines = [];
          currentModelSchema = '';
        }
      } else {
        // Include other content (enums, comments, etc.)
        if (line.trim() && !line.startsWith('model ')) {
          result.push(line);
        }
      }
    }
    
    return result.join('\n');
  }
}

export const prismaService = new PrismaService();
