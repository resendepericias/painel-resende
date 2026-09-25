/* 🔎 Busca de processo + ficha completa.
   Digita número (com ou sem pontuação) ou nome do periciado → ficha com tudo o que há sobre o processo nos quatro quadros. */
import { QUADROS, CONSULTA } from "../config.js";
import { esc, brDate, brDataHoraLonga, money, semAcento, digitos, ico, HOJE, diasAte } from "../util.js";
import { parseCard, procKey, formataProc, comarcaBonita, acompanhamento, historicoCobrancas, ordemPagamento, statusDesc, linksDe, periciadoDe, periciadoDesc, valorDe } from "../parse.js";
import { situacaoFin, diasParado, sevDe } from "../regras.js";
import { detalheCard, temCred } from "../trello.js";
import { chip, chipsLabels, vazio } from "../ui.js";
import { T, APRES } from "../apresentacao.js";

const ORDEM_Q = ["processos", "laudos", "pje", "financas"];

/** índice de busca: [{key, proc, nome, comarca, cards:[...]}] */
export function indexa(d) {
  const map = new Map();
  for (const q of ORDEM_Q) for (const c of (d[q] || [])) {
    const k = procKey(c); if (!k || k.length < 16) continue;
    let e = map.get(k); if (!e) { e = { key: k, proc: formataProc(k), nomes: new Set(), nomeDesc: "", nomeTit: "", comarca: "", cards: [] }; map.set(k, e); }
    e.cards.push(c);
    const pd = periciadoDesc(c); if (pd) { e.nomes.add(pd); if (!e.nomeDesc) e.nomeDesc = pd; }
    const pt = periciadoDe(c); if (pt) { e.nomes.add(pt); if (c.q !== "pje" && pt.length > e.nomeTit.length) e.nomeTit = pt; }
    if (!e.comarca) e.comarca = comarcaBonita(parseCard(c).comarca);
  }
  /* nome: o da descrição vale mais; depois o do título dos quadros de laudo/processos; por último o do PJE */
  const arr = [...map.values()].map(e => ({ ...e, nome: e.nomeDesc || e.nomeTit || [...e.nomes].sort((a, b) => b.length - a.length)[0] || "", nomesN: [...e.nomes].map(semAcento).join(" | ") }));
  return arr;
}
export function busca(idx, q) {
  const qd = digitos(q), qn = semAcento(q.trim());
  if (!qd && qn.length < 3) return [];
  const out = [];
  for (const e of idx) {
    let pts = 0;
    if (qd.length >= 4 && e.key.includes(qd)) pts = e.key.startsWith(qd) ? 3 : 2;
    else if (qn.length >= 3 && !/^\d+$/.test(qn) && e.nomesN.includes(qn)) pts = 1;
    if (pts) out.push([pts, e]);
  }
  return out.sort((a, b) => b[0] - a[0]).slice(0, 12).map(x => x[1]);
}

const md = s => esc(s || "").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/_([^_\n]+)_/g, "<i>$1</i>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, "<br>");
const quadroNome = q => QUADROS[q] ? QUADROS[q].nome : q;

