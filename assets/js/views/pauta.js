/* 🗓️ Agenda — perícias já marcadas (25/11/2026: saíram da aba Agendar, que agora só conta o que falta agendar). */
import { esc, HOJE, ico, MESES_CURTO } from "../util.js";
import { agendaMarcada } from "../regras.js";
import { rowHTML, vazio } from "../ui.js";
import { colunas } from "../charts.js";

export function render(el, d) {
  const hoje = HOJE(), lista = agendaMarcada(d);
  const meses = []; for (let i = 0; i < 6; i++) { const x = new Date(hoje.slice(0, 7) + "-15T12:00:00"); x.setMonth(x.getMonth() + i); meses.push(x.toISOString().slice(0, 7)); }
  const porMes = meses.map(m => { const n = lista.filter(x => x.dia.slice(0, 7) === m).length; const x = new Date(m + "-15T12:00:00"); return { label: MESES_CURTO[x.getMonth()] + "/" + m.slice(2, 4), value: n, hint: `${n} perícia(s) em ${MESES_CURTO[x.getMonth()]}/${m.slice(0, 4)}` }; });
  /* agrupado por mês (fechado) e por dia dentro do mês */
  const grupos = {}; for (const x of lista) (grupos[x.dia.slice(0, 7)] = grupos[x.dia.slice(0, 7)] || []).push(x);
  const blocos = Object.keys(grupos).sort().map((m, i) => {
    let ult = ""; const linhas = grupos[m].map(({ c, dia, soAgenda }) => { const cab = dia !== ult ? `<h3>${esc(new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }))}</h3>` : ""; ult = dia; return cab + rowHTML(c, { sev: "neut", dataAlt: dia, marcar: !soAgenda, /* 25/11/2026: botões em toda perícia de hoje em diante — ela marca ao fim do dia de perícia */ extra: soAgenda ? '<span class="chip warn">só na Google Agenda — mover card</span>' : "" }); }).join("");
    const x = new Date(m + "-15T12:00:00");
    return `<details ${i === 0 ? "open" : ""}><summary><h3>${MESES_CURTO[x.getMonth()]}/${m.slice(0, 4)} — ${grupos[m].length} perícia(s)</h3></summary>${linhas}</details>`;
  }).join("");
  el.innerHTML = `<div class="note">Perícias já marcadas, de hoje em diante. Ao terminar as perícias do dia, marque cada uma: <b>✓ feita</b> manda o card para PERÍCIA FEITA (laudo a fazer); <b>✗ faltou</b> manda para NÃO COMPARECEU. Fonte: listas 🗓️ AGENDADAS do quadro PROCESSOS (data no título) e aceites cujo processo já está na Google Agenda.</div>
    <section class="card"><h2>${ico("calendario")} Perícias marcadas <span class="chip">${lista.length}</span></h2>${colunas(porMes, { h: 150 })}${blocos || vazio("nenhuma perícia futura marcada")}</section>`;
}
