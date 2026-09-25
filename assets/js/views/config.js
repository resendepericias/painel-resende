/* ⚙️ Configuração — a chave do Trello e a senha da agenda ficam SÓ neste aparelho. */
import { APP } from "../config.js";
import { esc, ico, lsGet, lsSet } from "../util.js";
import { cred, salvaCred, apagaCred, urlAutorizar, quemSou, temCred } from "../trello.js";
import { senhaAgenda, salvaSenhaAgenda } from "../agenda.js";

export function render(el, d, { rerender, recarrega, agendaInfo }) {
  const c = cred() || {}; const retorno = location.origin + location.pathname;
  if (!c.key) c.key = lsGet("rpm.keyTmp", "");   // chave colada antes de autorizar não se perde
  el.innerHTML = `<section class="card">
    <h2>${ico("cadeado")} Trello — chave deste aparelho</h2>
    <div class="note">O site lê os quatro quadros direto do Trello, aqui no navegador. Nada passa por servidor nenhum. A chave fica só neste aparelho e pode ser cancelada a qualquer momento em <a href="https://trello.com/my/account" target="_blank" rel="noopener">trello.com/my/account → Aplicativos</a>. Use uma chave separada da que o Claude usa.</div>
    <ol class="passos">
      <li>Abra <a href="https://trello.com/power-ups/admin" target="_blank" rel="noopener">trello.com/power-ups/admin</a> → <b>Novo</b> → nome “Painel Resende”, área de trabalho a sua, e-mail seu → <b>Criar</b>. Depois entre em <b>Chave de API</b> → <b>Gerar uma nova chave de API</b>. Em <b>Origens permitidas</b>, cole: <code>${esc(retorno)}</code></li>
      <li>Cole a chave aqui:<br><input id="cfgKey" placeholder="chave de API (32 caracteres)" value="${esc(c.key || "")}" autocomplete="off" spellcheck="false"></li>
      <li>Clique em <b>Autorizar no Trello</b>. O Trello pergunta se permite; ao aceitar, ele volta para este site já com o token. (Se não voltar, copie o token da tela do Trello e cole abaixo.)<br>
        <button class="btn pri" id="cfgAuth">Autorizar no Trello</button> <button class="btn" id="cfgAuthManual">Ver o token para copiar</button><br>
        <input id="cfgToken" placeholder="token (cola aqui se o Trello não voltar sozinho)" value="${esc(c.token || "")}" autocomplete="off" spellcheck="false"></li>
    </ol>
    <div class="cx-acts"><button class="btn pri" id="cfgSalvar">Salvar e testar</button> ${temCred() ? `<button class="btn" id="cfgSair">Apagar chave deste aparelho</button>` : ""} <span class="hint" id="cfgMsg">${temCred() ? "chave guardada desde " + new Date(c.desde).toLocaleDateString("pt-BR") : "sem chave neste aparelho"}</span></div>
  </section>
  <section class="card">
    <h2>${ico("calendario")} Google Agenda — senha da agenda</h2>
    <div class="note">O navegador não consegue ler o endereço iCal do Google direto. Um robô gratuito do GitHub lê a agenda três vezes ao dia (6h, 12h e 18h), criptografa com uma senha e publica o arquivo cifrado junto do site. Aqui você informa a mesma senha (guardada só neste aparelho) para o site decifrar. Sem a senha, o site funciona normalmente, só sem agenda e sem lembretes.</div>
    <input id="cfgAgenda" type="password" placeholder="senha da agenda (a mesma cadastrada no GitHub)" value="${esc(senhaAgenda())}" autocomplete="off">
    <div class="cx-acts"><button class="btn pri" id="cfgAgendaSalvar">Salvar senha da agenda</button><span class="hint">${agendaInfo && agendaInfo.erro ? esc(agendaInfo.erro) : agendaInfo && agendaInfo.at ? "agenda lida em " + new Date(agendaInfo.at).toLocaleString("pt-BR") : ""}</span></div>
  </section>
  <section class="card">
    <h2>${ico("escudo")} Aparência e apresentação</h2>
    <div class="cx-acts">
      <button class="btn" id="cfgTema">${document.documentElement.dataset.theme === "light" ? "Usar tema escuro" : "Usar tema claro"}</button>
      <span class="hint">O modo apresentação (botão ${ico("escudo")} no topo) esconde nome de periciado e número de processo em toda a tela, para demonstrar o sistema sem expor dado de ninguém.</span>
    </div>
  </section>
  <section class="card">
    <h2>${ico("pessoa")} Atalho na tela inicial</h2>
    <div class="note"><b>iPhone:</b> abra no Safari → botão Compartilhar → <b>Adicionar à Tela de Início</b>. <b>Android:</b> Chrome → menu ⋮ → <b>Instalar aplicativo</b>. <b>Mac:</b> Safari → Arquivo → <b>Adicionar ao Dock</b>. O site guarda a última carga boa no aparelho: abre mesmo sem internet, com aviso “dados de <data/hora>”.</div>
    <div class="legend">Painel Resende ${APP.versao} · dados ao vivo do Trello e do Google Agenda · nenhum nome de periciado ou número de processo fica guardado no site.</div>
  </section>`;

  el.querySelector("#cfgAuth").onclick = () => {
    const key = el.querySelector("#cfgKey").value.trim();
    if (!key) { msg("cole a chave de API primeiro"); return; }
    lsSet("rpm.keyTmp", key);
    location.href = urlAutorizar(key, retorno);
  };
  el.querySelector("#cfgAuthManual").onclick = () => {
    const key = el.querySelector("#cfgKey").value.trim();
    if (!key) { msg("cole a chave de API primeiro"); return; }
    lsSet("rpm.keyTmp", key);
    window.open(urlAutorizar(key, ""), "_blank");   // o Trello mostra o token na tela; copiar e colar no campo abaixo
    msg("na tela do Trello, clique em Permitir, copie o token e cole no campo abaixo; depois Salvar e testar");
  };
  el.querySelector("#cfgSalvar").onclick = async () => {
    const key = el.querySelector("#cfgKey").value.trim(), token = el.querySelector("#cfgToken").value.trim();
    if (!key || !token) { msg("faltou a chave ou o token"); return; }
    salvaCred(key, token); msg("testando…");
    try { const eu = await quemSou(); msg(`conectado como ${eu.fullName || eu.username}. Carregando os quadros…`); await recarrega(); location.hash = "#hoje"; }
    catch (e) { msg("o Trello recusou (" + (e.status || e.message) + "). Confira a chave e o token."); }
  };
  const sair = el.querySelector("#cfgSair"); if (sair) sair.onclick = () => { if (confirm("Apagar a chave do Trello deste aparelho? (o token continua válido até você cancelar no Trello)")) { apagaCred(); rerender(); } };
  el.querySelector("#cfgAgendaSalvar").onclick = async () => { salvaSenhaAgenda(el.querySelector("#cfgAgenda").value); await recarrega({ soAgenda: true }); rerender(); };
  el.querySelector("#cfgTema").onclick = () => { const t = document.documentElement.dataset.theme === "light" ? "dark" : "light"; document.documentElement.dataset.theme = t; lsSet("rpm.tema", t); rerender(); };
  function msg(t) { el.querySelector("#cfgMsg").textContent = t; }
}
