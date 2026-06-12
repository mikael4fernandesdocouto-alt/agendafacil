/**
 * Representa um estabelecimento (clínica, consultório, salão, etc.)
 * Cada um tem um ID único, nome, slug (pra URL), e dados de acesso
 */
export interface Estabelecimento {
    id: string;
    nome: string;
    slug: string;
    email: string;
    senha: string;
    telefone?: string;
    endereco?: string;
    google_maps_url?: string;
    criado_em?: string;
}
/**
 * Um serviço oferecido pelo estabelecimento
 * Ex: "Limpeza de Pele", "Drenagem", "Corte de Cabelo"
 */
export interface Servico {
    id: string;
    estabelecimento_id: string;
    nome: string;
    duracao_minutos: number;
    preco: number;
    ativo: boolean;
}
/**
 * Representa o horário de funcionamento em um dia da semana
 * dia_semana: 0 = Domingo, 1 = Segunda ... 6 = Sábado
 */
export interface HorarioFuncionamento {
    id?: number;
    estabelecimento_id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fim: string;
}
/**
 * Um agendamento feito por um paciente/cliente
 * Status pode ser: "agendado", "cancelado", "concluido"
 */
export interface Agendamento {
    id: string;
    estabelecimento_id: string;
    servico_id: string;
    nome_paciente: string;
    telefone_paciente: string;
    data: string;
    hora: string;
    status: string;
    lembrete_enviado: boolean;
    avaliacao_pedida: boolean;
    criado_em?: string;
}
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
    data: string;
    hora: string;
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
//# sourceMappingURL=types.d.ts.map