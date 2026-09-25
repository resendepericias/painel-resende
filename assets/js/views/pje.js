/* ⚖️ PJe / eproc — o que chegou de intimação, separado da fila de laudos. */
import { L } from "../config.js";
import { HOJE, ico, esc } from "../util.js";
import { pjePendentes } from "../regras.js";
import { rowHTML, vazio, secao } from "../ui.js";

export function render(el, d) {
  const hoje = HOJE();
  const grupos = [[L.pjeAceite, "Aceites e nomeações — responder no sistema", "prancheta"], [L.pjeAg, "Agendar perícia — designar data", "calendario"],
    [L.pjeEsc, "Esclarecimentos e impugnações", "comentario"], [L.pjeHon, "Honorários e alvarás", "trofeu"], [L.pjeCiencia, "Ciência / monitorar", "lupa"],
    [L.pjeLaudo, "Prazo de laudo — o juiz espera o laudo", "documento"]];
  const pend = pjePendentes(d);
  /* "intimações vencidas" só recebe o que NÃO é prazo de laudo */
  const vencResp = pend.filter(c => !L.pjeLaudo.test(c.l) && c.due && c.due < hoje).sort((a, b) => a.due < b.due ? -1 : 1);
  const resp = d.pje.filter(c => L.pjeResp.test(c.l)).sort((a, b) => (a.at || "") < (b.at || "") ? 1 : -1);
  let html = `<div class="note">Fonte: quadro <b>PJE / EPROC 2026 — PRAZOS E INTIMAÇÕES</b>, alimentado pela rodada da noite. Prazo de laudo vencido fica no último bloco e na aba <b>Laudo a fazer</b>; aqui em cima só o que se resolve peticionando.</div>`;
  html += secao(`${ico("notificacao")} Vencidas para responder — não é laudo`, vencResp.map(c => rowHTML(c, { noComarca: true, sev: "crit" })).join("") || vazio("nenhuma pendência vencida"), { cls: vencResp.length ? "crit-borda" : "", n: vencResp.length, nCls: vencResp.length ? "crit" : "", sub: "Majoração, agendamento, aceite, ciência, esclarecimento, honorários." });
  for (const [re, titulo, icone] of grupos) {
    const cs = d.pje.filter(c => re.test(c.l) && !L.pjeResp.test(c.l)).sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1);
    if (!cs.length) continue;
    const venc = cs.filter(c => c.due && c.due < hoje).length;
    html += secao(`${ico(icone)} ${esc(titulo)}${venc ? ` <span class="chip crit">${venc} vencidas</span>` : ""}`, cs.map(c => rowHTML(c, { noComarca: true })).join(""), { n: cs.length });
  }
  html += `<section class="card"><details><summary><h2>${ico("like")} Respondidas <span class="chip ok">${resp.length}</span></h2></summary>${resp.slice(0, 80).map(c => rowHTML(c, { noComarca: true, sev: "neut" })).join("")}${resp.length > 80 ? `<div class="legend">+ ${resp.length - 80} mais antigas no Trello</div>` : ""}</details></section>`;
  el.innerHTML = html;
}
