/* Trello ao vivo, direto do navegador (a API do Trello libera CORS).
   A chave e o token ficam só neste aparelho (localStorage). */
import { APP, QUADROS, ORDEM_QUADROS, L } from "./config.js";
import { ymd, kvGet, kvSet, lsGet, lsSet, lsDel, agoraHM, HOJE, brDate } from "./util.js";

const API = "https://api.trello.com/1";
const CRED_KEY = "rpm.trello";
const CACHE_KEY = "carga";

export function cred() { return lsGet(CRED_KEY, null); }
const limpa = s => String(s || "").replace(/[^A-Za-z0-9_\-]/g, "");   // tira espaços, aspas e caracteres invisíveis colados junto
export function salvaCred(key, token) { lsSet(CRED_KEY, { key: limpa(key), token: limpa(token), desde: new Date().toISOString() }); }
export function apagaCred() { lsDel(CRED_KEY); }
export function temCred() { const c = cred(); return !!(c && c.key && c.token); }
export function urlAutorizar(key, retorno) {
  const u = new URL("https://trello.com/1/authorize");
  u.searchParams.set("expiration", "never"); u.searchParams.set("name", APP.curto); u.searchParams.set("scope", "read,write");
  u.searchParams.set("response_type", "token"); u.searchParams.set("key", key.trim());
  if (retorno) { u.searchParams.set("return_url", retorno); u.searchParams.set("callback_method", "fragment"); }
  return u.toString();
}

function auth(url) { const c = cred(); const sep = url.includes("?") ? "&" : "?"; return `${url}${sep}key=${encodeURIComponent(c.key)}&token=${encodeURIComponent(c.token)}`; }
async function get(path) {
  const r = await fetch(auth(API + path), { headers: { Accept: "application/json" } });
  if (!r.ok) { const e = new Error(`Trello ${r.status}`); e.status = r.status; e.body = await r.text().catch(() => ""); throw e; }
  return r.json();
}
async function post(path, body) {
  const r = await fetch(auth(API + path), { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) { const e = new Error(`Trello ${r.status}`); e.status = r.status; e.body = await r.text().catch(() => ""); throw e; }
  return r.json();
}

/** normaliza um card da API REST para o formato do painel */
function normCard(c, q, listas) {
  const l = listas[c.idList] || "";
  return {
    id: c.id, n: c.name || "", desc: c.desc || "", due: c.due ? ymd(c.due) : "", dueISO: c.due || "", dueOk: !!c.dueComplete,
    lb: (c.labels || []).map(x => x.name).filter(Boolean), lbc: (c.labels || []).map(x => x.color || ""),
    u: c.shortUrl || c.url || "", l, lid: c.idList, q, at: c.dateLastActivity || "", num: c.idShort || 0,
  };
}

/** Lê os quatro quadros. Devolve {at, laudos:[], pje:[], financas:[], processos:[], listas:{q:[{id,name,pos}]}} */
export async function carregaQuadros() {
  const out = { at: new Date().toISOString(), listas: {} };
  await Promise.all(ORDEM_QUADROS.map(async q => {
    const b = await get(`/boards/${QUADROS[q].id}?fields=name,url&lists=open&list_fields=name,pos&cards=open&card_fields=name,desc,due,dueComplete,labels,shortUrl,idList,dateLastActivity,idShort`);
    const listas = {}; (b.lists || []).forEach(l => listas[l.id] = l.name);
    out.listas[q] = (b.lists || []).map(l => ({ id: l.id, name: l.name, pos: l.pos }));
    out[q] = (b.cards || []).map(c => normCard(c, q, listas));
  }));
  return out;
}

/** Trava do painel: só aceita carga nova com pelo menos 70% dos cards da anterior, quadro a quadro. */
export function cargaConfiavel(nova, antiga) {
  if (!antiga) return { ok: true };
  for (const q of ORDEM_QUADROS) {
    const a = (antiga[q] || []).length, n = (nova[q] || []).length;
    if (a >= 20 && n < a * APP.guardaMinimo) return { ok: false, motivo: `${QUADROS[q].nome}: veio com ${n} cards, antes tinha ${a}` };
  }
  return { ok: true };
}
export async function cargaSalva() { return kvGet(CACHE_KEY); }
export async function guardaCarga(d) { return kvSet(CACHE_KEY, d); }

/** detalhes que só a ficha precisa: anexos, comentários, checklists */
export async function detalheCard(id) {
  const c = await get(`/cards/${id}?fields=name,desc,due,dateLastActivity&attachments=true&attachment_fields=name,url,date&actions=commentCard&actions_limit=50&checklists=all&checklist_fields=name&checkItem_fields=name,state`);
  return {
    anexos: (c.attachments || []).map(a => ({ nome: a.name, url: a.url, em: a.date })),
    comentarios: (c.actions || []).map(a => ({ em: a.date, texto: (a.data && a.data.text) || "", quem: (a.memberCreator && a.memberCreator.fullName) || "" })),
    checklists: (c.checklists || []).map(k => ({ nome: k.name, itens: (k.checkItems || []).map(i => ({ nome: i.name, feito: i.state === "complete" })) })),
  };
}

/* ---- Caixa do dia: cada anotação vira card na lista "Caixa do dia" do PAINEL LAUDOS ---- */
function achaLista(dados, re, q = "laudos") { return ((dados.listas || {})[q] || []).find(l => re.test(l.name)); }
export async function listaCaixa(dados, criar = true) {
  let l = achaLista(dados, L.caixa);
  if (!l && criar) {
    const nova = await post("/lists", { name: "📝 CAIXA DO DIA — anotações do site (rodada das 8h lê aqui)", idBoard: QUADROS.laudos.id, pos: "bottom" });
    l = { id: nova.id, name: nova.name }; (dados.listas.laudos = dados.listas.laudos || []).push(l);
  }
  return l;
}
export async function anotaCaixa(dados, texto, catNome, proc) {
  const l = await listaCaixa(dados, true);
  const hoje = HOJE();
  const nome = `[${brDate(hoje)} ${agoraHM()}]${catNome ? " " + catNome + " —" : ""} ${texto.replace(/\s+/g, " ").slice(0, 140)}`;
  const desc = `${texto}\n\n${proc ? "Processo: " + proc + "\n" : ""}Origem: site do painel · ${brDate(hoje, true)} ${agoraHM()}\nStatus: PENDENTE — a rodada das 8h aplica no card do processo, comenta lá o que fez e arquiva este recado.`;
  const c = await post("/cards", { idList: l.id, name: nome, desc, pos: "top" });
  return { id: c.id, n: c.name, desc, u: c.shortUrl || c.url, l: l.name, lid: l.id, q: "laudos", at: new Date().toISOString(), lb: [] };
}
export async function apagaCardCaixa(id) {
  const r = await fetch(auth(`${API}/cards/${id}`), { method: "DELETE" });
  if (!r.ok) throw new Error("Trello " + r.status);
}
export function cardsCaixa(dados) {
  const lc = achaLista(dados, L.caixa), la = achaLista(dados, L.caixaOk);
  const pend = lc ? (dados.laudos || []).filter(c => c.lid === lc.id) : [];
  const ok = la ? (dados.laudos || []).filter(c => c.lid === la.id) : [];
  const ord = (a, b) => (a.at || "") < (b.at || "") ? 1 : -1;
  return { pend: pend.sort(ord), ok: ok.sort(ord).slice(0, 40), lista: lc };
}

/** teste rápido da chave: quem sou eu */
export async function quemSou() { return get("/members/me?fields=fullName,username"); }
