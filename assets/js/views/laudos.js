/* 📄 Laudo a fazer — só laudo a escrever. Complementar/impugnação tem aba própria. */
import { TEMAS } from "../config.js";
import { esc, HOJE, diasAte, ico, money } from "../util.js";
import { comarcaDe, comarcaBonita, valorDe } from "../parse.js";
import { pendentes, ehFeita, ehTriado, urg } from "../regras.js";
import { rowHTML, vazio } from "../ui.js";

const fl = { stat: "todos", com: "todas", tema: "todos", q: "" };

export function render(el, d) {
  const hoje = HOJE(), pend = pendentes(d);
  const coms = [...new Set(pend.map(comarcaDe))].sort();
  const listasExtra = [...new Set(pend.filter(c => !TEMAS.includes(c.l)).map(c => c.l))];
  const travado = pend.reduce((s, c) => s + (valorDe(c) || 0), 0);
  el.innerHTML = `<div class="note">Só laudo a escrever: listas de tema + 🎯 HOJE + filas ENTREGAR + 🖊️ PERÍCIA FEITA. Complementar e impugnação têm aba própria e não entram nesta conta.</div>
  <section class="card">
    <h2>${ico("documento")} Fila de laudos — por prazo <span class="chip">${pend.length}</span> <span class="chip ok">${money(travado)} travado</span></h2>
    <div class="filters">
      <select id="f-stat">
        <option value="todos">status: todos</option><option value="atrasado">atrasados</option>
        <option value="vence7">vencem em 7 dias</option><option value="futuro">prazo futuro</option>
        <option value="semprazo">sem prazo</option><option value="urg">urgentíssimos</option>
      </select>
      <select id="f-com"><option value="todas">comarca: todas</option>${coms.map(c => `<option value="${esc(c)}">${esc(comarcaBonita(c))}</option>`).join("")}</select>
      <select id="f-tema"><option value="todos">lista: todas</option>${[...TEMAS, ...listasExtra].map(t => `<option>${esc(t)}</option>`).join("")}</select>
      <input id="f-q" placeholder="filtrar por processo ou nome…" value="${esc(fl.q)}">
    </div>
    <div id="laudosLista"></div>
    <div class="legend">Ordenado por prazo (vencidos primeiro; sem prazo no fim). Prazo = data do card do Trello, completada com o quadro PJe/eproc. Card com due igual ou anterior à data da perícia aparece como “conferir”, nunca como atrasado.</div>
  </section>
  <section class="card"><h2>${ico("pulso")} Perícia feita — conferir e criar laudo <span class="chip">${d.laudos.filter(ehFeita).length}</span></h2>
    <div class="note">Perícia realizada, laudo ainda sem tema na fila. Confirme quem compareceu e arraste o card para a lista do tema no Trello.</div>
    <div id="feitasLista"></div></section>`;
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
    rows.sort((a, b) => (a.due || "9999-99") < (b.due || "9999-99") ? -1 : 1);
    el.querySelector("#laudosLista").innerHTML = rows.length ? rows.map(c => rowHTML(c, { tema: c.l })).join("") : vazio("nenhum laudo com esses filtros");
  };
  ["f-stat", "f-com", "f-tema"].forEach(id => { const s = el.querySelector("#" + id); s.value = { "f-stat": fl.stat, "f-com": fl.com, "f-tema": fl.tema }[id]; if (s.value !== ({ "f-stat": fl.stat, "f-com": fl.com, "f-tema": fl.tema }[id])) s.selectedIndex = 0; s.onchange = () => { fl.stat = el.querySelector("#f-stat").value; fl.com = el.querySelector("#f-com").value; fl.tema = el.querySelector("#f-tema").value; paint(); }; });
  el.querySelector("#f-q").oninput = e => { fl.q = e.target.value; paint(); };
  paint();
  const feitas = d.laudos.filter(ehFeita).sort((a, b) => a.n < b.n ? -1 : 1);
  el.querySelector("#feitasLista").innerHTML = feitas.length ? feitas.map(c => rowHTML(c)).join("") : vazio("nada a conferir");
}
