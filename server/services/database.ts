import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { DatabaseConnection } from '@shared/schema';
import crypto from 'crypto';

export class DatabaseService {
  private connections = new Map<string, { pool: Pool; db: any }>();

  /**
   * Cria uma string de conexão a partir dos dados de configuração
   */
  createConnectionString(config: DatabaseConnection): string {
    const { host, port, database, username, password, sslMode = 'prefer' } = config;
    return `postgresql://${username}:${password}@${host}:${port}/${database}?sslmode=${sslMode}`;
  }

  /**
   * Gera um hash do schema para detectar mudanças
   */
  generateSchemaHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Testa a conexão com um banco de dados
   */
  async testConnection(config: DatabaseConnection): Promise<{ success: boolean; error?: string }> {
    try {
      const connectionString = this.createConnectionString(config);
      const pool = new Pool({ connectionString });
      
      // Testa a conexão executando uma query simples
      const result = await pool.query('SELECT 1');
      await pool.end();
      
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Erro desconhecido ao conectar com o banco' 
      };
    }
  }

  /**
   * Obtém uma conexão ativa ou cria uma nova
   */
  async getConnection(config: DatabaseConnection) {
    const key = config.id;
    
    if (this.connections.has(key)) {
      return this.connections.get(key)!;
    }

    const connectionString = this.createConnectionString(config);
    const pool = new Pool({ connectionString });
    const db = drizzle({ client: pool });

    const connection = { pool, db };
    this.connections.set(key, connection);
    
    return connection;
  }

  /**
   * Fecha uma conexão específica
   */
  async closeConnection(configId: string): Promise<void> {
    const connection = this.connections.get(configId);
    if (connection) {
      await connection.pool.end();
      this.connections.delete(configId);
    }
  }

  /**
   * Fecha todas as conexões
   */
  async closeAllConnections(): Promise<void> {
    const entries = Array.from(this.connections.entries());
    for (const [key, connection] of entries) {
      await connection.pool.end();
    }
    this.connections.clear();
  }

  /**
   * Obtém informações sobre o schema atual do banco de dados
   * Isto permite comparar com o schema do Prisma para detectar divergências
   */
  async getDatabaseSchema(config: DatabaseConnection, schemaName: string): Promise<any> {
    try {
      const { db: connection } = await this.getConnection(config);
      
      // Query para obter informações sobre tabelas e colunas do schema específico
      const result = await connection.execute(`
        SELECT 
          table_name, 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = $1
        ORDER BY table_name, ordinal_position
      `, [schemaName]);

      return result.rows;
    } catch (error: any) {
      throw new Error(`Erro ao obter schema do banco: ${error.message}`);
    }
  }

  /**
   * Compara o schema do Prisma com o schema atual do banco
   * Retorna informações sobre diferenças encontradas
   */
  async compareSchemas(
    config: DatabaseConnection, 
    schemaName: string, 
    prismaContent: string
  ): Promise<{
    needsSync: boolean;
    differences: string[];
    databaseTables: any[];
  }> {
    try {
      const databaseTables = await this.getDatabaseSchema(config, schemaName);
      
      // Análise simples do conteúdo do Prisma para extrair modelos
      const prismaModels = this.extractPrismaModels(prismaContent);
      
      const differences: string[] = [];
      
      // Verifica se há tabelas no banco que não estão no Prisma
      const dbTableNames = Array.from(new Set(databaseTables.map((row: any) => row.table_name))) as string[];
      const prismaTableNames = prismaModels.map(model => model.tableName || model.name.toLowerCase());
      
      const extraDbTables = dbTableNames.filter(name => !prismaTableNames.includes(name));
      const missingDbTables = prismaTableNames.filter(name => !dbTableNames.includes(name));
      
      if (extraDbTables.length > 0) {
        differences.push(`Tabelas no banco mas não no Prisma: ${extraDbTables.join(', ')}`);
      }
      
      if (missingDbTables.length > 0) {
        differences.push(`Tabelas no Prisma mas não no banco: ${missingDbTables.join(', ')}`);
      }

      return {
        needsSync: differences.length > 0,
        differences,
        databaseTables
      };
    } catch (error: any) {
      throw new Error(`Erro ao comparar schemas: ${error.message}`);
    }
  }

  /**
   * Extrai modelos do conteúdo do Prisma de forma simples
   */
  private extractPrismaModels(content: string): Array<{ name: string; tableName?: string }> {
    const models: Array<{ name: string; tableName?: string }> = [];
    const modelRegex = /model\s+(\w+)\s*{([^}]*)}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const modelContent = match[2];
      
      // Procura por @@map para nome da tabela customizado
      const mapMatch = modelContent.match(/@@map\("([^"]+)"\)/);
      const tableName = mapMatch ? mapMatch[1] : modelName.toLowerCase();
      
      models.push({ name: modelName, tableName });
    }

    return models;
  }
}

export const databaseService = new DatabaseService();