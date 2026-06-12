// ============================================================
// SERVER - API REST do AgendaFácil
// ============================================================
// Este é o arquivo principal do back-end.
// Ele cria um servidor HTTP (Express) que escuta na porta 3000
// e responde às requisições do front-end.
// 
// FLUXO:
// 1. Front faz fetch("http://localhost:3000/api/estabelecimentos", {method: "POST", ...})
// 2. Express recebe a requisição e identifica a rota
// 3. A função da rota valida os dados e chama o banco
// 4. O banco executa o SQL e retorna o resultado
// 5. A rota monta a resposta JSON e manda pro front
// ============================================================

import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Importa as funções do banco de dados
import { initDatabase, run, get, all } from "./database";

// Importa os tipos TypeScript
import type {
  CriarEstabelecimentoRequest,
  LoginRequest,
  CriarServicoRequest,
  CriarAgendamentoRequest,
} from "./types";

// ============================================================
// CONFIGURAÇÃO DO EXPRESS
// ============================================================

const app = express();           // Cria o app Express
const PORT = process.env.PORT || 3000;  // Porta (3000 ou variável de ambiente)

// MIDDLEWARE = funções que rodam ANTES de cada rota
app.use(cors());                 // Permite requisições de outros domínios (front local)
app.use(express.json());         // Converte o body JSON pra objeto JavaScript automaticamente
app.use(express.static(path.join(__dirname, "..", "front")));  // Serve arquivos HTML/CSS/JS da pasta front/

// ============================================================
// ROTAS DE ESTABELECIMENTO
// ============================================================

/**
 * POST /api/estabelecimentos
 * 
 * CADASTRAR um novo estabelecimento (clínica, consultório, etc.)
 * 
 * O front envia no body:
 * {
 *   "nome": "Clínica Beleza",
 *   "slug": "clinica-beleza",
 *   "email": "contato@clinica.com",
 *   "senha": "123456",
 *   "telefone": "35999999999",
 *   "google_maps_url": "https://..."
 * }
 * 
 * Retorna: { id: "uuid-gerado", mensagem: "..." }
 */
