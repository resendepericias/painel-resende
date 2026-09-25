/* Robô da agenda — roda no GitHub Actions (gratuito) três vezes ao dia (6h, 12h e 18h de Brasília), ou na hora pelo botão "Run workflow".
   Lê o endereço iCal secreto do Google Agenda (segredo ICS_URL), expande recorrências numa janela de -30 a +120 dias,
   criptografa com a senha da agenda (segredo AGENDA_SENHA, AES-256-GCM + PBKDF2) e grava data/agenda.enc.json.
   No site, só quem tem a senha lê. Nada da agenda fica legível no repositório. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

const ICS_URL = process.env.ICS_URL, SENHA = process.env.AGENDA_SENHA, OUT = "data/agenda.enc.json";
if (!ICS_URL || !SENHA) { console.error("faltam os segredos ICS_URL e AGENDA_SENHA"); process.exit(1); }
const TZ = "America/Sao_Paulo";

/* ---------- iCal ---------- */
function desdobra(txt) { return txt.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, ""); }
function parseICS(txt) {
  const linhas = desdobra(txt).split("\n"); const evs = []; let cur = null, tzs = {};
  for (const l of linhas) {
    if (l === "BEGIN:VEVENT") { cur = { exdates: [] }; continue; }
    if (l === "END:VEVENT") { if (cur) evs.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = l.indexOf(":"); if (i < 0) continue;
    const [nomeParams, valor] = [l.slice(0, i), l.slice(i + 1)];
    const [nome, ...params] = nomeParams.split(";"); const p = {}; params.forEach(x => { const [k, v] = x.split("="); p[k] = v; });
    if (nome === "SUMMARY") cur.t = un(valor);
    else if (nome === "LOCATION") cur.loc = un(valor);
    else if (nome === "DTSTART") { cur.start = parseDT(valor, p); cur.allDay = p.VALUE === "DATE"; }
    else if (nome === "DTEND") cur.end = parseDT(valor, p);
    else if (nome === "RRULE") cur.rrule = valor;
    else if (nome === "EXDATE") valor.split(",").forEach(v => cur.exdates.push(parseDT(v, p)));
    else if (nome === "RECURRENCE-ID") cur.recId = parseDT(valor, p);
    else if (nome === "UID") cur.uid = valor;
    else if (nome === "STATUS") cur.status = valor;
  }
  return evs;
}
const un = s => s.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
/* devolve {local:"YYYY-MM-DDTHH:MM", date:true|false} em horário de Brasília */
function parseDT(v, p) {
  if (p.VALUE === "DATE" || /^\d{8}$/.test(v)) return { local: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`, date: true };
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v); if (!m) return null;
  if (m[7] === "Z" || (p.TZID && p.TZID !== TZ)) {
    const utc = m[7] === "Z" ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : zonaParaUTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], p.TZID);
    return { local: localBR(new Date(utc)), date: false };
  }
  return { local: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`, date: false };
}
function localBR(d) { const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }); const o = {}; f.formatToParts(d).forEach(x => o[x.type] = x.value); return `${o.year}-${o.month}-${o.day}T${o.hour === "24" ? "00" : o.hour}:${o.minute}`; }
function zonaParaUTC(y, mo, d, h, mi, tz) { const guess = Date.UTC(y, mo, d, h, mi); const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }); const o = {}; f.formatToParts(new Date(guess)).forEach(x => o[x.type] = x.value); const asIf = Date.UTC(+o.year, o.month - 1, +o.day, +(o.hour === "24" ? 0 : o.hour), +o.minute); return guess - (asIf - guess); }

