/* Regras aprendidas nas rodadas — nada disto pode se perder.
   Tudo aqui trabalha sobre DADOS = {laudos, pje, financas, processos, agenda, at}. */
import { TEMAS, L } from "./config.js";
import { HOJE, diasAte, somaDias, ymd } from "./util.js";
import { procKey, dataPericia, entregueEm, historicoCobrancas, ddmmParaISO } from "./parse.js";

/* ---- classificação de listas do PAINEL LAUDOS ---- */
export const ehTema = c => TEMAS.includes(c.l);
export const ehFeita = c => L.feita.test(c.l);
export const ehHoje7 = c => L.hoje7.test(c.l);
export const ehEntregar = c => L.entregar.test(c.l);
export const ehImp = c => L.imp.test(c.l);
/* Laudo a fazer = listas de tema + 🎯 HOJE + filas ENTREGAR + 🖊️ PERICIA FEITA.
   ⚠️ COMPLEMENTAR / IMPUGNACAO NÃO entra: é fila própria. */
export const ehPendente = c => ehTema(c) || ehHoje7(c) || ehEntregar(c) || ehFeita(c);
export const ehTriado = c => ehTema(c) || ehHoje7(c) || ehEntregar(c);
/* cards de controle (não são processo) */
export const ehControle = c => L.controle.test(c.l) || L.legenda.test(c.l) || L.caixa.test(c.l) || L.caixaOk.test(c.l) || /^\W*(📊|📖|🎯 A |👉|📤 COMO|🏷️|🧭|📌 LEGENDA|🖥️)/.test(c.n) || /COMO USAR|COMO LER ESTE QUADRO/i.test(c.n);

export const urg = c => (c.lb || []).includes("URGENTISSIMO");

/** severidade pelo prazo */
export function sevDe(c) {
  const hoje = HOJE();
  if (c.due && c.due < hoje) return "crit";
  if (c.due && diasAte(c.due) <= 7) return "warn";
  if (c.due) return "ok";
  return "neut";
}

/* ---- saneamento de prazo (escopo de laudo) ----
   due igual ou anterior à data da perícia do título NÃO é prazo: "sem prazo — conferir", nunca atrasado.
   Card entregue que ainda tem due: ignorar o due. */
export function sanearPrazos(d) {
  let n = 0;
  for (const c of d.laudos) {
    if (!ehPendente(c) || !c.due) continue;
    const per = dataPericia(c);
    if (per && c.due <= per) { c.dueRuim = c.due; c.periciaEm = per; c.due = ""; n++; }
  }
  for (const c of d.financas) { if (c.due) { c.dueIgnorado = c.due; c.due = ""; } }
  d.prazosAnulados = n;
  return d;
}

/* ACEITAS: due = prazo para DESIGNAR; só conta como vencido com o marcador INTIMADA P/ AGENDAR. Sem marcador, o due é resíduo. */
export const prazoAgendar = c => /INTIMADA P\/ AGENDAR/i.test(c.n || "") && c.due && c.due < HOJE();

export const pendentes = d => d.laudos.filter(ehPendente);
export const aceitas = d => d.processos.filter(c => L.aceitas.test(c.l));
export const agendadas = d => d.processos.filter(c => L.agendadas.test(c.l));
export const pjePendentes = d => d.pje.filter(c => !L.pjeResp.test(c.l));
export const fin = (d, re) => d.financas.filter(c => re.test(c.l));
export const aCobrar = d => d.financas.filter(c => L.semCob.test(c.l) || L.cobrado.test(c.l) || L.ordem.test(c.l) || L.naoEf.test(c.l));

/* perícias de um dia = cards das listas 🗓️ AGENDADAS com aquela data no título */
export const periciasDe = (d, dia) => agendadas(d).filter(c => dataPericia(c) === dia);