app.post("/api/estabelecimentos", (req: Request, res: Response) => {
  try {
    // 1. Pega os dados que o front enviou
    const { nome, slug, email, senha, telefone, endereco, google_maps_url } =
      req.body as CriarEstabelecimentoRequest;

    // 2. VALIDAÇÃO: verifica se os campos obrigatórios estão preenchidos
    if (!nome || !slug || !email || !senha) {
      return res.status(400).json({
        erro: "Campos obrigatórios: nome, slug, email, senha",
      });
    }

    // 3. Gera um ID único (UUID v4) pra esse estabelecimento
    const id = uuidv4();

    // 4. INSERT no banco de dados
    //    Os ? são placeholders - o sql.js substitui pelos valores do array
    //    Isso evita SQL injection (ataque onde alguém coloca SQL malicioso nos campos)
    run(
      `INSERT INTO estabelecimentos (id, nome, slug, email, senha, telefone, endereco, google_maps_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, nome, slug, email, senha, telefone || null, endereco || null, google_maps_url || null]
    );

    // 5. Retorna sucesso com o ID criado
    res.status(201).json({ id, mensagem: "Estabelecimento cadastrado com sucesso!" });
  } catch (err: unknown) {
    // Se der erro de UNIQUE (slug já existe), retorna 409
    const error = err as Error;
    if (error.message.includes("UNIQUE")) {
      return res.status(409).json({
        erro: "Este slug já está em uso. Escolha outro.",
      });
    }
    console.error("Erro ao cadastrar:", error);
    res.status(500).json({ erro: "Erro ao cadastrar estabelecimento" });
  }
});

/**
 * GET /api/estabelecimentos/slug/:slug
 * 
 * BUSCAR um estabelecimento pelo SLUG (página pública de agendamento).
 * 
 * Ex: GET /api/estabelecimentos/slug/clinica-beleza
 * 
 * Retorna os dados do estabelecimento + serviços + horários.
 * NÃO retorna a senha (por segurança).
 */
app.get("/api/estabelecimentos/slug/:slug", (req: Request, res: Response) => {
  try {
    // 1. Busca o estabelecimento pelo slug
    const est = get(
      "SELECT id, nome, slug, telefone, endereco, google_maps_url FROM estabelecimentos WHERE slug = ?",
      [req.params.slug]
    );

    // 2. Se não encontrou, retorna 404
    if (!est) {
      return res.status(404).json({ erro: "Estabelecimento não encontrado" });
    }

    // 3. Busca os serviços ativos desse estabelecimento
    const servicos = all(
      "SELECT * FROM servicos WHERE estabelecimento_id = ? AND ativo = 1",
      [est.id]
    );

    // 4. Busca os horários de funcionamento
    const horarios = all(
      "SELECT * FROM horarios_funcionamento WHERE estabelecimento_id = ?",
      [est.id]
    );

    // 5. Retorna tudo junto
    res.json({ ...est, servicos, horarios });
  } catch (err) {
    console.error("Erro ao buscar:", err);
    res.status(500).json({ erro: "Erro ao buscar estabelecimento" });
  }
});

/**
 * POST /api/login
 * 
 * FAZER LOGIN do dono do estabelecimento.
 * 
 * O front envia:
 * { "email": "contato@clinica.com", "senha": "123456" }
 * 
 * Retorna: { id, nome, slug } (sem a senha!)
 */
app.post("/api/login", (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body as LoginRequest;

    // Busca o estabelecimento com esse email E essa senha
    const est = get(
      "SELECT id, nome, slug FROM estabelecimentos WHERE email = ? AND senha = ?",
      [email, senha]
    );

    // Se não encontrou, email ou senha estão errados
    if (!est) {
      return res.status(401).json({ erro: "Email ou senha incorretos" });
    }

    // Retorna os dados (sem senha!)
    res.json(est);
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ erro: "Erro no login" });
  }
});

// ============================================================
// ROTAS DE SERVIÇOS
// ============================================================

/**
 * GET /api/servicos/:estabelecimento_id
 * 
 * LISTAR todos os serviços ativos de um estabelecimento.
 * 
 * Ex: GET /api/servicos/abc-123-uuid
 * 
 * Retorna: [ { id, nome, duracao_minutos, preco }, ... ]
 */
app.get("/api/servicos/:estabelecimento_id", (req: Request, res: Response) => {
  try {
    const servicos = all(
      "SELECT * FROM servicos WHERE estabelecimento_id = ? AND ativo = 1",
      [req.params.estabelecimento_id]
    );
    res.json(servicos);
  } catch (err) {
    console.error("Erro ao listar serviços:", err);
    res.status(500).json({ erro: "Erro ao listar serviços" });
  }
});

/**
 * POST /api/servicos
 * 
 * CRIAR um novo serviço.
 * 
 * O front envia:
 * {
 *   "estabelecimento_id": "abc-123-uuid",
 *   "nome": "Limpeza de Pele",
 *   "duracao_minutos": 60,
 *   "preco": 150.00
 * }
 */
app.post("/api/servicos", (req: Request, res: Response) => {
  try {
    const { estabelecimento_id, nome, duracao_minutos, preco } =
      req.body as CriarServicoRequest;

    // Validação
    if (!estabelecimento_id || !nome || !duracao_minutos) {
      return res.status(400).json({
        erro: "Campos obrigatórios: estabelecimento_id, nome, duracao_minutos",
      });
    }

    const id = uuidv4();
    run(
      "INSERT INTO servicos (id, estabelecimento_id, nome, duracao_minutos, preco) VALUES (?, ?, ?, ?, ?)",
      [id, estabelecimento_id, nome, duracao_minutos, preco || 0]
    );

    res.status(201).json({ id, mensagem: "Serviço cadastrado!" });
  } catch (err) {
    console.error("Erro ao criar serviço:", err);
    res.status(500).json({ erro: "Erro ao criar serviço" });
  }
});

/**
 * DELETE /api/servicos/:id
 * 
 * REMOVER (desativar) um serviço.
 * Não deleta de verdade - só marca como ativo=0.
 * Assim não perdemos histórico de agendamentos antigos.
 */
app.delete("/api/servicos/:id", (req: Request, res: Response) => {
  try {
    run("UPDATE servicos SET ativo = 0 WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Serviço removido!" });
  } catch (err) {
    console.error("Erro ao remover serviço:", err);
    res.status(500).json({ erro: "Erro ao remover serviço" });
  }
});

// ============================================================
// ROTAS DE AGENDAMENTO
// ============================================================

/**
 * GET /api/agendamentos/:estabelecimento_id/:data
 * 
 * LISTAR agendamentos de um dia específico.
 * 
 * Ex: GET /api/agendamentos/abc-123/2026-06-15
 * 
 * Retorna: [ { id, nome_paciente, hora, servico_nome, ... }, ... ]
 */
app.get("/api/agendamentos/:estabelecimento_id/:data", (req: Request, res: Response) => {
  try {
    const agendamentos = all(
      `SELECT a.*, s.nome as servico_nome, s.duracao_minutos
       FROM agendamentos a
       JOIN servicos s ON a.servico_id = s.id
       WHERE a.estabelecimento_id = ? AND a.data = ? AND a.status = 'agendado'
       ORDER BY a.hora`,
      [req.params.estabelecimento_id, req.params.data]
    );
    res.json(agendamentos);
  } catch (err) {
    console.error("Erro ao listar agendamentos:", err);
    res.status(500).json({ erro: "Erro ao listar agendamentos" });
  }
});

/**
 * POST /api/agendamentos
 * 
 * CRIAR um novo agendamento (paciente agendou).
 * 
 * O front envia:
 * {
 *   "estabelecimento_id": "abc-123",
 *   "servico_id": "def-456",
 *   "nome_paciente": "Maria Silva",
 *   "telefone_paciente": "35999999999",
 *   "data": "2026-06-15",
 *   "hora": "14:00"
 * }
 * 
 * ANTES de inserir, verifica se o horário já está ocupado.
 */
app.post("/api/agendamentos", (req: Request, res: Response) => {
  try {
    const {
      estabelecimento_id,
      servico_id,
      nome_paciente,
      telefone_paciente,
      data,
      hora,
    } = req.body as CriarAgendamentoRequest;

    // Validação
    if (!estabelecimento_id || !servico_id || !nome_paciente || !telefone_paciente || !data || !hora) {
      return res.status(400).json({ erro: "Todos os campos são obrigatórios" });
    }

    // VERIFICA SE O HORÁRIO JÁ ESTÁ OCUPADO
    // Conta quantos agendamentos existem nessa data+hora com status "agendado"
    const ocupado = get(
      `SELECT COUNT(*) as total FROM agendamentos
       WHERE estabelecimento_id = ? AND data = ? AND hora = ? AND status = 'agendado'`,
      [estabelecimento_id, data, hora]
    );

    // Se tem 1 ou mais, o horário já foi pego
    if (ocupado && (ocupado.total as number) > 0) {
      return res.status(409).json({
        erro: "Horário já agendado. Escolha outro horário.",
      });
    }

    // Tudo certo: insere o agendamento
    const id = uuidv4();
    run(
      `INSERT INTO agendamentos (id, estabelecimento_id, servico_id, nome_paciente, telefone_paciente, data, hora)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, estabelecimento_id, servico_id, nome_paciente, telefone_paciente, data, hora]
    );

    res.status(201).json({
      id,
      mensagem: "Agendamento confirmado!",
      dados: { nome_paciente, data, hora },
    });
  } catch (err) {
    console.error("Erro ao criar agendamento:", err);
    res.status(500).json({ erro: "Erro ao criar agendamento" });
  }
});

