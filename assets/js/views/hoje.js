/* ☀️ Capa — HOJE + PRÓXIMOS 7 DIAS, sempre. É o maior destaque do site. */
import { esc, HOJE, extenso, somaDias, brDate, diasAte, DIAS, DIAS_CURTO, ico } from "../util.js";
import { comarcaDe, comarcaBonita, procKey, processoDe, horaDe } from "../parse.js";
import { filas, vencidos, doDia, periciasDe, eventosDe, lembretes, lembretesAtrasados, horaEv, ehPlantao, ehPericiaEv, urg, TIPOS } from "../regras.js";
import { rowHTML, miniHTML, tile, chip, vazio, secao, pulsoSVG } from "../ui.js";
import { T } from "../apresentacao.js";
import { anotar } from "./caixa.js";

const ORDEM = ["laudo", "imp", "intim", "agenda"];
const chipTipo = (t, nome) => `<span class="chip tipo-${t}">${ico(TIPOS[t].icone)} ${esc(nome || TIPOS[t].nome)}</span>`;
const porData = (a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1;

export function render(el, d, ctx = {}) {
  const hoje = HOJE(), F = filas(d);
  const perHoje = periciasDe(d, hoje), evHoje = eventosDe(d, hoje), plantao = evHoje.filter(e => ehPlantao(e.t));
  const lemb = lembretes(d, 7), lembAtr = lembretesAtrasados(d);
  const lembHoje = lemb.filter(e => e.d.slice(0, 10) === hoje);

  let html = `<div class="capa">${pulsoSVG()}
    <div class="capa-top">
      <div><div class="dia">${extenso(hoje)}</div>
      <div class="sub">${perHoje.length ? `<b>${perHoje.length} ${perHoje.length > 1 ? "perícias" : "perícia"} hoje</b>` : "sem perícia marcada para hoje"}
        ${plantao.length ? ` · <b>plantão: ${esc(plantao.map(e => e.t).join(", "))}</b> — dia curto para laudo` : ""}</div></div>
    </div>
    <div class="tiles">
      ${tile("laudos", "crit", vencidos(F.laudo).length, "laudos atrasados", "documento")}
      ${tile("imp", "acc", F.imp.length, "complementar / impugnação", "comentario")}
      ${tile("pje", "warn", vencidos(F.intim).length, "intimações vencidas", "prancheta")}
      ${tile("agendar", "warn", F.agenda.length, "agendamentos pendentes", "calendario")}
      ${tile("hoje", "info", lemb.length + lembAtr.length, "lembretes", "notificacao")}
    </div>
    <form class="capa-caixa" id="cxRapido" autocomplete="off">
      ${ico("comentario")}
      <input id="cxRapidoTxt" placeholder="Caixa do dia: anote o que você já fez (laudo entregue, peticionei, perícia feita…) e aperte Enter" aria-label="Anotar na caixa do dia">
      <button class="btn pri" type="submit">Anotar</button>
      <a href="#caixa" class="hint">abrir a caixa →</a>
    </form>
  </div>`;

  /* ---- LEMBRETES (Google Agenda: "Lembrete:" no título) ---- */
  const itemL = e => miniHTML({ hora: e.d.slice(0, 10) === hoje ? "hoje" : brDate(e.d.slice(0, 10)), texto: e.t.replace(/^\s*(🔔\s*)?lembrete\s*:\s*/i, ""), meta: e.loc ? chip(e.loc) : "", cls: e.d.slice(0, 10) < hoje ? "crit" : "" });
  html += `<section class="card lembretes"><h2>${ico("notificacao")} Lembretes <span class="chip ${lemb.length ? "warn" : ""}">${lemb.length}</span></h2>
    ${lembAtr.length ? `<div class="note crit">${lembAtr.length} lembrete(s) de dias anteriores ainda na agenda:</div>${lembAtr.map(itemL).join("")}` : ""}
    ${lemb.length ? lemb.map(itemL).join("") : vazio("nenhum lembrete para hoje nem para os próximos 7 dias")}
    <div class="legend">Todo “me lembra de X” vira evento no Google Agenda com “Lembrete:” no título. Feito = apagar ou marcar o evento na própria agenda.</div></section>`;

  /* ---- HOJE ---- */
  const hojeItens = ORDEM.flatMap(t => doDia(F[t], hoje).map(c => ({ t, c })));
  const agendaHoje = [
    ...perHoje.sort((a, b) => (horaDe(a) || "99") < (horaDe(b) || "99") ? -1 : 1).map(c => miniHTML({ hora: horaDe(c) || "—", texto: c.n, meta: chip("PERÍCIA", "crit") + chip(comarcaBonita(comarcaDe(c))), url: c.u, key: procKey(c) })),
    ...evHoje.map(e => miniHTML({ hora: horaEv(e) || "dia", texto: e.t, meta: ehPlantao(e.t) ? chip("PLANTÃO", "info") : (ehPericiaEv(e.t) ? chip("PERÍCIA", "crit") : "") + (e.loc ? chip(e.loc) : "") })),
  ];
  html += `<section class="card"><h2>${ico("pulso")} Hoje</h2><div class="grade2">
    <div><h3>Perícias e agenda</h3>${agendaHoje.join("") || vazio("agenda livre — dia bom para escrever laudo")}</div>
    <div><h3>Vence hoje</h3>${hojeItens.length ? hojeItens.map(({ t, c }) => miniHTML({ hora: "", texto: c.n, meta: chipTipo(t) + (c.soPje ? chip("só no PJe", "warn") : ""), url: c.u, key: procKey(c) })).join("") : vazio("nada vence hoje")}</div>
  </div></section>`;

  /* ---- PRÓXIMOS 7 DIAS ---- */
  let sete = "";
  for (let i = 1; i <= 7; i++) {
    const dia = somaDias(hoje, i), x = new Date(dia + "T12:00:00");
    const per = periciasDe(d, dia), evs = eventosDe(d, dia), lb = lemb.filter(e => e.d.slice(0, 10) === dia);
    const its = [];
    per.forEach(c => its.push(`<div class="it clk" data-ficha="${procKey(c)}">${chipTipo("agenda", "Perícia")} ${esc(horaDe(c))} ${esc(T(processoDe(c) || c.n.slice(0, 40)))} · ${esc(comarcaBonita(comarcaDe(c)))}</div>`));
    evs.forEach(e => its.push(`<div class="it">${ehPlantao(e.t) ? chip("plantão", "info") : chip("agenda")} ${esc(horaEv(e))} ${esc(T(e.t))}</div>`));
    lb.forEach(e => its.push(`<div class="it">${chip("lembrete", "warn")} ${esc(T(e.t.replace(/^\s*(🔔\s*)?lembrete\s*:\s*/i, "")))}</div>`));
    ORDEM.forEach(t => doDia(F[t], dia).forEach(c => its.push(`<div class="it clk" data-ficha="${procKey(c)}">${chipTipo(t)} ${esc(T(c.n))}</div>`)));
    sete += `<div class="dia7${x.getDay() === 0 || x.getDay() === 6 ? " fds" : ""}"><div class="dl">${DIAS[x.getDay()]} <small>${brDate(dia).slice(0, 5)}</small></div>${its.join("") || '<div class="nada">nada marcado</div>'}</div>`;
  }
  html += `<section class="card"><h2>${ico("calendario")} Próximos 7 dias</h2><div class="sete">${sete}</div>
    <div class="legend">Perícia = card do quadro PROCESSOS com data no título · agenda e plantões vêm do Google Agenda · prazos vêm dos cards do Trello.</div></section>`;

  /* ---- PENDÊNCIAS POR TIPO — quatro blocos, nunca lista conjunta ---- */
  const bloco = (t, arr, sub) => {
    const Tt = TIPOS[t]; const v = vencidos(arr).sort(porData), fut = arr.filter(c => !(c.due && c.due < hoje)).sort(porData);
    const lista = [...v, ...fut];
    return `<section class="bloco ${Tt.cls}"><h3>${ico(Tt.icone)} ${Tt.nome} <span class="n">${arr.length}</span>${v.length ? ` <span class="n vv">${v.length} ${t === "laudo" ? "atrasados" : "vencidas"}</span>` : ""}</h3>
      <div class="legend">${sub}</div>
      ${lista.slice(0, 8).map(c => miniHTML({ hora: c.due ? brDate(c.due) : "s/ prazo", texto: c.n, url: c.u, key: procKey(c), cls: c.due && c.due < hoje ? "crit" : "",
        meta: `${c.due && c.due < hoje ? chip(`${-diasAte(c.due)} dias`, "crit") : ""}${urg(c) ? chip("URGENTÍSSIMO", "urg") : ""}${c.soPje ? chip("só no PJe — conferir", "warn") : ""}${chip(comarcaBonita(comarcaDe(c)))}` })).join("") || vazio("nada pendente")}
      ${lista.length > 8 ? `<button class="mais" data-go="${Tt.aba}">ver todos os ${lista.length} →</button>` : ""}</section>`;
  };
  html += `<h2 class="sec">Pendências — separadas por tipo</h2><div class="blocos">
    ${bloco("laudo", F.laudo, "Atrasados primeiro. Inclui prazo de laudo vencido que só aparece no quadro PJe.")}
    ${bloco("imp", F.imp, "Laudo já entregue; falta responder a impugnação ou o complementar.")}
    ${bloco("intim", F.intim, "Aceite, honorários, ciência, esclarecimento de rotina — resolve peticionando.")}
    ${bloco("agenda", F.agenda, "Intimação para designar data, prazo de agendamento vencido e varas para ligar.")}
  </div>`;
  el.innerHTML = html;
  /* caixa rápida da capa: mesma regra da aba Caixa do dia */
  const f = el.querySelector("#cxRapido");
  f.onsubmit = async ev => {
    ev.preventDefault(); const inp = f.querySelector("#cxRapidoTxt"), t = inp.value.trim(); if (!t) return;
    inp.disabled = true; const modo = await anotar(d, t, "", ctx.dev); inp.disabled = false; inp.value = "";
    if (ctx.toast) ctx.toast(modo === "trello" ? "anotado no Trello — a rodada das 8h aplica" : modo === "dev" ? "anotado (teste)" : "sem Trello agora — guardei neste aparelho");
    if (ctx.rerender) ctx.rerender();
  };
}
