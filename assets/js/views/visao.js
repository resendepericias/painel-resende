/* 📊 Visão geral — números e gráficos por comarca, por tema, por mês, valores a receber. */
import { TEMAS, L } from "../config.js";
import { esc, HOJE, diasAte, money, moneyCurto, MESES_CURTO, ico, somaDias } from "../util.js";
import { comarcaDe, comarcaBonita, valorDe, entregueEm, dataPericia } from "../parse.js";
import { pendentes, ehFeita, ehTriado, aceitas, agendadas, aCobrar, pjePendentes, prazoAgendar, urg, filas, vencidos } from "../regras.js";
import { rowHTML, tile, vazio } from "../ui.js";
import { hbar, colunas, pilha, rosca, CAT } from "../charts.js";

function mesesRel(de, ate) { const out = []; const base = new Date(HOJE().slice(0, 7) + "-15T12:00:00"); for (let i = de; i <= ate; i++) { const x = new Date(base); x.setMonth(x.getMonth() + i); out.push(x.toISOString().slice(0, 7)); } return out; }
const rotMes = m => { const x = new Date(m + "-15T12:00:00"); return MESES_CURTO[x.getMonth()] + "/" + m.slice(2, 4); };

export function render(el, d) {
  const hoje = HOJE(), pend = pendentes(d), F = filas(d);
  const atras = pend.filter(c => c.due && c.due < hoje), sem7 = pend.filter(c => c.due && c.due >= hoje && diasAte(c.due) <= 7), semPrazo = pend.filter(c => !c.due), urgs = pend.filter(urg);
  const feitas = d.laudos.filter(ehFeita), ac = aceitas(d), cob = aCobrar(d), cobTot = cob.reduce((s, c) => s + (valorDe(c) || 0), 0), travado = pend.reduce((s, c) => s + (valorDe(c) || 0), 0);
  const pjeP = pjePendentes(d), pjeVenc = pjeP.filter(c => !L.pjeLaudo.test(c.l) && c.due && c.due < hoje), pjeLaudoVenc = pjeP.filter(c => L.pjeLaudo.test(c.l) && c.due && c.due < hoje);
  const triado = pend.filter(ehTriado).length, aTriar = pend.filter(ehFeita).length;

  /* por tema */
  const porTema = [...TEMAS.map(t => [t, d.laudos.filter(c => c.l === t).length]), ["Perícia feita — ainda sem tema", aTriar], ["Fila HOJE / ENTREGAR", pend.filter(c => !TEMAS.includes(c.l) && !ehFeita(c)).length]].filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  /* por comarca: laudos pendentes e a receber */
  const comPend = {}; pend.forEach(c => { const k = comarcaDe(c); comPend[k] = (comPend[k] || 0) + 1; });
  const comCob = {}; cob.forEach(c => { const k = comarcaDe(c); comCob[k] = (comCob[k] || 0) + (valorDe(c) || 0); });
  /* por mês: entregues (FINANÇAS, [ENTREGUE dd/mm/aaaa]) últimos 6 · perícias marcadas próximos 6 · prazos de laudo vencendo próximos 6 */
  const entregues = d.financas.map(entregueEm).filter(Boolean);
  const mPass = mesesRel(-5, 0), mFut = mesesRel(0, 5);
  const colEnt = mPass.map(m => ({ label: rotMes(m), value: entregues.filter(x => x.slice(0, 7) === m).length, hint: `${entregues.filter(x => x.slice(0, 7) === m).length} laudo(s) entregue(s) em ${rotMes(m)}` }));
  const colPer = mFut.map(m => ({ label: rotMes(m), value: agendadas(d).filter(c => dataPericia(c).slice(0, 7) === m && dataPericia(c) >= hoje).length }));
  const colPrazo = mFut.map(m => ({ label: rotMes(m), value: F.laudo.filter(c => c.due && c.due >= hoje && c.due.slice(0, 7) === m).length, cor: "var(--warn)" }));

  let html = `<div class="tiles">
    ${tile("laudos", "crit", atras.length, "laudos atrasados", "documento")}
    ${tile("laudos", "warn", sem7.length, "vencem em 7 dias", "relogio")}
    ${tile("laudos", "warn", semPrazo.length, "sem prazo — conferir PJe", "lupa")}
    ${tile("pje", "crit", pjeVenc.length, "intimações vencidas (não é laudo)", "prancheta")}
    ${tile("pje", "warn", pjeLaudoVenc.length, "prazos de laudo vencidos no PJe", "notificacao")}
    ${tile("laudos", "info", feitas.length, "perícia feita → criar laudo", "pulso")}
    ${tile("agendar", "crit", ac.filter(prazoAgendar).length, "prazo p/ agendar vencido", "calendario")}
    ${tile("agendar", "acc", ac.length, "aceitas p/ agendar", "anexo")}
    ${tile("cobranca", "ok", moneyCurto(cobTot), `a receber (${cob.length} proc.)`, "trofeu")}
    ${tile("laudos", "info", moneyCurto(travado), "travado em laudos pendentes", "cadeado")}
  </div>`;
  if (urgs.length) html += `<section class="card crit-borda"><h2>${ico("notificacao")} Urgentíssimos — risco de destituição <span class="chip crit">${urgs.length}</span></h2>${urgs.sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1).map(c => rowHTML(c)).join("")}</section>`;

  html += `<div class="grade2">
    <section class="card"><h2>Laudos pendentes por tema</h2>${hbar(porTema.map(([t, n]) => ({ label: t, value: n })))}
      <div class="legend"><b>Total: ${pend.length} laudos a fazer</b> = ${triado} triados por tema/fila · ${aTriar} de perícia feita ainda sem tema. Meta 7/dia → ~${Math.ceil(pend.length / 7)} dias úteis. Complementares e impugnações não entram aqui.${d.prazosAnulados ? `<br>${d.prazosAnulados} card(s) tinham a data da perícia no lugar do prazo — estão como “conferir”, não como atrasados.` : ""}</div></section>
    <section class="card"><h2>Laudos pendentes por comarca</h2>${hbar(Object.entries(comPend).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => ({ label: comarcaBonita(k), value: n })))}</section>
    <section class="card"><h2>Laudos entregues por mês</h2>${colunas(colEnt)}<div class="legend">Contado pela data [ENTREGUE dd/mm/aaaa] dos cards de FINANÇAS.</div></section>
    <section class="card"><h2>Perícias marcadas por mês</h2>${colunas(colPer, { cor: CAT[1] })}</section>
    <section class="card"><h2>Prazos de laudo vencendo por mês</h2>${colunas(colPrazo)}<div class="legend">Só prazos futuros; os ${atras.length} atrasados estão fora.</div></section>
    <section class="card"><h2>A receber por comarca</h2>${hbar(Object.entries(comCob).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => ({ label: comarcaBonita(k), value: v, hint: `${comarcaBonita(k)}: ${money(v)}` })), { fmt: moneyCurto })}</section>
    <section class="card"><h2>Situação das pendências</h2><div class="roscas">
      ${rosca([{ label: "atrasados", value: atras.length, cor: "var(--crit)" }, { label: "vencem em 7 dias", value: sem7.length, cor: "var(--warn)" }, { label: "prazo futuro", value: pend.length - atras.length - sem7.length - semPrazo.length, cor: "var(--ok)" }, { label: "sem prazo", value: semPrazo.length, cor: "var(--muted)" }], pend.length, "laudos")}
      ${rosca([{ label: "vencidas", value: pjeVenc.length + pjeLaudoVenc.length, cor: "var(--crit)" }, { label: "no prazo", value: pjeP.length - pjeVenc.length - pjeLaudoVenc.length, cor: "var(--cyan)" }], pjeP.length, "intimações")}
      ${rosca([{ label: "agendadas", value: agendadas(d).length, cor: "var(--gold)" }, { label: "a agendar", value: ac.length, cor: "var(--muted)" }], agendadas(d).length + ac.length, "processos")}
    </div></section>
    <section class="card"><h2>O caminho do card</h2><div class="note"><b>PROCESSOS</b> (aceite → agendada) → <b>PAINEL LAUDOS</b> (perícia feita → tema → entregue) → <b>FINANÇAS</b> (entregue → cobrado → ordem → pago). Se vier impugnação, volta ao PAINEL LAUDOS e depois retorna às finanças. É sempre o mesmo card andando de quadro em quadro — sem cópia e sem duplicata.</div></section>
  </div>`;
  el.innerHTML = html;
}