/** HTML da ficha de um processo (key = dígitos) */
export async function fichaHTML(d, key, idx) {
  const e = (idx || indexa(d)).find(x => x.key === key);
  if (!e) return `<div class="ficha-cab"><h2>Processo não encontrado</h2></div><div class="note">Nenhum card nos quatro quadros com o número ${esc(T(formataProc(key)))}.</div>`;
  const cards = e.cards.slice().sort((a, b) => ORDEM_Q.indexOf(a.q) - ORDEM_Q.indexOf(b.q));
  const P = cards.map(parseCard);
  const valor = P.map(p => p.valor).find(v => v) || null;
  const comarca = P.map(p => p.comarca).find(c => c && c !== "OUTRA") || "OUTRA";
  const vara = P.map(p => p.vara).find(Boolean) || "";
  const sistema = P.map(p => p.sistema).find(Boolean) || "";
  const perici = P.map(p => p.dataPericia).filter(Boolean).sort().pop() || "";
  const hora = P.map(p => p.hora).find(Boolean) || "";
  const entregue = P.map(p => p.entregue).find(Boolean) || "";
  /* andamento: o bloco ACOMPANHAMENTO mais recente entre os cards */
  const acs = cards.map(c => ({ c, a: acompanhamento(c.desc) })).filter(x => x.a).sort((x, y) => (x.a.em.split("/").reverse().join("") < y.a.em.split("/").reverse().join("") ? 1 : -1));
  const ac = acs[0] ? acs[0].a : null;
  const finC = cards.find(c => c.q === "financas"); const pjeC = cards.filter(c => c.q === "pje").sort((a, b) => (a.due || "0") < (b.due || "0") ? 1 : -1);
  const hist = finC ? historicoCobrancas(finC.desc) : []; const ordem = finC ? ordemPagamento(finC.desc) : "";
  const links = linksDe(cards.map(c => c.desc).join("\n"));
  const principal = cards.find(c => c.q === "laudos") || cards.find(c => c.q === "processos") || cards[0];
  const nome = e.nome;

  let h = `<div class="ficha-cab">
    <div class="ficha-num">${ico("lupa")} <b>${esc(T(e.proc))}</b> <button class="tb mini-btn" data-copiar="${esc(e.proc)}" title="copiar número">copiar</button></div>
    <h2>${esc(T(nome || "periciado não identificado"))}</h2>
    <div class="ficha-meta">${chip(comarcaBonita(comarca))}${vara ? chip(vara) : ""}${sistema ? chip(sistema, "info") : ""}${valor ? chip(money(valor), "ok") : chip("sem valor lançado", "warn")}${perici ? chip("perícia " + brDate(perici, true) + (hora ? " " + hora : ""), perici >= HOJE() ? "warn" : "")  : ""}${entregue ? chip("entregue " + brDate(entregue, true), "ok") : ""}</div>
  </div>`;

  /* onde está */
  h += `<section class="fs"><h3>${ico("anexo")} Onde está</h3>${cards.map(c => `<div class="onde ${sevDe(c)}"><div class="q">${esc(quadroNome(c.q))}</div><div class="l">${esc(c.l)}${c.due ? ` · <b>${c.due < HOJE() ? "venceu" : "vence"} ${brDate(c.due, true)}</b>` : ""}</div><div class="nm">${esc(T(c.n))}</div><div class="sub">${chipsLabels(c)}</div><a class="go" href="${esc(c.u)}" target="_blank" rel="noopener">abrir no Trello ${ico("seta")}</a></div>`).join("")}</section>`;

  /* andamento */
  h += `<section class="fs"><h3>${ico("pulso")} Situação / andamento</h3>${ac ? `<div class="kv"><div><span>Situação em ${esc(ac.em)}</span>${esc(T(ac.situacao))}</div>${ac.ultimo ? `<div><span>Último movimento</span>${esc(T(ac.ultimo))}</div>` : ""}${ac.fonte ? `<div><span>Fonte</span>${esc(ac.fonte)}</div>` : ""}${ac.proxima ? `<div><span>Próxima providência</span><b>${esc(ac.proxima)}</b></div>` : ""}</div>` : vazio("sem bloco ACOMPANHAMENTO PROCESSUAL — a rodada de domingo preenche")}
    ${finC && statusDesc(finC.desc) ? `<div class="kv"><div><span>Status financeiro</span>${esc(T(statusDesc(finC.desc)))}</div></div>` : ""}</section>`;

  /* prazos e intimações (PJE) */
  h += `<section class="fs"><h3>${ico("prancheta")} Prazos e intimações — quadro PJE / EPROC</h3>${pjeC.length ? pjeC.map(c => `<div class="onde ${sevDe(c)}"><div class="l">${esc(c.l)}${c.due ? ` · <b>${brDate(c.due, true)}</b> (${c.due < HOJE() ? -diasAte(c.due) + " dias vencido" : diasAte(c.due) === 0 ? "vence hoje" : "em " + diasAte(c.due) + " dias"})` : ""}</div><div class="nm">${esc(T(c.n))}</div><a class="go" href="${esc(c.u)}" target="_blank" rel="noopener">abrir ${ico("seta")}</a></div>`).join("") : vazio("nenhuma intimação registrada para este processo")}</section>`;

  /* cobrança */
  h += `<section class="fs"><h3>${ico("trofeu")} Cobrança e pagamento</h3>${finC ? `<div class="kv"><div><span>Situação</span>${chip(situacaoFin(finC).nome, situacaoFin(finC).cls)}${diasParado(finC) != null ? chip(diasParado(finC) + " dias parado", diasParado(finC) > 60 ? "crit" : "") : ""}</div>${ordem ? `<div><span>Ordem de pagamento</span>${esc(ordem)}</div>` : ""}</div>
    ${hist.length ? `<div class="hist"><span>Histórico de cobranças</span><ol>${hist.map(x => `<li><b>${esc(x.data)}</b> ${esc(T(x.o))}</li>`).join("")}</ol></div>` : `<div class="legend">nenhuma cobrança registrada no card</div>`}` : vazio("ainda não está no quadro FINANÇAS (laudo não protocolado)")}</section>`;

  /* links */
  const l = [...links.pje.map(u => ["PJe", u]), ...links.eproc.map(u => ["eproc", u])];
  h += `<section class="fs"><h3>${ico("seta")} Links</h3><div class="links">${l.map(([n, u]) => `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}: abrir o processo</a>`).join("")}
    <a class="btn" href="${CONSULTA.pjeHome}" target="_blank" rel="noopener" data-copiar="${esc(e.proc)}">${ico("cadeado")} entrar no PJe (copia o número)</a>
    <a class="btn" href="${CONSULTA.eprocHome}" target="_blank" rel="noopener" data-copiar="${esc(e.proc)}">${ico("cadeado")} entrar no eproc (copia o número)</a>
    <a class="btn sec" href="${CONSULTA.pje}" target="_blank" rel="noopener" data-copiar="${esc(e.proc)}">consulta pública PJe</a>
    <a class="btn sec" href="${CONSULTA.eproc}" target="_blank" rel="noopener" data-copiar="${esc(e.proc)}">consulta pública eproc</a>
    ${cards.map(c => `<a class="btn sec" href="${esc(c.u)}" target="_blank" rel="noopener">Trello · ${esc(quadroNome(c.q).split(" ")[0])}</a>`).join("")}</div></section>`;

  /* tudo o que está escrito nos cards */
  h += `<section class="fs"><h3>${ico("documento")} Tudo o que está escrito nos cards</h3>${cards.map(c => `<details ${c === principal ? "open" : ""}><summary>${esc(quadroNome(c.q))} — ${esc(c.l)}</summary><div class="desc">${c.desc ? (APRES.on ? "<i>conteúdo oculto no modo apresentação</i>" : md(c.desc)) : "<i>sem descrição</i>"}</div><div class="extra" data-detalhe="${esc(c.id)}"></div></details>`).join("")}</section>`;
  return h;
}

