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
/* ---- AGENDAR: número real (25/11/2026) ----
   Ela reclamou que "Agendar" mostrava 117: contava TODA a lista de aceitas, inclusive perícia já marcada e
   aceite que ainda espera o juízo mandar designar. A conta agora é só o que ELA tem de fazer:
   intimação para designar (quadro PJE 📆 AGENDAR PERICIA) + aceita com prazo/intimação no título.
   Aceita que já tem data (título [COMARCA-DD-MM-AA] ou processo na Google Agenda) vai para a aba Agenda;
   aceita sem intimação e "aguarda juízo" aparecem fechadas, fora da conta. */
const semAc = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
/** chaves de processo que aparecem em eventos FUTUROS da Google Agenda */
export function chavesAgenda(d) {
  const hoje = HOJE(), out = new Map();
  for (const e of (d.agenda || [])) {
    const dia = (e.d || "").slice(0, 10); if (dia < hoje) continue;
    const t = (e.t || "") + " " + (e.loc || "");
    for (const m of t.matchAll(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}|\b\d{20}\b/g)) { const k = m[0].replace(/\D/g, ""); if (!out.has(k)) out.set(k, e); }
  }
  return out;
}
/** classe de um card das listas ACEITAS: agendar | marcada | juizo | aguarda | cancelada */
export function classeAceita(c, ag) {
  const n = semAc(c.n), t = n + "\n" + semAc(c.desc);
  if (/CANCELAD/.test(n)) return "cancelada";
  if (dataPericia(c) && dataPericia(c) >= HOJE()) return "marcada";
  if (ag && ag.has(procKey(c))) return "marcada";
  if (/AGENDAR|INTIMADA|PRAZO PERDIDO|DECURSO|\[PRAZO [^\]]*(LAUDO|PROVIDENCIA)/.test(n) && !/ACEITE NO AJ/.test(n)) return "agendar";
  if (/AGUARDA (INTIMACAO|DECISAO|O JUIZO|JUIZO|NOMEACAO|DESPACHO|CADASTR)|A DESIGNAR|NAO CADASTRADA|MAJORA|PROPOSTA DE HON|ACEITE NO AJ/.test(t)) return "juizo";
  return "aguarda";
}
export function agendarReal(d) {
  const ag = chavesAgenda(d), marcadas = new Set(agendadas(d).filter(c => dataPericia(c) >= HOJE()).map(procKey).filter(Boolean));
  const grupos = { agendar: [], marcada: [], juizo: [], aguarda: [], cancelada: [] };
  for (const c of aceitas(d)) grupos[marcadas.has(procKey(c)) ? "marcada" : classeAceita(c, ag)].push(c);
  grupos.juizo.push(...d.processos.filter(c => L.juizo.test(c.l)));
  const kAg = new Set([...grupos.marcada.map(procKey)]);
  const pjeAg = d.pje.filter(c => L.pjeAg.test(c.l) && !kAg.has(procKey(c)));
  const vis = new Set(), fazer = [];
  for (const c of [...pjeAg, ...grupos.agendar]) { const k = procKey(c) || c.id; if (vis.has(k)) continue; vis.add(k); fazer.push(c); }
  return { fazer, pjeAg, ...grupos, ag };
}
/** perícias marcadas (futuras): listas 🗓️ com data no título + aceitas já marcadas na agenda */
export function agendaMarcada(d) {
  const hoje = HOJE(), R = agendarReal(d);
  const lista = agendadas(d).filter(c => dataPericia(c) >= hoje).map(c => ({ c, dia: dataPericia(c) }));
  const k = new Set(lista.map(x => procKey(x.c)));
  for (const c of R.marcada) { if (k.has(procKey(c))) continue; const e = R.ag.get(procKey(c)); lista.push({ c, dia: dataPericia(c) || (e ? e.d.slice(0, 10) : ""), soAgenda: !dataPericia(c) }); }
  return lista.filter(x => x.dia).sort((a, b) => a.dia < b.dia ? -1 : 1);
}

