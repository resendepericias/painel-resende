/* Modo apresentação — esconde nome de periciado e número de processo na tela,
   para ela demonstrar o sistema a um perito interessado sem expor dado de ninguém. */
import { lsGet, lsSet } from "./util.js";
import { periciadoDe } from "./parse.js";

export const APRES = { on: !!lsGet("rpm.apres", false) };
export function ligaApres(v) { APRES.on = !!v; lsSet("rpm.apres", APRES.on); document.documentElement.classList.toggle("apres", APRES.on); }
document.documentElement.classList.toggle("apres", APRES.on);

let reNomes = null;
const RE_PROC = /\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?(\d{4}|\?{4})|\b\d{20}\b/g;
const VAR = { A: "[AÁÀÂÃaáàâã]", E: "[EÉÊeéê]", I: "[IÍií]", O: "[OÓÔÕoóôõ]", U: "[UÚÜuúü]", C: "[CÇcç]" };
function classe(ch) { const u = ch.toUpperCase(); return VAR[u] || `[${u}${u.toLowerCase()}]`; }
function reDe(nome) { return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").split("").map(ch => /[A-Za-z]/.test(ch) ? classe(ch) : ch === " " ? "\\s+" : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(""); }

/** Indexa todos os nomes de periciado achados nos cards (uma vez por carga). */
export function indexaNomes(d) {
  const set = new Set();
  for (const q of ["laudos", "pje", "financas", "processos"]) for (const c of (d[q] || [])) {
    const n = periciadoDe(c); if (n && n.length >= 6) set.add(n.trim());
    for (const m of (c.desc || "").matchAll(/(?:Periciad[oa]|Partes)\**:\**\s*([^\n]+)/gi)) {
      m[1].split(/\s+x\s+|\s+e outros.*$|,|\(|—/i).map(s => s.trim()).filter(s => /^[A-Za-zÀ-ÿ' ]{6,}$/.test(s) && s.split(/\s+/).length >= 2).forEach(s => set.add(s));
    }
  }
  const nomes = [...set].sort((a, b) => b.length - a.length).slice(0, 3000);
  reNomes = nomes.length ? new RegExp("\\b(?:" + nomes.map(reDe).join("|") + ")\\b", "g") : null;
}
/** Texto para a tela: em modo apresentação, mascara processo e nome. */
export function T(s) {
  if (!APRES.on || !s) return s;
  let t = String(s).replace(RE_PROC, "nº •••••••");
  if (reNomes) t = t.replace(reNomes, "▮▮▮▮▮ ▮▮▮▮");
  return t;
}
