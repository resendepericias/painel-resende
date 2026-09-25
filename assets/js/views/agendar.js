/* 📆 Agendar — quadro PROCESSOS: onde o card nasce no aceite e vive até a perícia acontecer. */
import { L } from "../config.js";
import { esc, HOJE, ico, MESES_CURTO } from "../util.js";
import { comarcaDe, comarcaBonita, dataPericia, processoDe, procKey } from "../parse.js";
import { aceitas, agendadas, prazoAgendar } from "../regras.js";
import { rowHTML, vazio, secao } from "../ui.js";
import { colunas } from "../charts.js";
import { T } from "../apresentacao.js";

export function render(el, d) {
  const hoje = HOJE();
  const ac = aceitas(d), agVenc = ac.filter(prazoAgendar).sort((a, b) => a.due < b.due ? -1 : 1), aceitasOk = ac.filter(c => !prazoAgendar(c));
  const ag = agendadas(d), juizo = d.processos.filter(c => L.juizo.test(c.l)), ligar = d.processos.filter(c => L.ligar.test(c.l) && procKey(c));
  const pjeAg = d.pje.filter(c => L.pjeAg.test(c.l)).sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1);
  const futuras = ag.filter(c => { const p = dataPericia(c); return p && p >= hoje; }).sort((a, b) => dataPericia(a) < dataPericia(b) ? -1 : 1);
  const semData = ag.filter(c => !dataPericia(c) || dataPericia(c) < hoje);
  const porComarca = {}; for (const c of aceitasOk) { const k = comarcaDe(c); (porComarca[k] = porComarca[k] || []).push(c); }
  const ordem = Object.keys(porComarca).sort((a, b) => porComarca[b].length - porComarca[a].length);
  /* perícias marcadas por mês (próximos 6 meses) */
  const meses = []; for (let i = 0; i < 6; i++) { const x = new Date(hoje.slice(0, 7) + "-15T12:00:00"); x.setMonth(x.getMonth() + i); meses.push(x.toISOString().slice(0, 7)); }
  const porMes = meses.map(m => { const n = futuras.filter(c => dataPericia(c).slice(0, 7) === m).length; const x = new Date(m + "-15T12:00:00"); return { label: MESES_CURTO[x.getMonth()] + "/" + m.slice(2, 4), value: n, hint: `${n} perícia(s) marcada(s) em ${MESES_CURTO[x.getMonth()]}/${m.slice(0, 4)}` }; });
  /* por dia, agrupado, para a lista de marcadas */
  let ultimo = ""; const listaFut = futuras.map(c => { const p = dataPericia(c); const cab = p !== ultimo ? `<h3>${esc(new Date(p + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }))}</h3>` : ""; ultimo = p; return cab + rowHTML(c, { sev: "neut", dataAlt: p }); }).join("");

  el.innerHTML = `<div class="note">Quadro <b>PROCESSOS — ACEITES E AGENDAMENTOS</b>. O due das listas ACEITAS é prazo para <i>designar</i>; só conta como vencido com o marcador <b>INTIMADA P/ AGENDAR</b>. Nas listas 🗓️ de comarca, o due é a data da própria perícia.</div>
    ${agVenc.length ? secao(`${ico("notificacao")} Intimada para agendar — prazo vencido`, agVenc.map(c => rowHTML(c, { sev: "crit" })).join(""), { cls: "crit-borda", n: agVenc.length, nCls: "crit", sub: "O juízo mandou designar e o prazo passou. Não aparece na fila de laudo porque ainda não há laudo a fazer — a pendência é <b>agendar</b>." }) : ""}
    ${pjeAg.length ? secao(`${ico("prancheta")} Intimações para designar perícia (PJe / eproc)`, pjeAg.map(c => rowHTML(c, { noComarca: true })).join(""), { n: pjeAg.length }) : ""}
    ${ligar.length ? secao(`${ico("megafone")} Ligar para a vara — oferecer perícias`, ligar.map(c => rowHTML(c, { sev: "neut" })).join(""), { n: ligar.length }) : ""}
    <section class="card"><h2>${ico("calendario")} Perícias marcadas <span class="chip">${futuras.length}</span></h2>
      ${colunas(porMes, { h: 150 })}
      ${listaFut || vazio("nenhuma perícia futura com data no título")}
      ${semData.length ? `<div class="legend">${semData.length} card(s) na lista de agendadas sem data legível no título ou com data passada — conferir: ${semData.slice(0, 4).map(c => esc(T(processoDe(c) || c.n.slice(0, 30)))).join(" · ")}${semData.length > 4 ? " …" : ""}</div>` : ""}</section>
    ${juizo.length ? secao(`${ico("relogio")} Aguarda juízo (majoração / redesignação)`, juizo.map(c => rowHTML(c, { sev: "neut" })).join(""), { n: juizo.length }) : ""}
    <section class="card"><h2>${ico("anexo")} Aceitas aguardando agendamento <span class="chip">${aceitasOk.length}</span></h2>
      <div class="note">Agendar em bloco por comarca rende mais. A maioria é JESP Muriaé.</div>
      ${ordem.map(k => `<details ${porComarca[k].length < 30 ? "open" : ""}><summary><h3>${esc(comarcaBonita(k))} — ${porComarca[k].length}</h3></summary>${porComarca[k].map(c => rowHTML(c, { sev: "neut", noComarca: true })).join("")}</details>`).join("")}</section>`;
}