/* ---------- recorrência (o suficiente para plantões e lembretes semanais/mensais) ---------- */
const DIA = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
function addDias(local, n) { const d = new Date(local.slice(0, 10) + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) + local.slice(10); }
function addMeses(local, n) { const d = new Date(local.slice(0, 10) + "T12:00:00Z"); const dia = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); const max = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(dia, max)); return d.toISOString().slice(0, 10) + local.slice(10); }
function expande(ev, ini, fim) {
  if (!ev.start) return [];
  if (!ev.rrule) return (ev.start.local.slice(0, 10) >= ini && ev.start.local.slice(0, 10) <= fim) ? [ev.start.local] : [];
  const r = {}; ev.rrule.split(";").forEach(x => { const [k, v] = x.split("="); r[k] = v; });
  const freq = r.FREQ, inter = +(r.INTERVAL || 1), count = r.COUNT ? +r.COUNT : Infinity;
  let until = r.UNTIL ? (r.UNTIL.length === 8 ? `${r.UNTIL.slice(0, 4)}-${r.UNTIL.slice(4, 6)}-${r.UNTIL.slice(6, 8)}` : parseDT(r.UNTIL, {}).local.slice(0, 10)) : "9999";
  const byday = r.BYDAY ? r.BYDAY.split(",").map(x => x.replace(/^[-+]?\d+/, "")) : null;
  const out = []; let n = 0, k = 0; const s = ev.start.local;
  const ex = new Set(ev.exdates.filter(Boolean).map(x => x.local.slice(0, 10)));
  while (k < 4000 && n < count) {
    let cands = [];
    if (freq === "DAILY") cands = [addDias(s, k * inter)];
    else if (freq === "WEEKLY") { const base = addDias(s, k * inter * 7); const wd = new Date(base.slice(0, 10) + "T12:00:00Z").getUTCDay(); const semanaIni = addDias(base, -wd); cands = (byday || [DIA[wd]]).map(d => addDias(semanaIni, DIA.indexOf(d))).filter(x => x >= s); }
    else if (freq === "MONTHLY") cands = [addMeses(s, k * inter)];
    else if (freq === "YEARLY") cands = [addMeses(s, k * inter * 12)];
    else break;
    for (const c of cands) { n++; const dia = c.slice(0, 10); if (dia > until || dia > fim) { if (dia > until) return out; continue; } if (!ex.has(dia) && dia >= ini) out.push(c); if (n >= count) break; }
    if (cands.some(c => c.slice(0, 10) > fim)) break;
    k++;
  }
  return out;
}

/* ---------- cripto ---------- */
function cifra(obj, senha) {
  const salt = randomBytes(16), iv = randomBytes(12), key = pbkdf2Sync(senha, salt, 200000, 32, "sha256");
  const c = createCipheriv("aes-256-gcm", key, iv); const ct = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final(), c.getAuthTag()]);
  return { v: 1, salt: salt.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64"), at: new Date().toISOString() };
}
function decifra(p, senha) {
  const key = pbkdf2Sync(senha, Buffer.from(p.salt, "base64"), 200000, 32, "sha256"); const ct = Buffer.from(p.ct, "base64");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(p.iv, "base64")); d.setAuthTag(ct.subarray(ct.length - 16));
  return JSON.parse(Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]).toString("utf8"));
}

/* ---------- principal ---------- */
const r = await fetch(ICS_URL, { headers: { "User-Agent": "painel-resende/1.0" } });
if (!r.ok) { console.error("iCal respondeu", r.status); process.exit(1); }
const txt = await r.text();
if (!/BEGIN:VCALENDAR/.test(txt)) { console.error("resposta não é um iCal"); process.exit(1); }
const evs = parseICS(txt);
const hoje = localBR(new Date()).slice(0, 10), ini = addDias(hoje, -30), fim = addDias(hoje, 120);
const overrides = new Map(); evs.filter(e => e.recId).forEach(e => overrides.set(e.uid + "|" + e.recId.local.slice(0, 10), e));
const eventos = [];
for (const e of evs) {
  if (e.status === "CANCELLED" || e.recId) continue;
  for (const dt of expande(e, ini, fim)) {
    const ov = overrides.get(e.uid + "|" + dt.slice(0, 10)); const src = ov || e; const start = ov ? ov.start.local : dt;
    if (ov && ov.status === "CANCELLED") continue;
    if (start.slice(0, 10) < ini || start.slice(0, 10) > fim) continue;
    eventos.push({ d: src.allDay || start.length === 10 ? start.slice(0, 10) : start + ":00-03:00", t: src.t || "(sem título)", loc: src.loc || "", allDay: !!(src.allDay || start.length === 10) });
  }
}
eventos.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : a.t < b.t ? -1 : 1);
const dados = { at: new Date().toISOString(), eventos };

/* só regrava se mudou (ou se a última gravação tem mais de 6 h), para não encher o histórico de commits */
let mudou = true;
if (existsSync(OUT)) {
  try { const ant = JSON.parse(readFileSync(OUT, "utf8")); const antD = decifra(ant, SENHA);
    const igual = JSON.stringify(antD.eventos) === JSON.stringify(eventos); const velho = Date.now() - new Date(ant.at) > 6 * 3600e3;
    mudou = !igual || velho; } catch (e) { mudou = true; }
}
if (mudou) { writeFileSync(OUT, JSON.stringify(cifra(dados, SENHA))); console.log(`agenda: ${eventos.length} eventos (${ini} a ${fim}) — gravado`); }
else console.log(`agenda: ${eventos.length} eventos — sem mudança, nada a gravar`);
