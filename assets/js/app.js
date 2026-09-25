/* Painel Resende — inicialização, navegação e carga de dados. */
import { APP } from "./config.js";
import { esc, brDataHora, lsGet, lsSet, lsDel, ico, pintaIcones, debounce, HOJE } from "./util.js";
import { temCred, salvaCred, carregaQuadros, cargaConfiavel, cargaSalva, guardaCarga } from "./trello.js";
import { sanearPrazos, filas, vencidos, pendentes, aceitas, pjePendentes, aCobrar } from "./regras.js";
import { carregaAgenda } from "./agenda.js";
import { APRES, ligaApres, indexaNomes, T } from "./apresentacao.js";
import { cardsCaixa } from "./trello.js";
import { indexa, busca, fichaHTML, completaFicha } from "./views/ficha.js";
import { animaNumeros } from "./ui.js";
import * as vHoje from "./views/hoje.js";
import * as vCaixa from "./views/caixa.js";
import * as vLaudos from "./views/laudos.js";
import * as vImp from "./views/imp.js";
import * as vAgendar from "./views/agendar.js";
import * as vPje from "./views/pje.js";
import * as vCobranca from "./views/cobranca.js";
import * as vVisao from "./views/visao.js";
import * as vConfig from "./views/config.js";
import { esvaziaFila } from "./views/caixa.js";

const DEV = new URLSearchParams(location.search).has("dev");
let DADOS = { at: "", laudos: [], pje: [], financas: [], processos: [], agenda: [], listas: {} };
let AGENDA = { eventos: [], at: "", erro: "" };
let IDX = [];
let carregando = false;
const sujo = new Set();

const ABAS = [
  ["hoje", "Hoje", "pulso", null],
  ["caixa", "Caixa do dia", "comentario", d => cardsCaixa(d).pend.length],
  ["laudos", "Laudo a fazer", "documento", d => pendentes(d).length],
  ["imp", "Complementar / impugnação", "notificacao", d => filas(d).imp.length],
  ["agendar", "Agendar", "calendario", d => aceitas(d).length],
  ["pje", "PJe / eproc", "prancheta", d => pjePendentes(d).length],
  ["cobranca", "Cobrança", "trofeu", d => aCobrar(d).length],
  ["visao", "Visão geral", "lupa", null],
];
const VIEWS = { hoje: vHoje, caixa: vCaixa, laudos: vLaudos, imp: vImp, agendar: vAgendar, pje: vPje, cobranca: vCobranca, visao: vVisao, config: vConfig };

/* ---------- tema ---------- */
document.documentElement.dataset.theme = lsGet("rpm.tema", "dark");

