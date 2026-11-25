/* 📄 Laudo a fazer — só laudo a escrever. Complementar/impugnação tem aba própria. */
import { TEMAS } from "../config.js";
import { esc, HOJE, diasAte, ico, money } from "../util.js";
import { comarcaDe, comarcaBonita, valorDe } from "../parse.js";
import { filas, ehFeita, ehTriado, urg } from "../regras.js";
import { rowHTML, vazio } from "../ui.js";

const fl = { stat: "todos", com: "todas", tema: "todos", q: "" };

export function render(el, d) {
  const hoje = HOJE(), pend = filas(d).laudo; /* mesma fila da capa: inclui prazo de laudo vencido que só existe no quadro PJe */
  /* atalho vindo do número da capa: #laudos/atrasado abre já filtrado */
  const arg = (location.hash.split("/")[1] || "");
  if (["atrasado", "vence7", "futuro", "semprazo", "urg"].includes(arg)) { fl.stat = arg; fl.com = "todas"; fl.tema = "todos"; fl.q = ""; }
  const coms = [...new Set(pend.map(comarcaDe))].sort();
  const listasExtra = [...new Set(pend.filter(c => !TEMAS.includes(c.l)).map(c => c.l))].filter(Boolean);
  const travado = pend.reduce((s, c) => s + (valorDe(c) || 0), 0);
  const comInt = pend.filter(c => c.due), semInt = pend.filter(c => !c.due), atr = pend.filter(c => c.due && c.due < hoje);
  el.innerHTML = `<section class="card resumo-laudos">
    <h2>${ico("documento")} Laudos a fazer <span class="chip crit">${pend.length}</span> <span class="chip ok">${money(travado)} travado</span></h2>
    <div class="note"><b>${pend.length}</b> laudo(s) = <b>${comInt.length}</b> com prazo (intimação ou prazo no card)${atr.length ? `, <b class="txt-crit">${atr.length} atrasado(s)</b>` : ""} + <b>${semInt.length}</b> sem intimação (perícia realizada, laudo ainda não escrito). Cada processo conta uma vez. Complementar e impugnação têm aba própria.</div>
    <div class="filters">
      <select id="f-stat">
        <option value="todos">status: todos</option><option value="atrasado">atrasados</option>
        <option value="vence7">vencem em 7 dias</option><option value="futuro">prazo futuro</option>
        <option value="semprazo">sem intimação / sem prazo</option><option value="urg">urgentíssimos</option>
      </select>
      <select id="f-com"><option value="todas">comarca: todas</option>${coms.map(c => `<option value="${esc(c)}">${esc(comarcaBonita(c))}</option>`).join("")}</select>
      <select id="f-tema"><option value="todos">lista: todas</option>${[...TEMAS, ...listasExtra].map(t => `<option>${esc(t)}</option>`).join("")}</select>
      <input id="f-q" placeholder="filtrar por processo ou nome…" value="${esc(fl.q)}">
    </div>
    <div id="laudosLista"></div>
    <div class="legend">Com prazo primeiro (vencidos no topo); depois os sem intimação, pela data da perícia. O prazo vem do card do Trello, completado com o quadro PJe/eproc. Perícia que ainda está numa lista 🗓️ AGENDADAS com data passada aparece aqui como “perícia realizada — mover card”.</div>
  </section>`;
  const paint = () => {
    let rows = pend.slice();
    if (fl.stat === "atrasado") rows = rows.filter(c => c.due && c.due < hoje);
    else if (fl.stat === "vence7") rows = rows.filter(c => c.due && c.due >= hoje && diasAte(c.due) <= 7);
    else if (fl.stat === "futuro") rows = rows.filter(c => c.due && diasAte(c.due) > 7);
    else if (fl.stat === "semprazo") rows = rows.filter(c => !c.due);
    else if (fl.stat === "urg") rows = rows.filter(urg);
    if (fl.com !== "todas") rows = rows.filter(c => comarcaDe(c) === fl.com);
    if (fl.tema !== "todos") rows = rows.filter(c => c.l === fl.tema);
    if (fl.q) { const q = fl.q.toLowerCase(), qd = fl.q.replace(/\D/g, ""); rows = rows.filter(c => c.n.toLowerCase().includes(q) || (qd.length >= 4 && c.n.replace(/\D/g, "").includes(qd))); }
    const comP = rows.filter(c => c.due).sort((a, b) => a.due < b.due ? -1 : 1), semP = rows.filter(c => !c.due).sort((a, b) => (a.realizadaEm || a.n) < (b.realizadaEm || b.n) ? -1 : 1);
    const linha = c => rowHTML(c, { tema: c.l, dataAlt: c.realizadaEm, subAlt: c.realizadaEm ? "perícia feita" : "", extra: c.realizadaEm ? '<span class="chip warn">data passou — confirme: feita ou faltou?</span>' : "", marcar: !!c.realizadaEm });
    el.querySelector("#laudosLista").innerHTML = rows.length ? (comP.length ? `<h3>Com prazo — ${comP.length}</h3>` + comP.map(linha).join("") : "") + (semP.length ? `<h3>Sem intimação — ${semP.length}</h3>` + semP.map(linha).join("") : "") : vazio("nenhum laudo com esses filtros");
  };
  ["f-stat", "f-com", "f-tema"].forEach(id => { const s = el.querySelector("#" + id); s.value = { "f-stat": fl.stat, "f-com": fl.com, "f-tema": fl.tema }[id]; if (s.value !== ({ "f-stat": fl.stat, "f-com": fl.com, "f-tema": fl.tema }[id])) s.selectedIndex = 0; s.onchange = () => { fl.stat = el.querySelector("#f-stat").value; fl.com = el.querySelector("#f-com").value; fl.tema = el.querySelector("#f-tema").value; paint(); }; });
  el.querySelector("#f-q").oninput = e => { fl.q = e.target.value; paint(); };
  paint();
}
