/* 📆 Agendar — SÓ o que ela tem de agendar agora (25/11/2026).
   A conta da aba é: intimação para designar (PJE 📆 AGENDAR PERICIA) + aceita com prazo/intimação no título.
   Perícia já marcada foi para a aba Agenda. Aceita sem intimação e "aguarda juízo" ficam fechadas, fora da conta. */
import { esc, ico } from "../util.js";
import { comarcaDe, comarcaBonita, procKey } from "../parse.js";
import { agendarReal } from "../regras.js";
import { L } from "../config.js";
import { rowHTML, vazio, secao } from "../ui.js";

const porPrazo = (a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1;
function fechado(titulo, arr, sub) {
  if (!arr.length) return "";
  const porCom = {}; for (const c of arr) { const k = comarcaDe(c); (porCom[k] = porCom[k] || []).push(c); }
  const ordem = Object.keys(porCom).sort((a, b) => porCom[b].length - porCom[a].length);
  return `<section class="card"><details><summary><h2>${titulo} <span class="chip">${arr.length}</span></h2></summary>
    ${sub ? `<div class="note">${sub}</div>` : ""}
    ${ordem.map(k => `<details><summary><h3>${esc(comarcaBonita(k))} — ${porCom[k].length}</h3></summary>${porCom[k].map(c => rowHTML(c, { sev: "neut", noComarca: true })).join("")}</details>`).join("")}
  </details></section>`;
}

export function render(el, d) {
  const R = agendarReal(d), fazer = R.fazer.slice().sort(porPrazo);
  const ligar = d.processos.filter(c => L.ligar.test(c.l) && procKey(c));
  el.innerHTML = `<div class="note">O número desta aba é só o que <b>você precisa agendar agora</b>: intimação para designar data e aceite com prazo. Perícia já marcada está na aba <a href="#pauta">Agenda</a>. Aceite que ainda espera o juízo fica guardado abaixo, fechado, sem entrar na conta.</div>
    ${secao(`${ico("calendario")} Para agendar agora`, fazer.map(c => rowHTML(c, { extra: R.pjeAg.includes(c) ? '<span class="chip info">intimação PJe</span>' : "" })).join("") || vazio("nada para agendar agora"), { cls: fazer.length ? "crit-borda" : "", n: fazer.length, nCls: fazer.length ? "crit" : "", sub: "Ordenado por prazo. Ao agendar, anote na Caixa do dia — a rodada move o card para a lista da comarca." })}
    ${ligar.length ? secao(`${ico("megafone")} Ligar para a vara — oferecer perícias`, ligar.map(c => rowHTML(c, { sev: "neut" })).join(""), { n: ligar.length }) : ""}
    ${fechado(`${ico("relogio")} Aguardando o juízo (designar, majoração, decisão)`, R.juizo, "Não depende de você agora. Entra na conta quando chegar intimação.")}
    ${fechado(`${ico("anexo")} Aceitas — ainda sem intimação para agendar`, R.aguarda, "Aceite dado, sem intimação nem prazo. Se quiser adiantar em bloco (ex.: JESP Muriaé), está aqui.")}
    ${fechado(`${ico("cadeado")} Canceladas — arquivar no Trello`, R.cancelada, "")}`;
}