/* ---------- navegação por hash ---------- */
function rota() { const h = location.hash.replace(/^#/, "") || "hoje"; const [aba, arg] = h.split("/"); return { aba, arg }; }
function vaiPara(aba) { location.hash = "#" + aba; }
function pintaTabs() {
  const { aba } = rota();
  document.getElementById("tabs").innerHTML = ABAS.map(([id, nome, icone, cnt]) => {
    const n = cnt ? cnt(DADOS) : null;
    return `<a href="#${id}" class="${id === aba ? "act" : ""}">${ico(icone)}<span>${esc(nome)}</span>${n != null ? `<b class="b">${n}</b>` : ""}</a>`;
  }).join("");
}
function mostra() {
  const { aba, arg } = rota();
  document.querySelectorAll("main > section.aba").forEach(s => s.classList.toggle("act", s.id === "s-" + (VIEWS[aba] ? aba : "hoje")));
  if (aba === "ficha" && arg) { abreFicha(arg); return; }
  fechaFicha();
  renderAba(VIEWS[aba] ? aba : "hoje");
  pintaTabs();
  window.scrollTo({ top: 0 });
}
function renderAba(aba, forca = false) {
  const el = document.getElementById("s-" + aba); if (!el) return;
  if (!forca && el.dataset.ok === DADOS.at + "|" + APRES.on + "|" + AGENDA.at && !sujo.has(aba)) return;
  VIEWS[aba].render(el, DADOS, { rerender: () => { sujo.add(aba); renderAba(aba, true); pintaTabs(); }, recarrega, dev: DEV, agendaInfo: AGENDA });
  el.dataset.ok = DADOS.at + "|" + APRES.on + "|" + AGENDA.at; sujo.delete(aba);
  animaNumeros(el);
}
function renderTudo() { const { aba } = rota(); document.querySelectorAll("main > section.aba").forEach(s => { s.dataset.ok = ""; }); if (VIEWS[aba]) renderAba(aba, true); pintaTabs(); }
window.addEventListener("hashchange", mostra);

/* ---------- ficha ---------- */
let fichaAberta = "";
async function abreFicha(key) {
  const el = document.getElementById("ficha"); el.hidden = false; document.body.classList.add("modal");
  if (fichaAberta === key && el.dataset.at === DADOS.at) return;
  fichaAberta = key; el.dataset.at = DADOS.at;
  el.innerHTML = `<div class="ficha-in"><button class="fechar" id="fichaFechar" title="fechar">×</button><div id="fichaCorpo"><div class="vazio">abrindo…</div></div></div>`;
  el.querySelector("#fichaFechar").onclick = fechaFicha;
  const corpo = el.querySelector("#fichaCorpo");
  corpo.innerHTML = await fichaHTML(DADOS, key, IDX);
  completaFicha(corpo, DADOS, key);
}
function fechaFicha() {
  const el = document.getElementById("ficha"); if (el.hidden) return;
  el.hidden = true; document.body.classList.remove("modal"); fichaAberta = "";
  if (rota().aba === "ficha") { if (history.length > 1) history.back(); else location.hash = "#hoje"; }
}
document.addEventListener("click", async e => {
  const f = e.target.closest("[data-ficha]");
  if (f && !e.target.closest("a")) { e.preventDefault(); location.hash = "#ficha/" + f.dataset.ficha; return; }
  const g = e.target.closest("[data-go]"); if (g) { vaiPara(g.dataset.go); return; }
  const cp = e.target.closest("[data-copiar]"); if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copiar); toast("número copiado: " + T(cp.dataset.copiar)); } catch (x) {} }
  if (e.target.id === "ficha") fechaFicha();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") { fechaFicha(); document.getElementById("buscaRes").hidden = true; } });

/* ---------- busca ---------- */
const inp = document.getElementById("busca"), res = document.getElementById("buscaRes");
function pintaBusca() {
  const q = inp.value.trim(); if (q.length < 3) { res.hidden = true; return; }
  const r = busca(IDX, q);
  res.innerHTML = r.length ? r.map(e => `<div class="br" data-ficha="${e.key}"><b>${esc(T(e.proc))}</b><span>${esc(T(e.nome || "—"))}</span><small>${esc(e.comarca)} · ${e.cards.length} card(s)</small></div>`).join("") : `<div class="br vazio">nada encontrado para “${esc(q)}”</div>`;
  res.hidden = false;
}
inp.addEventListener("input", debounce(pintaBusca, 120));
inp.addEventListener("focus", pintaBusca);
inp.addEventListener("keydown", e => { if (e.key === "Enter") { const f = res.querySelector("[data-ficha]"); if (f) { location.hash = "#ficha/" + f.dataset.ficha; res.hidden = true; inp.blur(); } } });
document.addEventListener("click", e => { if (!e.target.closest(".busca")) res.hidden = true; });
res.addEventListener("click", () => { res.hidden = true; });

/* ---------- topo ---------- */
function stamp(txt, vivo) { document.getElementById("stampTxt").textContent = txt; document.getElementById("liveDot").className = vivo ? "on" : ""; }
function aviso(txt, cls = "") { const a = document.getElementById("aviso"); if (!txt) { a.hidden = true; return; } a.hidden = false; a.className = "aviso " + cls; a.innerHTML = txt; }
function toast(txt) { const t = document.getElementById("toast"); t.textContent = txt; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => { t.hidden = true; }, 2200); }
document.getElementById("btnApres").onclick = () => { ligaApres(!APRES.on); document.getElementById("btnApres").classList.toggle("on", APRES.on); toast(APRES.on ? "modo apresentação ligado — nomes e números ocultos" : "modo apresentação desligado"); renderTudo(); if (fichaAberta) { const k = fichaAberta; fichaAberta = ""; abreFicha(k); } };
document.getElementById("btnApres").classList.toggle("on", APRES.on);
document.getElementById("btnTema").onclick = () => { const t = document.documentElement.dataset.theme === "light" ? "dark" : "light"; document.documentElement.dataset.theme = t; lsSet("rpm.tema", t); };
document.getElementById("btnRefresh").onclick = () => recarrega();

