const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'agendafacil.db');

let db;

async function init() {
  const SQL = await initSqlJs();

  // Carregar banco existente ou criar novo
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('✅ Banco de dados carregado (agendafacil.db)');
  } else {
    db = new SQL.Database();
    console.log('✅ Novo banco de dados criado');
  }

  // Criar tabelas
  db.run(`
    CREATE TABLE IF NOT EXISTS estabelecimentos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      senha TEXT NOT NULL,
      telefone TEXT,
      endereco TEXT,
      google_maps_url TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS servicos (
      id TEXT PRIMARY KEY,
      estabelecimento_id TEXT NOT NULL,
      nome TEXT NOT NULL,
      duracao_minutos INTEGER NOT NULL DEFAULT 30,
      preco REAL DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS horarios_funcionamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estabelecimento_id TEXT NOT NULL,
      dia_semana INTEGER NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id TEXT PRIMARY KEY,
      estabelecimento_id TEXT NOT NULL,
      servico_id TEXT NOT NULL,
      nome_paciente TEXT NOT NULL,
      telefone_paciente TEXT NOT NULL,
      data TEXT NOT NULL,
      hora TEXT NOT NULL,
      status TEXT DEFAULT 'agendado',
      lembrete_enviado INTEGER DEFAULT 0,
      avaliacao_pedida INTEGER DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id),
      FOREIGN KEY (servico_id) REFERENCES servicos(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS whatsapp_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estabelecimento_id TEXT NOT NULL,
      api_url TEXT,
      api_token TEXT,
      ativo INTEGER DEFAULT 0,
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  save();
  console.log('✅ Tabelas criadas/verificadas');
}

// Salvar banco no arquivo
function save() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Executar query que modifica (INSERT, UPDATE, DELETE)
function run(sql, params = []) {
  const result = db.run(sql, params);
  save();
  return result;
}

// Buscar um registro
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Buscar vários registros
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

module.exports = { init, run, get, all, save };
