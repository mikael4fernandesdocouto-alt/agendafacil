const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (front-end)
app.use(express.static(path.join(__dirname, '../front')));

// ============================================================
// ROTAS DE ESTABELECIMENTO
// ============================================================

// Cadastrar estabelecimento
app.post('/api/estabelecimentos', (req, res) => {
  try {
    const { nome, slug, email, senha, telefone, endereco, google_maps_url } = req.body;

    if (!nome || !slug || !email || !senha) {
      return res.status(400).json({ erro: 'Campos obrigatórios: nome, slug, email, senha' });
    }

    const id = uuidv4();
    db.run(
      `INSERT INTO estabelecimentos (id, nome, slug, email, senha, telefone, endereco, google_maps_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, nome, slug, email, senha, telefone || null, endereco || null, google_maps_url || null]
    );

    res.status(201).json({ id, mensagem: 'Estabelecimento cadastrado com sucesso!' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ erro: 'Este slug já está em uso. Escolha outro.' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro ao cadastrar estabelecimento' });
  }
});

// Buscar estabelecimento pelo slug (página pública de agendamento)
app.get('/api/estabelecimentos/slug/:slug', (req, res) => {
  try {
    const est = db.get(
      'SELECT id, nome, slug, telefone, endereco, google_maps_url FROM estabelecimentos WHERE slug = ?',
      [req.params.slug]
    );
    if (!est) {
      return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
    }

    const servicos = db.all('SELECT * FROM servicos WHERE estabelecimento_id = ? AND ativo = 1', [est.id]);
    const horarios = db.all('SELECT * FROM horarios_funcionamento WHERE estabelecimento_id = ?', [est.id]);

    res.json({ ...est, servicos, horarios });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar estabelecimento' });
  }
});

// Login do estabelecimento
app.post('/api/login', (req, res) => {
  try {
    const { email, senha } = req.body;
    const est = db.get(
      'SELECT id, nome, slug FROM estabelecimentos WHERE email = ? AND senha = ?',
      [email, senha]
    );
    if (!est) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }
    res.json(est);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro no login' });
  }
});

// ============================================================
// ROTAS DE SERVIÇOS
// ============================================================

// Listar serviços de um estabelecimento
app.get('/api/servicos/:estabelecimento_id', (req, res) => {
  try {
    const servicos = db.all(
      'SELECT * FROM servicos WHERE estabelecimento_id = ? AND ativo = 1',
      [req.params.estabelecimento_id]
    );
    res.json(servicos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar serviços' });
  }
});

// Criar serviço
app.post('/api/servicos', (req, res) => {
  try {
    const { estabelecimento_id, nome, duracao_minutos, preco } = req.body;

    if (!estabelecimento_id || !nome || !duracao_minutos) {
      return res.status(400).json({ erro: 'Campos obrigatórios: estabelecimento_id, nome, duracao_minutos' });
    }

    const id = uuidv4();
    db.run(
      'INSERT INTO servicos (id, estabelecimento_id, nome, duracao_minutos, preco) VALUES (?, ?, ?, ?, ?)',
      [id, estabelecimento_id, nome, duracao_minutos, preco || 0]
    );

    res.status(201).json({ id, mensagem: 'Serviço cadastrado!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar serviço' });
  }
});

// Remover serviço (desativar)
app.delete('/api/servicos/:id', (req, res) => {
  try {
    db.run('UPDATE servicos SET ativo = 0 WHERE id = ?', [req.params.id]);
    res.json({ mensagem: 'Serviço removido!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao remover serviço' });
  }
});

// ============================================================
// ROTAS DE AGENDAMENTO
// ============================================================

// Listar agendamentos de uma data
app.get('/api/agendamentos/:estabelecimento_id/:data', (req, res) => {
  try {
    const agendamentos = db.all(
      `SELECT a.*, s.nome as servico_nome, s.duracao_minutos
       FROM agendamentos a
       JOIN servicos s ON a.servico_id = s.id
       WHERE a.estabelecimento_id = ? AND a.data = ? AND a.status = 'agendado'
       ORDER BY a.hora`,
      [req.params.estabelecimento_id, req.params.data]
    );
    res.json(agendamentos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar agendamentos' });
  }
});

// Criar agendamento
app.post('/api/agendamentos', (req, res) => {
  try {
    const { estabelecimento_id, servico_id, nome_paciente, telefone_paciente, data, hora } = req.body;

    if (!estabelecimento_id || !servico_id || !nome_paciente || !telefone_paciente || !data || !hora) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    // Verificar se o horário já está ocupado
    const ocupado = db.get(
      `SELECT COUNT(*) as total FROM agendamentos
       WHERE estabelecimento_id = ? AND data = ? AND hora = ? AND status = 'agendado'`,
      [estabelecimento_id, data, hora]
    );

    if (ocupado && ocupado.total > 0) {
      return res.status(409).json({ erro: 'Horário já agendado. Escolha outro horário.' });
    }

    const id = uuidv4();
    db.run(
      `INSERT INTO agendamentos (id, estabelecimento_id, servico_id, nome_paciente, telefone_paciente, data, hora)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, estabelecimento_id, servico_id, nome_paciente, telefone_paciente, data, hora]
    );

    res.status(201).json({
      id,
      mensagem: 'Agendamento confirmado!',
      dados: { nome_paciente, data, hora }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar agendamento' });
  }
});

// Cancelar agendamento
app.patch('/api/agendamentos/:id/cancelar', (req, res) => {
  try {
    db.run("UPDATE agendamentos SET status = 'cancelado' WHERE id = ?", [req.params.id]);
    res.json({ mensagem: 'Agendamento cancelado!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao cancelar' });
  }
});

// Dashboard: agendamentos de um estabelecimento (filtro por data)
app.get('/api/dashboard/:estabelecimento_id', (req, res) => {
  try {
    const { inicio, fim } = req.query;
    let sql = `
      SELECT a.*, s.nome as servico_nome, s.duracao_minutos
      FROM agendamentos a
      JOIN servicos s ON a.servico_id = s.id
      WHERE a.estabelecimento_id = ?
    `;
    const params = [req.params.estabelecimento_id];

    if (inicio) {
      sql += ' AND a.data >= ?';
      params.push(inicio);
    }
    if (fim) {
      sql += ' AND a.data <= ?';
      params.push(fim);
    }

    sql += ' ORDER BY a.data DESC, a.hora ASC';

    const agendamentos = db.all(sql, params);
    res.json(agendamentos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao carregar dashboard' });
  }
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`
🚀 AgendaFacil Server rodando!
📍 http://localhost:${PORT}

Rotas disponíveis:
  POST /api/estabelecimentos     → Cadastrar clínica/consultório
  GET  /api/estabelecimentos/slug/:slug  → Buscar por slug (página pública)
  POST /api/login                → Login
  GET  /api/servicos/:est_id     → Listar serviços
  POST /api/servicos             → Criar serviço
  DELETE /api/servicos/:id       → Remover serviço
  GET  /api/agendamentos/:est_id/:data  → Agendamentos do dia
  POST /api/agendamentos         → Criar agendamento
  PATCH /api/agendamentos/:id/cancelar  → Cancelar
  GET  /api/dashboard/:est_id    → Dashboard (com filtro data)
    `);
  });
});