/**
 * PATCH /api/agendamentos/:id/cancelar
 * 
 * CANCELAR um agendamento.
 * Não deleta - só muda o status pra "cancelado".
 */
app.patch("/api/agendamentos/:id/cancelar", (req: Request, res: Response) => {
  try {
    run("UPDATE agendamentos SET status = 'cancelado' WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Agendamento cancelado!" });
  } catch (err) {
    console.error("Erro ao cancelar:", err);
    res.status(500).json({ erro: "Erro ao cancelar" });
  }
});

/**
 * GET /api/dashboard/:estabelecimento_id
 * 
 * DASHBOARD - Lista agendamentos com filtro de data.
 * 
 * Ex: GET /api/dashboard/abc-123?inicio=2026-06-01&fim=2026-06-30
 * 
 * Se não passar inicio/fim, retorna todos.
 */
app.get("/api/dashboard/:estabelecimento_id", (req: Request, res: Response) => {
  try {
    const { inicio, fim } = req.query;

    // Monta a query dinamicamente baseado nos filtros
    let sql = `
      SELECT a.*, s.nome as servico_nome, s.duracao_minutos
      FROM agendamentos a
      JOIN servicos s ON a.servico_id = s.id
      WHERE a.estabelecimento_id = ?
    `;
    const params: (string | number | null)[] = [req.params.estabelecimento_id as string];

    // req.query pode retornar string, string[] ou ParsedQs
    // Forçamos pra string por simplicidade
    const inicioStr = Array.isArray(inicio) ? (inicio[0] as string) : (inicio as string);
    const fimStr = Array.isArray(fim) ? (fim[0] as string) : (fim as string);

    // Se passou data de início, adiciona filtro
    if (inicioStr) {
      sql += " AND a.data >= ?";
      params.push(inicioStr);
    }

    // Se passou data de fim, adiciona filtro
    if (fimStr) {
      sql += " AND a.data <= ?";
      params.push(fimStr);
    }

    // Ordena por data decrescente (mais recente primeiro) e hora crescente
    sql += " ORDER BY a.data DESC, a.hora ASC";

    const agendamentos = all(sql, params);
    res.json(agendamentos);
  } catch (err) {
    console.error("Erro no dashboard:", err);
    res.status(500).json({ erro: "Erro ao carregar dashboard" });
  }
});

