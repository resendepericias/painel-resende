/* Gráficos em SVG puro, nas cores da empresa. Sem biblioteca: o site continua abrindo sem internet.
   Marcas finas, cantos de 4px, faixa de 2px entre barras, tooltip por marca (data-tip). */
import { esc } from "./util.js";

/* série única = dourado (magnitude). Categorias em ordem fixa, nunca cicladas. */
export const CAT = ["var(--gold)", "var(--cyan)", "var(--azul-claro)", "var(--ink2)", "var(--warn)", "var(--ok)"];

/** barras horizontais em HTML (texto nítido em qualquer largura): rows=[{label, value, hint?, cor?}] */
export function hbar(rows, { fmt = v => String(v), max = null, cor = CAT[0] } = {}) {
  if (!rows.length) return `<div class="vazio">sem dados</div>`;
  const mx = max || Math.max(...rows.map(r => r.value), 1);
  return `<div class="hb">` + rows.map((r, i) => `<div class="hb-r mark" data-tip="${esc(r.hint || (r.label + ": " + fmt(r.value)))}" style="--i:${i}">
      <div class="hb-l" title="${esc(r.label)}">${esc(r.label)}</div>
      <div class="hb-t"><div class="hb-f" style="width:${Math.max(1, r.value / mx * 100).toFixed(1)}%;background:${r.cor || cor}"></div></div>
      <div class="hb-v">${esc(fmt(r.value))}</div></div>`).join("") + `</div>`;
}

/** colunas por período, em HTML: cols=[{label, value, hint?, cor?}] */
export function colunas(cols, { fmt = v => String(v), cor = CAT[0], h = 150 } = {}) {
  if (!cols.length) return `<div class="vazio">sem dados</div>`;
  const mx = Math.max(...cols.map(c => c.value), 1);
  return `<div class="cl" style="height:${h}px">` + cols.map((c, i) => `<div class="cl-c mark" data-tip="${esc(c.hint || (c.label + ": " + fmt(c.value)))}" style="--i:${i}">
      <div class="cl-v">${c.value > 0 ? esc(fmt(c.value)) : ""}</div>
      <div class="cl-b" style="height:${c.value > 0 ? Math.max(2, c.value / mx * 100).toFixed(1) : 0}%;background:${c.cor || cor}"></div>
      <div class="cl-l">${esc(c.label)}</div></div>`).join("") + `</div>`;
}

/** uma barra empilhada com legenda: segs=[{label, value, cor}] */
export function pilha(segs, { fmt = v => String(v) } = {}) {
  const tot = segs.reduce((s, x) => s + x.value, 0);
  if (!tot) return `<div class="vazio">sem valores lançados</div>`;
  const w = 600, h = 26; let x = 0;
  let s = `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:${h}px">`;
  segs.filter(g => g.value > 0).forEach((g, i) => {
    const bw = g.value / tot * w;
    s += `<g class="mark" data-tip="${esc(g.label + ": " + fmt(g.value) + " (" + Math.round(g.value / tot * 100) + "%)")}"><rect x="${x + (i ? 1 : 0)}" y="2" width="${Math.max(0, bw - (i ? 1 : 0))}" height="${h - 4}" rx="4" fill="${g.cor}"/></g>`;
    x += bw;
  });
  s += `</svg><div class="legenda">` + segs.map(g => `<span><i style="background:${g.cor}"></i>${esc(g.label)} <b>${esc(fmt(g.value))}</b></span>`).join("") + `</div>`;
  return s;
}

/** rosca simples com número no meio: partes=[{label,value,cor}] */
export function rosca(partes, centro, sub) {
  const tot = partes.reduce((s, x) => s + x.value, 0) || 1;
  const r = 44, C = 2 * Math.PI * r; let off = 0;
  let s = `<svg class="chart rosca" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" class="trilho" fill="none" stroke-width="12"/>`;
  partes.filter(p => p.value > 0).forEach(p => {
    const len = p.value / tot * C;
    s += `<circle class="mark" data-tip="${esc(p.label + ": " + p.value)}" cx="60" cy="60" r="${r}" fill="none" stroke="${p.cor}" stroke-width="12" stroke-dasharray="${Math.max(0, len - 2)} ${C - len + 2}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;
    off += len;
  });
  s += `<text x="60" y="58" text-anchor="middle" class="big">${esc(centro)}</text><text x="60" y="76" text-anchor="middle" class="lbl">${esc(sub)}</text></svg>`;
  /* leitura em texto de cada fatia (cor nunca é o único código) */
  s += `<div class="rosca-leg">${partes.filter(p => p.value > 0).map(p => `<span><i style="background:${p.cor}"></i>${p.value} ${esc(p.label)}</span>`).join("")}</div>`;
  return `<div class="rosca-box">${s}</div>`;
}
