// ============================================================
// DECLARAÇÃO DE TIPOS PARA sql.js
// ============================================================
// O sql.js não tem tipos TypeScript oficiais,
// então criamos nossa própria declaração aqui.
// Isso diz pro TypeScript: "confia, esse módulo existe e tem essas funções"
// ============================================================

declare module "sql.js" {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  export interface Database {
    run(sql: string, params?: (string | number | Uint8Array | null)[]): Database;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface Statement {
    bind(params?: (string | number | Uint8Array | null)[]): boolean;
    step(): boolean;
    getAsObject(params?: Record<string, unknown>): Record<string, unknown>;
    free(): boolean;
  }

  export interface QueryExecResult {
    columns: string[];
    values: (string | number | null)[][];
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;
}