/* ---- as quatro filas de pendência, separadas por tipo, sem duplicar processo dentro da fila ---- */
export const TIPOS = {
  laudo:  { nome: "Laudo a fazer",           cls: "crit", aba: "laudos",  icone: "documento" },
  imp:    { nome: "Complementar / impugnação", cls: "acc", aba: "imp",   icone: "comentario" },
  intim:  { nome: "Resposta a intimação",    cls: "info", aba: "pje",     icone: "prancheta" },
  agenda: { nome: "Agendamento",             cls: "warn", aba: "agendar", icone: "calendario" },
};
export function filas(d) {
  const hoje = HOJE();
  const entregues = new Set(d.financas.map(procKey).filter(Boolean));
  const uniq = arr => { const vis = new Set(), out = []; for (const c of arr) { const k = procKey(c) || c.n; if (vis.has(k)) continue; vis.add(k); out.push(c); } return out; };
  const pend = pendentes(d);
  const laudoPainel = pend.map(c => Object.assign({}, c, { tipo: "laudo" }));
  const kPainel = new Set(laudoPainel.map(procKey).filter(Boolean));
  /* prazo de laudo vencido que só existe no quadro PJE — entra na fila marcado "só no PJe — conferir" */
  const soPje = d.pje.filter(c => L.pjeLaudo.test(c.l) && c.due && c.due < hoje && procKey(c) && !kPainel.has(procKey(c)) && !entregues.has(procKey(c)))
    .map(c => Object.assign({}, c, { tipo: "laudo", soPje: true }));
  const laudo = uniq([...laudoPainel, ...soPje]);
  const imp = uniq([...d.laudos.filter(ehImp), ...d.pje.filter(c => L.pjeEsc.test(c.l))]).map(c => Object.assign({}, c, { tipo: "imp" }));
  const agenda = uniq([...d.pje.filter(c => L.pjeAg.test(c.l)),
    ...d.processos.filter(c => L.aceitas.test(c.l) && prazoAgendar(c)),
    ...d.processos.filter(c => L.ligar.test(c.l) && procKey(c))]).map(c => Object.assign({}, c, { tipo: "agenda" }));
  /* intimações = tudo do PJE que NÃO é prazo de laudo, agendar, esclarecimento nem respondido */
  const intim = uniq(d.pje.filter(c => !L.pjeLaudo.test(c.l) && !L.pjeAg.test(c.l) && !L.pjeEsc.test(c.l) && !L.pjeResp.test(c.l))).map(c => Object.assign({}, c, { tipo: "intim" }));
  return { laudo, agenda, intim, imp };
}
export const vencidos = arr => arr.filter(c => c.due && c.due < HOJE());
export const doDia = (arr, dia) => arr.filter(c => c.due === dia);

/* ---- cobrança ---- */
/** dias parado: contados da última cobrança, ou da entrega se nunca cobrou */
export function diasParado(c) {
  const h = historicoCobrancas(c.desc);
  let ref = "";
  if (h.length) ref = h.map(x => ddmmParaISO(x.data)).filter(Boolean).sort().pop() || "";
  if (!ref) ref = entregueEm(c);
  if (!ref) return null;
  return -diasAte(ref);
}
export function situacaoFin(c) {
  if (L.naoEf.test(c.l)) return { k: "naoEf", nome: "Ordem não efetivada", cls: "crit" };
  if (L.ordem.test(c.l)) return { k: "ordem", nome: "Ordem expedida", cls: "ok" };
  if (L.cobrado.test(c.l)) return { k: "cobrado", nome: "Cobrado — aguarda ordem", cls: "warn" };
  if (L.semCob.test(c.l)) return { k: "semCob", nome: "Entregue sem cobrança", cls: "neut" };
  if (L.pagoMes.test(c.l)) return { k: "pago", nome: "Pago no mês", cls: "ok" };
  if (L.ajg.test(c.l)) return { k: "ajg", nome: "Justiça gratuita", cls: "neut" };
  if (L.hist.test(c.l)) return { k: "hist", nome: "Pago — histórico", cls: "neut" };
  return { k: "outro", nome: c.l, cls: "neut" };
}

/* ---- agenda (Google Agenda, lida ao vivo pelo intermediário) ---- */
export function ehPlantao(t) { const u = (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(); return u.includes("HMDCC") || /\bHU\b/.test(u) || u.includes("FAST") || u.includes("PLANTAO"); }
export function ehPericiaEv(t) { const u = (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(); return u.includes("PERICIA") || /\d{7}/.test(t) || u.includes("JESP"); }
/* lembrete = evento do Google Agenda com "Lembrete:" no título (dia inteiro). Feito = ela apaga na agenda. */
export function ehLembrete(t) { return /^\s*(🔔\s*)?lembrete\s*:/i.test(t || ""); }
export function tituloLembrete(t) { return (t || "").replace(/^\s*(🔔\s*)?lembrete\s*:\s*/i, ""); }
export function eventosDe(d, dia) { return (d.agenda || []).filter(e => (e.d || "").slice(0, 10) === dia && !ehLembrete(e.t)); }
export function lembretes(d, dias = 7) {
  const hoje = HOJE(), fim = somaDias(hoje, dias);
  return (d.agenda || []).filter(e => ehLembrete(e.t) && (e.d || "").slice(0, 10) >= hoje && (e.d || "").slice(0, 10) <= fim)
    .sort((a, b) => (a.d < b.d ? -1 : 1));
}
export function lembretesAtrasados(d) {
  const hoje = HOJE();
  return (d.agenda || []).filter(e => ehLembrete(e.t) && (e.d || "").slice(0, 10) < hoje && (e.d || "").slice(0, 10) >= somaDias(hoje, -30));
}
export function horaEv(e) { if (e.allDay) return ""; const h = (e.d || "").slice(11, 16); return (!h || h === "00:00") ? "" : h; }
