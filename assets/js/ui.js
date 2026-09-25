/* Componentes de tela compartilhados pelas abas. */
import { esc, brDate, diasAte, money, ico, HOJE } from "./util.js";
import { comarcaDe, comarcaBonita, procKey, valorDe } from "./parse.js";
import { sevDe, urg } from "./regras.js";
import { T } from "./apresentacao.js";

export const chip = (txt, cls = "") => `<span class="chip ${cls}">${esc(txt)}</span>`;

export function chipsLabels(c) {
  const out = [];
  if (urg(c)) out.push(chip("URGENTÍSSIMO", "urg"));
  for (const lb of (c.lb || [])) {
    if (lb === "URGENTISSIMO") continue;
    if (lb === "ATRASADO") out.push(chip("ATRASADO", "crit"));
    else if (lb === "A VENCER") out.push(chip("A VENCER", "warn"));
    else if (lb === "AGUARDA PAGAMENTO") out.push(chip("AGUARDA PAG.", "ok"));
    else if (lb === "SEM ORDEM DE PAGAMENTO") out.push(chip("SEM ORDEM", "warn"));
    else if (lb === "ORDEM DE PAGAMENTO EXPEDIDA") out.push(chip("ORDEM EXPEDIDA", "ok"));
    else if (lb === "COMPLEMENTAR / IMPUGNACAO") out.push(chip("IMPUGNAÇÃO", "info"));
    else if (lb === "PEDI DILATACAO") out.push(chip("PEDI DILATAÇÃO", "info"));
    else if (lb === "+30 DIAS SEM PRAZO") out.push(chip("+30d SEM PRAZO", "warn"));
    else if (/FALTA VALOR/.test(lb)) out.push(chip("FALTA VALOR", "warn"));
    else if (/VALOR A CONFERIR/.test(lb)) out.push(chip("VALOR A CONFERIR", "warn"));
    else if (lb === "PAGO") out.push(chip("PAGO", "ok"));
    else if (lb === "TEMA INFERIDO — CONFERIR") out.push(chip("TEMA A CONFERIR", "neut"));
  }
  return out.join("");
}

/** linha de card: data | título + chips | link Trello. Clique abre a ficha do processo. */
export function rowHTML(c, opts = {}) {
  const sev = opts.sev || sevDe(c);
  const d = c.due ? brDate(c.due) : (opts.dataAlt ? brDate(opts.dataAlt) : (c.dueRuim ? "conferir" : "sem prazo"));
  const dd = c.due ? diasAte(c.due) : null;
  const sub = dd == null ? (c.dueRuim ? `<small>due = data da perícia</small>` : "") : (dd < 0 ? `<small>${-dd} ${-dd === 1 ? "dia" : "dias"} vencido</small>` : dd === 0 ? `<small>vence hoje</small>` : `<small>em ${dd} ${dd === 1 ? "dia" : "dias"}</small>`);
  const com = opts.noComarca ? "" : chip(comarcaBonita(comarcaDe(c)));
  const tema = opts.tema ? chip(opts.tema) : "";
  const v = c.v !== undefined ? c.v : valorDe(c);
  const val = v ? chip(money(v), "ok") : "";
  const extra = (c.soPje ? chip("só no PJe — conferir", "warn") : "") + (opts.extra || "");
  const k = procKey(c);
  return `<div class="row ${sev}${k ? " clk" : ""}" ${k ? `data-ficha="${k}"` : ""}>
    <div class="date">${d}${sub}</div>
    <div class="body"><div class="nm">${esc(T(c.n))}</div>
      <div class="sub">${com}${tema}${val}${extra}${chipsLabels(c)}</div></div>
    ${c.u ? `<a class="go" href="${esc(c.u)}" target="_blank" rel="noopener" title="abrir no Trello">${ico("seta")}</a>` : ""}
  </div>`;
}

/** item compacto da capa */
export function miniHTML({ hora = "", texto = "", meta = "", url = "", key = "", cls = "" }) {
  return `<div class="mini ${cls}${key ? " clk" : ""}" ${key ? `data-ficha="${key}"` : ""}><div class="h">${esc(hora)}</div>
    <div class="c">${esc(T(texto))}${meta ? `<div class="meta">${meta}</div>` : ""}</div>
    ${url ? `<a class="go" href="${esc(url)}" target="_blank" rel="noopener" title="abrir no Trello">${ico("seta")}</a>` : ""}</div>`;
}

export function tile(id, cls, k, t, icone = "") {
  return `<div class="tile ${cls}" data-go="${id}" role="button" tabindex="0">${icone ? ico(icone, "tile-ico") : ""}<div class="k">${k}</div><div class="t">${esc(t)}</div></div>`;
}
export const vazio = t => `<div class="vazio">${esc(t)}</div>`;
export const nota = t => `<div class="note">${t}</div>`;
export function secao(titulo, corpo, { cls = "", n = null, nCls = "", sub = "" } = {}) {
  return `<section class="card ${cls}"><h2>${titulo}${n != null ? ` <span class="chip ${nCls}">${n}</span>` : ""}</h2>${sub ? `<div class="note">${sub}</div>` : ""}${corpo}</section>`;
}

/** traço de eletrocardiograma (símbolo da marca), animado, para a capa */
export function pulsoSVG() {
  const d = "M0 40 H60 L72 40 L80 12 L92 68 L104 40 H150 L160 40 L168 22 L178 58 L188 40 H260 L268 40 L276 6 L290 74 L302 40 H420";
  return `<svg class="pulso" viewBox="0 0 420 80" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" pathLength="1"/></svg>`;
}
/** números dos mosaicos sobem de 0 até o valor (respeita “reduzir movimento”) */
export function animaNumeros(root) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  root.querySelectorAll(".tile .k").forEach(el => {
    const txt = el.textContent.trim(); if (!/^\d{1,4}$/.test(txt)) return;
    const alvo = +txt, t0 = performance.now(), dur = 650;
    const passo = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(alvo * e); if (k < 1) requestAnimationFrame(passo); else el.textContent = txt; };
    requestAnimationFrame(passo);
  });
}
