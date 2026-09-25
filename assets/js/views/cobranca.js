/* 💰 Cobrança — quadro FINANÇAS 2026. Laudo protocolado entra aqui e só sai quando o dinheiro cai. */
import { L } from "../config.js";
import { esc, money, moneyCurto, ico } from "../util.js";
import { comarcaDe, comarcaBonita, valorDe } from "../parse.js";
import { fin, aCobrar, diasParado } from "../regras.js";
import { rowHTML, vazio, chip } from "../ui.js";
import { hbar, pilha } from "../charts.js";

export function render(el, d) {
  const semCob = fin(d, L.semCob), cobrado = fin(d, L.cobrado), ordem = fin(d, L.ordem), naoEf = fin(d, L.naoEf), pago = fin(d, L.pagoMes), ajg = fin(d, L.ajg), hist = fin(d, L.hist);
  const soma = a => a.reduce((s, c) => s + (valorDe(c) || 0), 0);
  const cob = aCobrar(d), tot = soma(cob), semV = cob.filter(c => !valorDe(c)).length;
  const honPje = d.pje.filter(c => L.pjeHon.test(c.l) && !L.pjeResp.test(c.l));
  const porComarca = {}; for (const c of cob) { const k = comarcaDe(c); porComarca[k] = porComarca[k] || { n: 0, v: 0 }; porComarca[k].n++; porComarca[k].v += (valorDe(c) || 0); }
  const ranking = Object.entries(porComarca).sort((a, b) => b[1].v - a[1].v);
  const extraParado = c => { const p = diasParado(c); return p == null ? "" : chip(`${p} dias parado`, p > 60 ? "crit" : p > 30 ? "warn" : ""); };
  const lista = (arr, sev) => arr.slice().sort((a, b) => (diasParado(b) || 0) - (diasParado(a) || 0)).map(c => rowHTML(c, { sev, extra: extraParado(c) })).join("") || vazio("nenhum");
  const bloco = (titulo, arr, sev, sub, aberto = true) => `<section class="card"><details ${aberto ? "open" : ""}><summary><h2>${titulo} <span class="chip">${arr.length}</span> <span class="chip ok">${money(soma(arr))}</span></h2></summary>${sub ? `<div class="note">${sub}</div>` : ""}${lista(arr, sev)}</details></section>`;

  el.innerHTML = `<div class="note">Dias parado contados da última cobrança, ou da entrega se nunca cobrou. Valor sem valor lançado fica em branco — nunca inventado.</div>
    <div class="tiles">
      <div class="tile ok">${ico("trofeu", "tile-ico")}<div class="k">${moneyCurto(tot)}</div><div class="t">total a receber (${cob.length} proc.)</div></div>
      <div class="tile warn">${ico("email", "tile-ico")}<div class="k">${semCob.length}</div><div class="t">entregues ainda sem cobrança</div></div>
      <div class="tile info">${ico("relogio", "tile-ico")}<div class="k">${cobrado.length}</div><div class="t">cobrados, aguardando ordem</div></div>
      <div class="tile crit">${ico("notificacao", "tile-ico")}<div class="k">${naoEf.length}</div><div class="t">ordem não efetivada</div></div>
      <div class="tile warn">${ico("lupa", "tile-ico")}<div class="k">${semV}</div><div class="t">sem valor lançado</div></div>
      <div class="tile acc">${ico("like", "tile-ico")}<div class="k">${pago.length}</div><div class="t">pagos no mês</div></div>
    </div>
    <div class="grade2">
      <section class="card"><h2>A receber — por situação</h2>
        ${pilha([{ label: "Entregue sem cobrança", value: soma(semCob), cor: "var(--muted)" }, { label: "Cobrado", value: soma(cobrado), cor: "var(--gold)" }, { label: "Ordem expedida", value: soma(ordem), cor: "var(--cyan)" }, { label: "Ordem não efetivada", value: soma(naoEf), cor: "var(--crit)" }], { fmt: moneyCurto })}
        <div class="legend">Soma só dos cards com valor lançado. ${semV ? `${semV} card(s) sem valor ficam fora da soma.` : ""}</div></section>
      <section class="card"><h2>Quem está devendo mais — por comarca</h2>
        ${hbar(ranking.map(([k, o]) => ({ label: `${comarcaBonita(k)} (${o.n})`, value: o.v, hint: `${comarcaBonita(k)}: ${money(o.v)} em ${o.n} processo(s)` })), { fmt: moneyCurto })}</section>
    </div>
    ${naoEf.length ? bloco(`${ico("notificacao")} Ordem de pagamento não efetivada — conferir depósito`, naoEf, "crit", "Ordem expedida e o valor não caiu. É o primeiro lugar para olhar.") : ""}
    ${ordem.length ? bloco(`${ico("anexo")} Ordem de pagamento expedida`, ordem, "ok") : ""}
    ${cobrado.length ? bloco(`${ico("email")} Cobrado — aguarda ordem`, cobrado, "warn") : ""}
    ${bloco(`${ico("documento")} Entregue — ainda sem cobrança`, semCob, "neut", "Laudo protocolado e nenhuma cobrança enviada ainda. É daqui que sai a fila de cobrança.", semCob.length <= 60)}
    ${honPje.length ? `<section class="card"><h2>${ico("prancheta")} Intimações de honorários / alvará no PJe <span class="chip">${honPje.length}</span></h2>${honPje.map(c => rowHTML(c, { noComarca: true })).join("")}</section>` : ""}
    ${bloco(`${ico("escudo")} Justiça gratuita / AJG — sem cobrança ativa`, ajg, "neut", "Pagamento depende do Estado / fim do processo. Só acompanhar.", false)}
    ${pago.length ? bloco(`${ico("like")} Pago no mês`, pago, "ok", "", false) : ""}
    ${hist.length ? bloco(`${ico("salvar")} Pagos — histórico`, hist, "neut", "", false) : ""}`;
}
