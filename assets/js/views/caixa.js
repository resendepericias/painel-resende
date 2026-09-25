/* 📝 Caixa do dia — o que ela anotar vira card na lista "Caixa do dia" do Trello; a rodada das 8h aplica nos quadros. */
import { CX_CATS } from "../config.js";
import { esc, brDataHora, ico, lsGet, lsSet } from "../util.js";
import { anotaCaixa, apagaCardCaixa, cardsCaixa, temCred } from "../trello.js";
import { T } from "../apresentacao.js";
import { vazio } from "../ui.js";

const FILA = "rpm.caixaFila";                 // anotações feitas sem internet, enviadas na próxima carga
const st = { draft: "", cat: "", enviando: false, erro: "" };
const cxProc = t => { const m = /\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}|\b\d{20}\b/.exec(t || ""); return m ? m[0] : ""; };
export const filaLocal = () => lsGet(FILA, []);

/** tenta enviar o que ficou na fila local (chamado a cada carga) */
export async function esvaziaFila(d) {
  const fila = filaLocal(); if (!fila.length || !temCred()) return 0;
  let n = 0; const resto = [];
  for (const it of fila) { try { const c = await anotaCaixa(d, it.t, it.catNome, it.proc); d.laudos.push(c); n++; } catch (e) { resto.push(it); } }
  lsSet(FILA, resto); return n;
}

export function render(el, d, { rerender, dev }) {
  const { pend, ok, lista } = cardsCaixa(d);
  const fila = filaLocal();
  const linha = (c, aplicado) => `<div class="cx-item${aplicado ? " ap" : ""}">
      <div class="h">${esc(brDataHora(c.at))}</div>
      <div class="txt">${esc(T(c.n.replace(/^\[[^\]]*\]\s*/, "")))}${aplicado ? `<div class="cx-nota">${ico("like")} aplicado no Trello</div>` : ""}</div>
      ${aplicado ? "" : `<a class="go" href="${esc(c.u)}" target="_blank" rel="noopener" title="abrir no Trello">${ico("seta")}</a><button class="x" data-del="${esc(c.id)}" title="apagar anotação">×</button>`}
    </div>`;
  el.innerHTML = `<section class="card cx-form">
      <h2>${ico("comentario")} O que eu já fiz — para lançar no Trello</h2>
      <div class="note">Anote na hora, sem se preocupar com formato. Cada anotação vira um card na lista <b>📝 CAIXA DO DIA</b> do quadro PAINEL LAUDOS. Na rodada das 8h o Claude lança tudo nos quadros (PROCESSOS, PAINEL LAUDOS, PJE/EPROC e FINANÇAS) e move o card para <b>✅ CAIXA — APLICADAS</b>. O que não der para aplicar com segurança fica pendente e reaparece. Escreva o número do processo sempre que der.</div>
      <div class="cx-cats" id="cxCats">${CX_CATS.map(([k, l, i]) => `<button data-cat="${k}" class="${st.cat === k ? "on" : ""}">${ico(i)} ${esc(l)}</button>`).join("")}</div>
      <textarea id="cxTxt" placeholder="ex.: laudo do 5002335-03.2026.8.13.0439 entregue hoje&#10;peticionei majoração no 5001234-56.2025.8.13.0439&#10;perícia da dona Maria não compareceu">${esc(st.draft)}</textarea>
      <div class="cx-acts">
        <button class="btn pri" id="cxAdd" ${st.enviando ? "disabled" : ""}>${st.enviando ? "enviando…" : "Anotar no Trello"}</button>
        <span class="hint">Ctrl+Enter anota${temCred() || dev ? "" : " · sem chave do Trello: fica guardado neste aparelho até conectar"}${st.erro ? ` · <b class="crit-txt">${esc(st.erro)}</b>` : ""}</span>
      </div>
    </section>
    ${fila.length ? `<section class="card"><h2>${ico("salvar")} Guardadas neste aparelho <span class="chip warn">${fila.length}</span></h2><div class="note">Sem conexão na hora. Serão enviadas ao Trello na próxima atualização.</div>
      ${fila.map(i => `<div class="cx-item"><div class="h">${esc(brDataHora(i.at))}</div><div class="txt">${esc(T(i.t))}</div></div>`).join("")}</section>` : ""}
    <section class="card"><h2>${ico("relogio")} Aguardando a rodada das 8h <span class="chip ${pend.length ? "warn" : ""}">${pend.length}</span></h2>
      ${pend.length ? pend.map(c => linha(c, false)).join("") : vazio(lista ? "nada anotado ainda" : "a lista 📝 CAIXA DO DIA será criada no Trello na primeira anotação")}</section>
    ${ok.length ? `<section class="card"><h2>${ico("like")} Já aplicado no Trello <span class="chip ok">${ok.length}</span></h2>${ok.map(c => linha(c, true)).join("")}</section>` : ""}`;

  const ta = el.querySelector("#cxTxt");
  ta.oninput = e => { st.draft = e.target.value; };
  ta.onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); anota(); } };
  el.querySelectorAll("#cxCats button").forEach(b => b.onclick = () => { st.cat = st.cat === b.dataset.cat ? "" : b.dataset.cat; el.querySelectorAll("#cxCats button").forEach(x => x.classList.toggle("on", x.dataset.cat === st.cat)); ta.focus(); });
  el.querySelector("#cxAdd").onclick = anota;
  el.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Apagar esta anotação do Trello?")) return;
    try { await apagaCardCaixa(b.dataset.del); d.laudos = d.laudos.filter(c => c.id !== b.dataset.del); rerender(); } catch (e) { st.erro = "não consegui apagar"; rerender(); }
  });

  async function anota() {
    const t = (st.draft || "").trim(); if (!t) return;
    const cat = CX_CATS.find(x => x[0] === st.cat); const catNome = cat ? cat[1] : ""; const proc = cxProc(t);
    st.erro = "";
    if (dev) { d.laudos.push({ id: "dev-" + Date.now(), n: `[teste] ${catNome ? catNome + " — " : ""}${t}`, desc: t, u: "", l: "📝 CAIXA DO DIA", lid: (d.listas.laudos.find(l => /CAIXA DO DIA/i.test(l.name)) || {}).id, q: "laudos", at: new Date().toISOString(), lb: [] }); st.draft = ""; st.cat = ""; rerender(); return; }
    if (!temCred() || !navigator.onLine) { lsSet(FILA, [...filaLocal(), { t, catNome, proc, at: new Date().toISOString() }]); st.draft = ""; st.cat = ""; rerender(); return; }
    st.enviando = true; rerender();
    try { const c = await anotaCaixa(d, t, catNome, proc); d.laudos.push(c); st.draft = ""; st.cat = ""; }
    catch (e) { lsSet(FILA, [...filaLocal(), { t, catNome, proc, at: new Date().toISOString() }]); st.erro = "Trello não respondeu — guardei neste aparelho"; st.draft = ""; }
    st.enviando = false; rerender();
  }
}