/** completa a ficha com anexos, comentários e checklists (busca ao vivo, card a card) */
export async function completaFicha(el, d, key) {
  if (!temCred()) return;
  const boxes = el.querySelectorAll("[data-detalhe]");
  for (const box of boxes) {
    try {
      const det = await detalheCard(box.dataset.detalhe);
      let h = "";
      if (det.checklists.length) h += det.checklists.map(k => `<div class="ck"><b>${esc(k.nome)}</b><ul>${k.itens.map(i => `<li class="${i.feito ? "ok" : ""}">${i.feito ? "☑" : "☐"} ${esc(T(i.nome))}</li>`).join("")}</ul></div>`).join("");
      if (det.anexos.length) h += `<div class="ck"><b>Anexos</b><ul>${det.anexos.map(a => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.nome || a.url)}</a></li>`).join("")}</ul></div>`;
      if (det.comentarios.length) h += `<div class="ck"><b>Comentários</b>${det.comentarios.map(c => `<div class="com"><small>${esc(brDataHoraLonga(c.em))}</small>${APRES.on ? "<i>oculto</i>" : md(c.texto)}</div>`).join("")}</div>`;
      box.innerHTML = h;
      /* links de PJe/eproc que só existem em anexo */
      const lk = linksDe("", det.anexos); const links = el.querySelector(".links");
      if (links) for (const [n, arr] of [["PJe", lk.pje], ["eproc", lk.eproc]]) for (const u of arr) if (!links.querySelector(`a[href="${u}"]`)) links.insertAdjacentHTML("afterbegin", `<a class="btn" href="${esc(u)}" target="_blank" rel="noopener">${n}: abrir (anexo)</a>`);
    } catch (e) { box.innerHTML = `<div class="legend">detalhes do card não carregaram agora</div>`; }
  }
}