export function filas(d) {
  const hoje = HOJE();
  const entregues = new Set(d.financas.map(procKey).filter(Boolean));
  const uniq = arr => { const vis = new Set(), out = []; for (const c of arr) { const k = procKey(c) || c.n; if (vis.has(k)) continue; vis.add(k); out.push(c); } return out; };
  const pend = pendentes(d);
  /* PRAZO DO PJE NUNCA SE PERDE (29/09/2026 — ela achou laudos atrasados no quadro PJE que o painel não mostrava).
     1) Card do PAINEL sem data ou com data mais tarde que a do PJe: vale o prazo MAIS CEDO dos dois.
     2) Prazo de laudo do PJe cujo processo não está na fila do PAINEL entra na fila — vencido OU a vencer —
        marcado "só no PJe — conferir". Se o card está no FINANÇAS como entregue, entra do mesmo jeito,
        marcado "consta entregue — conferir": ou o laudo não foi protocolado, ou o card do PJe não foi baixado.
        Esconder era o erro: 5019479-14 (Ipatinga), 5004784-15 (Abre Campo) e 5016007-15 (sob pena de desabilitação) sumiam assim.
     3) O mesmo vale para complementar/impugnação: o prazo do card 💬 do PJe completa o card ⚠️ do PAINEL.
     4) (25/11/2026) Card de PRAZO DE LAUDO do PJe que é de laudo COMPLEMENTAR / quesitos vai para a fila de impugnação, não de laudo.
     5) (25/11/2026) Perícia REALIZADA sem laudo conta como laudo a fazer mesmo sem intimação: card ainda numa lista
        🗓️ AGENDADAS com data da perícia já passada (o card não foi movido para 🖊️ PERÍCIA FEITA). Marcado "perícia realizada — mover card". */
  const ehCompl = c => /COMPLEMENTAR|QUESITOS? (SUPLEMENTARES|COMPLEMENTARES)|ESCLARECIMENTO/i.test(semAc(c.n));
  const pjeLaudo = d.pje.filter(c => L.pjeLaudo.test(c.l) && !ehCompl(c));
  const pjeCompl = d.pje.filter(c => L.pjeLaudo.test(c.l) && ehCompl(c));
  const menorPrazo = arr => { const m = new Map(); for (const c of arr) { if (!c.due) continue; const k = procKey(c); if (!k) continue; if (!m.has(k) || c.due < m.get(k)) m.set(k, c.due); } return m; };
  const completa = (c, m, tipo) => { const o = Object.assign({}, c, { tipo }); const k = procKey(c); const p = k && m.get(k); if (p && (!o.due || p < o.due)) { o.duePainel = o.due; o.due = p; o.dueDoPje = true; } if (p) o.temIntimacao = true; return o; };
  const prazoPje = menorPrazo(pjeLaudo);
  const laudoPainel = pend.map(c => completa(c, prazoPje, "laudo"));
  const semLaudoK = new Set([...d.laudos.filter(c => L.naoComp.test(c.l) || L.faltou.test(c.l) || ehImp(c)), ...d.financas].map(procKey).filter(Boolean));
  const realizadas = agendadas(d).filter(c => { const p = dataPericia(c); return p && p < hoje && !semLaudoK.has(procKey(c)); })
    .map(c => { const o = completa(c, prazoPje, "laudo"); o.realizadaEm = dataPericia(c); if (!o.dueDoPje) o.due = ""; return o; });
  const kPainel = new Set([...laudoPainel, ...realizadas].map(procKey).filter(Boolean));
  const soPje = pjeLaudo.filter(c => c.due && procKey(c) && !kPainel.has(procKey(c)))
    .map(c => Object.assign({}, c, { tipo: "laudo", soPje: true, temIntimacao: true, constaEntregue: entregues.has(procKey(c)) }));
  const laudo = uniq([...laudoPainel, ...realizadas, ...soPje]);
  const prazoEsc = menorPrazo([...d.pje.filter(c => L.pjeEsc.test(c.l)), ...pjeCompl]);
  const imp = uniq([...d.laudos.filter(ehImp).map(c => completa(c, prazoEsc, "imp")), ...d.pje.filter(c => L.pjeEsc.test(c.l)).map(c => Object.assign({}, c, { tipo: "imp" })), ...pjeCompl.map(c => Object.assign({}, c, { tipo: "imp" }))]);
  const agenda = agendarReal(d).fazer.map(c => Object.assign({}, c, { tipo: "agenda" }));
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
