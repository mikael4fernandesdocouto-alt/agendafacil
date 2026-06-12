// ============================================================
// TIPOS DO PROJETO AGENDAFÁCIL
// ============================================================
// Cada "interface" aqui é um molde/formato que os dados devem ter.
// Se o dado não bater com o molde, o TypeScript dá erro ANTES de rodar.
// ============================================================

/** 
 * Representa um estabelecimento (clínica, consultório, salão, etc.)
 * Cada um tem um ID único, nome, slug (pra URL), e dados de acesso
 */
export interface Estabelecimento {
  id: string;              // UUID gerado automaticamente
  nome: string;            // Ex: "Clínica Beleza"
  slug: string;            // Ex: "clinica-beleza" (usado na URL)
  email: string;           // Email de login
  senha: string;           // Senha de login (em produção seria hash)
  telefone?: string;       // WhatsApp do estabelecimento (opcional)
  endereco?: string;       // Endereço físico (opcional)
  google_maps_url?: string; // Link do Google Maps (pra pedir avaliação)
  criado_em?: string;       // Data/hora que foi criado (automático)
}

/**
 * Um serviço oferecido pelo estabelecimento
 * Ex: "Limpeza de Pele", "Drenagem", "Corte de Cabelo"
 */
export interface Servico {
  id: string;                    // UUID gerado automaticamente
  estabelecimento_id: string;     // Qual estabelecimento oferece esse serviço
  nome: string;                   // Nome do serviço
  duracao_minutos: number;        // Quanto tempo dura (ex: 60 min)
  preco: number;                  // Preço (ex: 150.00)
  ativo: boolean;                 // Se está disponível (true) ou desativado (false)
}

/**
 * Representa o horário de funcionamento em um dia da semana
 * dia_semana: 0 = Domingo, 1 = Segunda ... 6 = Sábado
 */
export interface HorarioFuncionamento {
  id?: number;
  estabelecimento_id: string;
  dia_semana: number;   // 0-6 (dom-sáb)
  hora_inicio: string;  // Ex: "08:00"
  hora_fim: string;     // Ex: "18:00"
}

/**
 * Um agendamento feito por um paciente/cliente
 * Status pode ser: "agendado", "cancelado", "concluido"
 */
export interface Agendamento {
  id: string;                    // UUID gerado automaticamente
  estabelecimento_id: string;     // Qual estabelecimento
  servico_id: string;             // Qual serviço foi agendado
  nome_paciente: string;          // Nome do paciente
  telefone_paciente: string;      // WhatsApp do paciente (com DDD, só números)
  data: string;                   // Data no formato "YYYY-MM-DD"
  hora: string;                   // Hora no formato "HH:MM"
  status: string;                 // "agendado" | "cancelado" | "concluido"
  lembrete_enviado: boolean;      // Se já mandou lembrete (true/false)
  avaliacao_pedida: boolean;      // Se já pediu avaliação (true/false)
  criado_em?: string;             // Data/hora que foi criado
}

// ============================================================
// TIPOS PARA REQUISIÇÕES (o que a API recebe)
// ============================================================

/** Dados necessários pra cadastrar um estabelecimento */
export type CriarEstabelecimentoRequest = {
  nome: string;
  slug: string;
  email: string;
  senha: string;
  telefone?: string;
  endereco?: string;
  google_maps_url?: string;
};

/** Dados necessários pra fazer login */
export type LoginRequest = {
  email: string;
  senha: string;
};

/** Resposta do login (retorna os dados do estabelecimento) */
export type LoginResponse = {
  id: string;
  nome: string;
  slug: string;
};

/** Dados necessários pra criar um serviço */
export type CriarServicoRequest = {
  estabelecimento_id: string;
  nome: string;
  duracao_minutos: number;
  preco?: number;
};

/** Dados necessários pra criar um agendamento */
export type CriarAgendamentoRequest = {
  estabelecimento_id: string;
  servico_id: string;
  nome_paciente: string;
  telefone_paciente: string;
  data: string;       // "YYYY-MM-DD"
  hora: string;       // "HH:MM"
};

/** Resposta padrão da API quando dá certo */
export type ApiResponseSuccess<T> = {
  mensagem: string;
  dados?: T;
};

/** Resposta padrão da API quando dá erro */
export type ApiResponseError = {
  erro: string;
};
