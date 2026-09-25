/* Google Agenda (primedufop@gmail.com) — o navegador não consegue ler o endereço iCal do Google direto (sem CORS).
   Um robô gratuito do GitHub lê o iCal a cada 30 min, criptografa com a senha da agenda e publica data/agenda.enc.json.
   Aqui o site baixa esse arquivo e descriptografa com a senha guardada só neste aparelho. */
import { APP } from "./config.js";
import { lsGet, lsSet, lsDel, kvGet, kvSet } from "./util.js";

const KEY = "rpm.agenda";
export function senhaAgenda() { return lsGet(KEY, ""); }
export function salvaSenhaAgenda(s) { s ? lsSet(KEY, s.trim()) : lsDel(KEY); }

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function chave(senha, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}
export async function decifra(pacote, senha) {
  const k = await chave(senha, b64(pacote.salt));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(pacote.iv) }, k, b64(pacote.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

/** Devolve {eventos:[{d,t,loc,allDay}], at, erro?} — nunca lança. */
export async function carregaAgenda({ dev = false } = {}) {
  if (dev) { try { const r = await fetch("dev/agenda.json"); return await r.json(); } catch (e) { return { eventos: [], at: "", erro: "sem agenda de teste" }; } }
  const senha = senhaAgenda();
  const salvo = (await kvGet("agenda")) || null;
  try {
    const r = await fetch(APP.agendaUrl + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error("agenda " + r.status);
    const pacote = await r.json();
    if (pacote.vazio) return Object.assign({ eventos: [], at: "" }, salvo || {}, { erro: "agenda ainda não publicada — rodar o robô “agenda” no GitHub (Actions → Run workflow)" });
    if (!senha) return Object.assign({ eventos: [], at: pacote.at || "" }, salvo || {}, { erro: "senha da agenda não informada — Configuração" });
    const dados = await decifra(pacote, senha);
    const out = { eventos: dados.eventos || [], at: dados.at || pacote.at || "", publicadoEm: pacote.at || "" };
    await kvSet("agenda", out);
    return out;
  } catch (e) {
    const erro = /OperationError|decrypt/i.test(String(e)) ? "senha da agenda não confere" : "agenda indisponível agora";
    return Object.assign({ eventos: [], at: "" }, salvo || {}, { erro: erro + (salvo ? " — mostrando a última leitura" : "") });
  }
}