/* ---------- tooltip dos gráficos ---------- */
const tip = document.getElementById("tip");
document.addEventListener("mouseover", e => { const m = e.target.closest("[data-tip]"); if (!m) { tip.hidden = true; return; } tip.textContent = m.dataset.tip; tip.hidden = false; });
document.addEventListener("mousemove", e => { if (tip.hidden) return; tip.style.left = Math.min(window.innerWidth - 240, e.clientX + 12) + "px"; tip.style.top = (e.clientY + 14) + "px"; });
document.addEventListener("touchstart", e => { const m = e.target.closest("[data-tip]"); if (!m) { tip.hidden = true; return; } tip.textContent = m.dataset.tip; tip.hidden = false; const t = e.touches[0]; tip.style.left = Math.min(window.innerWidth - 240, t.clientX + 8) + "px"; tip.style.top = (t.clientY + 12) + "px"; }, { passive: true });

/* ---------- dados ---------- */
function prepara(d) { sanearPrazos(d); d.agenda = AGENDA.eventos || []; indexaNomes(d); IDX = indexa(d); return d; }
async function carregaDev() {
  const r = await fetch("dev/fixture.json"); const d = await r.json(); d.at = new Date().toISOString();
  AGENDA = await carregaAgenda({ dev: true });
  DADOS = prepara(d); stamp("dados de TESTE (dev/fixture.json)", true); renderTudo();
}
async function recarrega({ soAgenda = false } = {}) {
  if (DEV) { if (soAgenda) { AGENDA = await carregaAgenda({ dev: true }); DADOS.agenda = AGENDA.eventos; renderTudo(); } return; }
  if (!soAgenda) {
    if (!temCred()) { stamp("sem chave do Trello", false); return; }
    if (carregando) return; carregando = true;
    document.getElementById("btnRefresh").classList.add("girando");
    try {
      const nova = await carregaQuadros();
      const ok = cargaConfiavel(nova, DADOS.at ? DADOS : await cargaSalva());
      if (!ok.ok) { aviso(`A carga nova veio incompleta (${esc(ok.motivo)}). Mantendo os dados de ${esc(brDataHora(DADOS.at))}.`, "warn"); }
      else {
        DADOS = prepara(nova); await guardaCarga(nova); aviso("");
        stamp("ao vivo · " + brDataHora(DADOS.at), true);
        const n = await esvaziaFila(DADOS); if (n) toast(`${n} anotação(ões) enviada(s) ao Trello`);
        renderTudo();
      }
    } catch (e) {
      const st = e.status;
      if (st === 401) aviso(`O Trello recusou a chave deste aparelho (401). Vá em <a href="#config">Configuração</a> e autorize de novo. Mostrando os dados de ${esc(brDataHora(DADOS.at) || "—")}.`, "crit");
      else aviso(`Sem resposta do Trello agora${navigator.onLine ? "" : " (você está sem internet)"}. Mostrando os dados de <b>${esc(brDataHora(DADOS.at) || "—")}</b>.`, "warn");
      stamp("dados de " + (brDataHora(DADOS.at) || "—"), false);
    } finally { carregando = false; document.getElementById("btnRefresh").classList.remove("girando"); }
  }
  const ag = await carregaAgenda();
  const mudou = ag.at !== AGENDA.at || ag.erro !== AGENDA.erro; AGENDA = ag; DADOS.agenda = ag.eventos || [];
  if (mudou) { sujo.add("hoje"); const { aba } = rota(); if (aba === "hoje" || aba === "config") renderAba(aba, true); }
  document.getElementById("agendaStamp").textContent = ag.erro ? "agenda: " + ag.erro : ag.at ? "agenda lida " + brDataHora(ag.at) : "";
}

/* token voltando do Trello: #token=xxx */
(function pegaToken() {
  const m = /[#&]token=([0-9a-f]{32,})/i.exec(location.hash);
  if (m) { const key = lsGet("rpm.keyTmp", ""); if (key) { salvaCred(key, m[1]); lsDel("rpm.keyTmp"); } history.replaceState(null, "", location.pathname + "#hoje"); }
})();

async function init() {
  pintaIcones();
  if (DEV) { await carregaDev(); mostra(); return; }
  const salva = await cargaSalva();
  if (salva) { DADOS = prepara(salva); stamp("dados de " + brDataHora(DADOS.at), false); }
  if (!temCred() && !salva) { location.hash = "#config"; }
  mostra();
  recarrega();
  setInterval(() => { if (document.visibilityState === "visible") recarrega(); }, APP.intervaloMin * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && DADOS.at && Date.now() - new Date(DADOS.at) > 2 * 60 * 1000) recarrega(); });
  window.addEventListener("online", () => recarrega());
  if ("serviceWorker" in navigator && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") navigator.serviceWorker.register("sw.js").catch(() => {});
}
init();