// ============================================================
// INICIAR O SERVIDOR
// ============================================================

/**
 * Primeiro inicializa o banco de dados (assíncrono),
 * depois começa a escutar requisições HTTP.
 * 
 * O servidor fica "ouvindo" na porta 3000.
 * Qualquer requisição que chegar em http://localhost:3000/api/...
 * vai ser processada pelas rotas que definimos acima.
 */
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║         🚀 AgendaFácil Server                ║
║         TypeScript Edition                   ║
╠══════════════════════════════════════════════╣
║  📍 http://localhost:${PORT}                    ║
╠══════════════════════════════════════════════╣
║  ROTAS DISPONÍVEIS:                          ║
║                                              ║
║  ESTABELECIMENTOS:                           ║
║  POST /api/estabelecimentos  → Cadastrar     ║
║  GET  /api/estabelecimentos/slug/:slug       ║
║  POST /api/login             → Login         ║
║                                              ║
║  SERVIÇOS:                                   ║
║  GET  /api/servicos/:est_id  → Listar        ║
║  POST /api/servicos          → Criar         ║
║  DELETE /api/servicos/:id    → Remover       ║
║                                              ║
║  AGENDAMENTOS:                               ║
║  GET  /api/agendamentos/:est_id/:data        ║
║  POST /api/agendamentos      → Criar         ║
║  PATCH /api/agendamentos/:id/cancelar        ║
║                                              ║
║  DASHBOARD:                                  ║
║  GET  /api/dashboard/:est_id                 ║
║       ?inicio=YYYY-MM-DD&fim=YYYY-MM-DD      ║
╚══════════════════════════════════════════════╝
    `);
  });
});
