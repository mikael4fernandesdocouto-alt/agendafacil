/**
 * INICIALIZA o banco de dados.
 * Deve ser chamado ANTES de usar qualquer outra função.
 * Se o arquivo .db já existe → carrega ele.
 * Se não existe → cria um novo + cria as tabelas.
 *
 * (async = assíncrono, porque precisa carregar o sql.js primeiro)
 */
export declare function initDatabase(): Promise<void>;
/**
 * SALVA o banco de dados no arquivo físico.
 * Toda vez que o banco é modificado (INSERT, UPDATE, delete),
 * precisamos chamar essa função pra persistir no arquivo.
 *
 * Como o sql.js mantém tudo em memória, se não salvar,
 * tudo é perdido quando o servidor desliga.
 */
export declare function save(): void;
/**
 * EXECUTAR - Rode qualquer query que MODIFICA dados.
 * (INSERT, UPDATE, DELETE, CREATE, DROP...)
 *
 * @param sql  - A query SQL com ? nos valores
 * @param params - Array de valores pra substituir os ?
 *
 * Exemplo:
 *   run("INSERT INTO servicos (id, nome) VALUES (?, ?)", ["abc-123", "Limpeza"])
 */
export declare function run(sql: string, params?: unknown[]): void;
/**
 * GET - Busca UM único registro no banco.
 * Retorna null se não encontrar nada.
 *
 * @param sql - Query SQL com ?
 * @param params - Valores pros ?
 *
 * Exemplo:
 *   const user = get("SELECT * FROM estabelecimentos WHERE id = ?", ["abc-123"])
 *   if (user) console.log(user.nome)
 */
export declare function get(sql: string, params?: unknown[]): Record<string, unknown> | null;
/**
 * ALL - Busca VÁRIOS registros no banco.
 * Retorna um array de objetos (vazio se não encontrar nada).
 *
 * @param sql - Query SQL com ?
 * @param params - Valores pros ?
 *
 * Exemplo:
 *   const servicos = all("SELECT * FROM servicos WHERE estabelecimento_id = ?", ["abc-123"])
 *   servicos.forEach(s => console.log(s.nome))
 */
export declare function all(sql: string, params?: unknown[]): Record<string, unknown>[];
//# sourceMappingURL=database.d.ts.map