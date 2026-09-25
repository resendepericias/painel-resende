/* Configuração fixa do painel — Resende Perícias Médicas.
   Nada aqui é segredo: são só os identificadores públicos dos quadros e as regras de nome das listas.
   A chave do Trello e a senha da agenda ficam SÓ no aparelho (localStorage), nunca neste arquivo. */

export const APP = {
  nome: "Resende Perícias Médicas",
  curto: "Painel Resende",
  versao: "2026.09.25",
  tz: "America/Sao_Paulo",
  agendaUrl: "data/agenda.enc.json",
  intervaloMin: 5,          // minutos entre recargas automáticas do Trello
  guardaMinimo: 0.7,        // só aceita carga nova com >= 70% dos cards da anterior (por quadro)
};

/* Os quatro quadros — um array por quadro, sem traduzir lista de um para outro. */
export const QUADROS = {
  processos: { id: "6aa815300574bb66406cdcd2", short: "tzTa2QXU", nome: "PROCESSOS — ACEITES E AGENDAMENTOS", icone: "calendario" },
  laudos:    { id: "6a6e01272afce7d24a252c44", short: "p7epkNyD", nome: "PAINEL LAUDOS 2026",                 icone: "documento" },
  pje:       { id: "6a7b855c7da876fe6ce52f3c", short: "BkuzSif0", nome: "PJE / EPROC 2026 — PRAZOS E INTIMAÇÕES", icone: "prancheta" },
  financas:  { id: "6aa8098380029bfeef8fdbc3", short: "VQKE8929", nome: "FINANÇAS 2026 — HONORÁRIOS PERICIAIS", icone: "trofeu" },
};
export const ORDEM_QUADROS = ["processos", "laudos", "pje", "financas"];

/* PAINEL LAUDOS 2026 — listas de tema (cada card = um laudo pendente) */
export const TEMAS = ["INSS", "CURATELA", "MEDICAMENTOS E INSUMOS", "CIRURGIAS E PROCEDIMENTOS", "ERRO MEDICO", "DANO CORPORAL",
  "BPC-LOAS / DEFICIENCIA", "SEGURO E INVALIDEZ", "TRATAMENTOS E HOME CARE", "OFTALMO INTRAVITREO", "PLANO DE SAUDE",
  "TRABALHISTA / APTIDAO", "A CLASSIFICAR"];

/* Listas identificadas por trecho do nome, para não quebrar se ela renomear na tela do Trello. */
export const L = {
  // PAINEL LAUDOS
  feita:   /PERICIA FEITA/i,
  hoje7:   /HOJE/i,
  entregar:/ENTREGAR/i,
  imp:     /COMPLEMENTAR \/ IMPUGNACAO/i,
  faltou:  /FALTOU NA PERICIA/i,
  naoComp: /NAO COMPARECEU/i,
  controle:/PAINEL DE CONTROLE/i,
  caixa:   /CAIXA DO DIA/i,
  caixaOk: /CAIXA.*APLICAD/i,
  // PJE / EPROC
  pjeLaudo:/PRAZO DE LAUDO/i,
  pjeAg:   /AGENDAR PERICIA/i,
  pjeEsc:  /ESCLARECIMENTO/i,
  pjeAceite:/ACEITE/i,
  pjeHon:  /HONORARIOS/i,
  pjeCiencia:/CIENCIA/i,
  pjeResp: /RESPONDIDO/i,
  // PROCESSOS
  aceitas: /ACEITAS/i,
  agendadas:/AGENDADAS/i,
  juizo:   /AGUARDA JUIZO/i,
  ligar:   /LIGAR/i,
  legenda: /LEGENDA/i,
  // FINANÇAS
  semCob:  /ENTREGUE/i,
  cobrado: /COBRADO/i,
  ordem:   /ORDEM DE PAGAMENTO EXPEDIDA/i,
  naoEf:   /NAO EFETIVADA/i,
  pagoMes: /PAGO NO MES/i,
  ajg:     /GRATUITA|AJG/i,
  hist:    /HISTORICO/i,
};

/* Categorias da Caixa do dia */
export const CX_CATS = [
  ["laudo",   "Laudo entregue",      "documento"],
  ["peticao", "Peticionei",          "prancheta"],
  ["pericia", "Perícia feita",       "pulso"],
  ["agenda",  "Agendei / remarquei", "calendario"],
  ["prazo",   "Prazo novo",          "relogio"],
  ["dinheiro","Pagamento",           "trofeu"],
  ["outro",   "Outro",               "comentario"],
];

/* Links de consulta pública (sem número embutido — o site copia o número para a área de transferência) */
export const CONSULTA = {
  pjeHome:   "https://pje.tjmg.jus.br/pje/login.seam",          // entrada do PJe 1º grau (TJMG)
  eprocHome: "https://eproc1g.tjmg.jus.br/eproc/",               // entrada do eproc 1º grau (TJMG)
  pje:   "https://pje-consulta-publica.tjmg.jus.br/",
  eproc: "https://eproc1g.tjmg.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica",
};
