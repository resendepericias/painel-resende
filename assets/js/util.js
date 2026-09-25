/* Utilidades — datas em horário de Brasília, formatação, escape. */
import { APP } from "./config.js";

const fmtYMD = new Intl.DateTimeFormat("en-CA", { timeZone: APP.tz, year: "numeric", month: "2-digit", day: "2-digit" });
const fmtHM  = new Intl.DateTimeFormat("pt-BR", { timeZone: APP.tz, hour: "2-digit", minute: "2-digit" });

/** Data local (Brasília) de um Date/ISO, como "2026-09-24". */
export function ymd(x) {
  const d = x instanceof Date ? x : new Date(x);
  if (isNaN(d)) return "";
  return fmtYMD.format(d);
}
/** HOJE em Brasília, nunca UTC — à noite o painel mostrava o dia seguinte. */
export const HOJE = () => ymd(new Date());
export const agoraHM = () => fmtHM.format(new Date());

export function somaDias(iso, n) { const x = new Date(iso + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
export function diasAte(iso) { return Math.round((new Date(iso + "T12:00:00") - new Date(HOJE() + "T12:00:00")) / 864e5); }
export function brDate(iso, ano = false) { return iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + (ano ? "/" + iso.slice(0, 4) : "/" + iso.slice(2, 4)) : ""; }
export function brDataHora(iso) { try { const d = new Date(iso); return d.toLocaleString("pt-BR", { timeZone: APP.tz, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }
export function brDataHoraLonga(iso) { try { const d = new Date(iso); return d.toLocaleString("pt-BR", { timeZone: APP.tz, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }

export const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const DIAS_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export function diaSemana(iso) { return DIAS[new Date(iso + "T12:00:00").getDay()]; }
export function extenso(iso) { const d = new Date(iso + "T12:00:00"); return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; }

export function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
export function money(v) { return v == null ? "" : "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
export function moneyCurto(v) { if (v == null) return ""; if (v >= 1000) return "R$ " + (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil"; return money(v); }
export function semAcento(s) { return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(); }
export function digitos(s) { return (s || "").replace(/\D/g, ""); }
export function plural(n, um, muitos) { return n === 1 ? um : muitos; }
export const porData = (a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : (a.due || "9999") > (b.due || "9999") ? 1 : 0;

/** Ícone da iconografia própria (pasta Iconografia), pintado pela cor do texto via mask. */
/* URL absoluta: url() dentro de variável CSS é resolvida em relação à folha de estilo, não ao documento */
export const ICO_BASE = new URL("assets/brand/icones/", document.baseURI).href;
export function ico(nome, cls = "") { return `<span class="ico ${cls}" style="--ico:url(${ICO_BASE}${nome}.svg)" aria-hidden="true"></span>`; }
export function pintaIcones(root = document) { root.querySelectorAll("[data-ico]").forEach(e => e.style.setProperty("--ico", `url(${ICO_BASE}${e.dataset.ico}.svg)`)); }

export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ---- armazenamento local (IndexedDB com fallback em localStorage) ---- */
const DB = "rpm-painel", STORE = "kv";
function abreDB() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
export async function kvGet(k) {
  try { const db = await abreDB(); return await new Promise((res, rej) => { const t = db.transaction(STORE, "readonly").objectStore(STORE).get(k); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); }); }
  catch (e) { try { const v = localStorage.getItem("kv:" + k); return v ? JSON.parse(v) : undefined; } catch (e2) { return undefined; } }
}
export async function kvSet(k, v) {
  try { const db = await abreDB(); return await new Promise((res, rej) => { const t = db.transaction(STORE, "readwrite").objectStore(STORE).put(v, k); t.onsuccess = () => res(true); t.onerror = () => rej(t.error); }); }
  catch (e) { try { localStorage.setItem("kv:" + k, JSON.stringify(v)); } catch (e2) {} }
}
export function lsGet(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
export function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
export function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
