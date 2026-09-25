/* ⚠️ Complementar / impugnação — fila própria, contada aqui e não na fila de laudo. */
import { L } from "../config.js";
import { ico } from "../util.js";
import { ehImp } from "../regras.js";
import { rowHTML, vazio, secao } from "../ui.js";

export function render(el, d) {
  const lista = d.laudos.filter(ehImp).sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1);
  const pjeImp = d.pje.filter(c => L.pjeEsc.test(c.l)).sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1);
  const finImp = d.financas.filter(c => (c.lb || []).includes("COMPLEMENTAR / IMPUGNACAO"));
  el.innerHTML = `<div class="note">Prioridade separada da fila de laudo: prazo curto e risco de intimação pessoal.</div>
    ${secao(`${ico("comentario")} A responder`, lista.map(c => rowHTML(c)).join("") || vazio("nenhuma"), { n: lista.length, nCls: lista.length ? "crit" : "" })}
    ${secao(`${ico("prancheta")} Esclarecimento / impugnação — intimações PJe`, pjeImp.map(c => rowHTML(c, { noComarca: true })).join("") || vazio("nenhuma"), { n: pjeImp.length })}
    ${finImp.length ? secao(`${ico("anexo")} Já entregues, com histórico de impugnação`, finImp.slice(0, 40).map(c => rowHTML(c, { sev: "neut" })).join(""), { n: finImp.length, sub: "Estão no quadro de finanças (laudo protocolado) e trazem a etiqueta de impugnação. Só acompanhar." }) : ""}`;
}
