// ============================================================
// DATABASE - Conexão e operações no SQLite
// ============================================================
// Este módulo cuida de TUDO relacionado ao banco de dados:
// - Cria/Carrega o arquivo .db
// - Cria as tabelas (se não existirem)
// - Executa queries (INSERT, UPDATE, DELETE, SELECT)
// 
// Usamos sql.js porque ele é 100% JavaScript (sem C++)
// perfeito para projetos que precisam rodar em qualquer PC
// ============================================================

import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";

// Caminho do arquivo do banco (mesma pasta do projeto)
const DB_PATH = path.join(__dirname, "..", "agendafacil.db");

// Variável que guarda a instância do banco (começa vazia)
let db: Database;

/**
 * INICIALIZA o banco de dados.
 * Deve ser chamado ANTES de usar qualquer outra função.
 * Se o arquivo .db já existe → carrega ele.
 * Se não existe → cria um novo + cria as tabelas.
 * 
 * (async = assíncrono, porque precisa carregar o sql.js primeiro)
 */
export async function initDatabase(): Promise<void> {
  // Carrega a biblioteca sql.js
  const SQL = await initSqlJs();

  // Verifica se o arquivo do banco já existe
  if (fs.existsSync(DB_PATH)) {
    // Existe: lê o arquivo e carrega na memória
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log("📁 Banco carregado do arquivo");
  } else {
    // Não existe: cria banco novo em memória
    db = new SQL.Database();
    console.log("🆕 Novo banco criado");
  }

  // Cria as tabelas (se já existirem, não faz nada - "IF NOT EXISTS")
  criarTabelas();
  save(); // Salva no arquivo pela primeira vez
  console.log("✅ Tabelas verificadas/criadas");
}

/**
 * CRIA TABELAS - Define a estrutura do banco.
 * Cada "CREATE TABLE IF NOT EXISTS" só roda se a tabela não existe.
 * 
 * Tabelas:
 * - estabelecimentos: clínicas, consultórios, etc.
 * - servicos: serviços oferecados por cada estabelecimento
 * - horarios_funcionamento: quando cada lugar abre/fecha
 * - agendamentos: cada agendamento feito pelo paciente
 * - whatsapp_config: config da API de WhatsApp de cada estabelecimento
 */
function criarTabelas(): void {
  // Tabela de estabelecimentos
  db.run(`
    CREATE TABLE IF NOT EXISTS estabelecimentos (
      id TEXT PRIMARY KEY,           -- Identificador único (UUID)
      nome TEXT NOT NULL,             -- Nome do estabelecimento
      slug TEXT UNIQUE NOT NULL,      -- Identificador na URL (único)
      email TEXT NOT NULL,             -- Email de login
      senha TEXT NOT NULL,             -- Senha de login
      telefone TEXT,                   -- WhatsApp (opcional)
      endereco TEXT,                   -- Endereço (opcional)
      google_maps_url TEXT,            -- Link Google Maps (opcional)
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP  -- Auto-preenchido
    )
  `);

  // Tabela de serviços
  db.run(`
    CREATE TABLE IF NOT EXISTS servicos (
      id TEXT PRIMARY KEY,                    -- UUID
      estabelecimento_id TEXT NOT NULL,        -- FK → estabelecimentos
      nome TEXT NOT NULL,                      -- Ex: "Limpeza de Pele"
      duracao_minutos INTEGER NOT NULL,        -- Ex: 60 (minutos)
      preco REAL DEFAULT 0,                    -- Ex: 150.00
      ativo INTEGER DEFAULT 1,                 -- 1=ativo, 0=desativado
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  // Tabela de horários de funcionamento
  // dia_semana: 0=Domingo, 1=Segunda ... 6=Sábado
  db.run(`
    CREATE TABLE IF NOT EXISTS horarios_funcionamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,   -- Auto-numerado
      estabelecimento_id TEXT NOT NULL,        -- FK → estabelecimentos
      dia_semana INTEGER NOT NULL,             -- 0-6
      hora_inicio TEXT NOT NULL,               -- "08:00"
      hora_fim TEXT NOT NULL,                  -- "18:00"
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  // Tabela de agendamentos
  db.run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id TEXT PRIMARY KEY,                     -- UUID
      estabelecimento_id TEXT NOT NULL,         -- FK → estabelecimentos
      servico_id TEXT NOT NULL,                 -- FK → servicos
      nome_paciente TEXT NOT NULL,              -- Nome do paciente
      telefone_paciente TEXT NOT NULL,          -- WhatsApp do paciente
      data TEXT NOT NULL,                       -- "YYYY-MM-DD"
      hora TEXT NOT NULL,                       -- "HH:MM"
      status TEXT DEFAULT 'agendado',           -- agendado|cancelado|concluido
      lembrete_enviado INTEGER DEFAULT 0,       -- 0=não enviado, 1=enviado
      avaliacao_pedida INTEGER DEFAULT 0,       -- 0=não pedida, 1=pedida
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id),
      FOREIGN KEY (servico_id) REFERENCES servicos(id)
    )
  `);

  // Tabela de configuração do WhatsApp API
  // Cada estabelecimento conecta sua própria API
  db.run(`
    CREATE TABLE IF NOT EXISTS whatsapp_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estabelecimento_id TEXT NOT NULL,         -- FK → estabelecimentos
      api_url TEXT,                              -- URL da API
      api_token TEXT,                            -- Token/chave da API
      ativo INTEGER DEFAULT 0,                   -- 0=desativada, 1=ativa
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);
}

/**
 * SALVA o banco de dados no arquivo físico.
 * Toda vez que o banco é modificado (INSERT, UPDATE, delete),
 * precisamos chamar essa função pra persistir no arquivo.
 * 
 * Como o sql.js mantém tudo em memória, se não salvar,
 * tudo é perdido quando o servidor desliga.
 */
export function save(): void {
  const data = db.export();           // Exporta como Uint8Array
  const buffer = Buffer.from(data);   // Converte pra Buffer (Node.js)
  fs.writeFileSync(DB_PATH, buffer);  // Escreve no arquivo
}

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
export function run(sql: string, params: unknown[] = []): void {
  db.run(sql, params as (string | number | Uint8Array | null)[]);
  save(); // Salva automaticamente após cada modificação
}

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
export function get(sql: string, params: unknown[] = []): Record<string, unknown> | null {
  const stmt = db.prepare(sql);
  stmt.bind(params as (string | number | Uint8Array | null)[]);
  
  if (stmt.step()) {
    // step() = avança pro próximo resultado
    // getAsObject() = converte a linha pra objeto_JS {coluna: valor, ...}
    const row = stmt.getAsObject() as Record<string, unknown>;
    stmt.free(); // Libera a memória do statement
    return row;
  }
  
  stmt.free();
  return null; // Não encontrou nada
}

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
export function all(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  stmt.bind(params as (string | number | Uint8Array | null)[]);
  
  const rows: Record<string, unknown>[] = [];
  
  // Loop: enquanto tiver próximo resultado, adiciona no array
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, unknown>);
  }
  
  stmt.free();
  return rows;
}
