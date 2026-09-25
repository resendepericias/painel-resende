# Painel Resende — Perícias Médicas

Painel pessoal da Priscila Resende, com a identidade visual da Resende Perícias Médicas. Lê os quatro quadros do Trello **ao vivo, direto no navegador**, e a Google Agenda por um robô gratuito do GitHub. Custo mensal zero. Independente do Claude: se o Claude sair do ar, o site continua abrindo e atualizando.

**Uso comercial:** é o trunfo de demonstração da empresa de organização processual. A Priscila abre o site na tela e mostra ao perito interessado, com o **modo apresentação** ligado (esconde nome de periciado e número de processo). O site não é enviado a ninguém.

## O que tem

- **Hoje (capa):** hoje + próximos 7 dias; lembretes (do Google Agenda, eventos com “Lembrete:” no título); pendências separadas em quatro blocos (laudo, complementar/impugnação, resposta a intimação, agendamento).
- **Caixa do dia:** cada anotação vira card na lista `📝 CAIXA DO DIA` do quadro PAINEL LAUDOS 2026. A rodada das 8h aplica no card do processo e arquiva o recado.
- **Laudo a fazer · Complementar/impugnação · Agendar · PJe/eproc · Cobrança · Visão geral** — tudo o que o painel anterior mostrava, com gráficos por comarca, por tema, por mês e valores a receber.
- **Busca de processo:** número (com ou sem pontuação) ou nome do periciado → ficha completa: em que quadro e lista está, andamento (bloco ACOMPANHAMENTO PROCESSUAL), tudo o que está escrito no card, valor, histórico de cobranças, ordem de pagamento, prazos e intimações do quadro PJE, links do Trello e do PJe/eproc.
- **Modo apresentação**, tema claro/escuro, atalho na tela inicial (PWA), última carga boa guardada no aparelho (abre sem internet, com aviso “dados de <data/hora>”).

## Como os dados chegam

| Fonte | Caminho | Onde fica a credencial |
|---|---|---|
| Trello (4 quadros) | navegador → `api.trello.com` (CORS liberado pelo Trello) | chave + token no `localStorage` do aparelho |
| Google Agenda | GitHub Actions lê o iCal secreto 3× ao dia (6h, 12h, 18h) → cifra (AES-256-GCM) → `data/agenda.enc.json` | senha da agenda no `localStorage`; a mesma senha no segredo `AGENDA_SENHA` do repositório |

Nenhum nome de periciado nem número de processo fica guardado no site: o repositório só tem a casca (visual e código) e a agenda cifrada.

## Regras herdadas do painel anterior

Estão em `assets/js/regras.js` e `assets/js/parse.js`, com comentários. Resumo:

- HOJE em horário de Brasília, nunca UTC.
- Laudo a fazer = listas de tema + 🎯 HOJE + filas ENTREGAR + 🖊️ PERÍCIA FEITA. Complementar/impugnação **não** entra: fila própria.
- Due: nas listas de tema e ENTREGAR = prazo de entrega; em ACEITAS = prazo para designar (só vence com o marcador INTIMADA P/ AGENDAR); nas listas 🗓️ de comarca = data da própria perícia. Due igual ou anterior à data da perícia do título não é prazo (aparece como “conferir”). Card entregue ignora o due.
- A fila de laudo da capa inclui prazo de laudo vencido que só existe no quadro PJE (marcado “só no PJe — conferir”).
- “Intimações vencidas” só recebe o que não é prazo de laudo.
- Trava: só aceita carga nova com pelo menos 70% dos cards da anterior, quadro a quadro.
- Cobrança: dias parado contados da última cobrança ou da entrega; ordem não efetivada em vermelho; valor sem valor lançado fica em branco.

## Estrutura

```
index.html                 casca
assets/css/app.css         identidade visual (tokens de cor da marca, tema escuro e claro)
assets/js/config.js        ids dos quadros, padrões de nome das listas
assets/js/util.js          datas em Brasília, formatação, IndexedDB
assets/js/trello.js        leitura ao vivo, trava de 70%, cache, Caixa do dia
assets/js/parse.js         leitura do título e da descrição dos cards
assets/js/regras.js        regras de negócio (filas, prazos, cobrança, agenda)
assets/js/agenda.js        agenda cifrada
assets/js/apresentacao.js  modo apresentação
assets/js/charts.js        gráficos SVG
assets/js/views/*.js       as abas, a ficha e a configuração
assets/brand/              logo, ícone, iconografia própria
scripts/agenda-fetch.mjs   robô da agenda (GitHub Actions)
scripts/servir.sh          testar localmente (http://localhost:8765/?dev usa dados de teste em dev/)
scripts/publicar.sh        guardar versão + publicar
.github/workflows/agenda.yml
dev/                       dados de teste — NÃO vai para o git (contém nomes e números)
```

## Publicar (primeira vez)

1. Criar conta no GitHub (nome e e-mail dela). Criar repositório `painel-resende`, **privado**.
2. No Mac: `git remote add origin https://github.com/<usuaria>/painel-resende.git && git push -u origin main`.
3. Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`. O endereço fica `https://<usuaria>.github.io/painel-resende/`. (Pages em repositório privado exige plano pago; se ficar público, tudo bem: o repositório não tem dado nenhum de periciado.)
4. Settings → Secrets and variables → Actions → *New repository secret*: `ICS_URL` (Google Agenda → Configurações da agenda → *Endereço secreto no formato iCal*) e `AGENDA_SENHA` (uma senha inventada na hora; a mesma vai no site, em Configuração).
5. Actions → *agenda* → *Run workflow* uma vez, para publicar a primeira agenda.
6. Abrir o site → Configuração: chave do Trello (power-ups/admin), Autorizar, senha da agenda. Repetir no celular. Adicionar à tela de início.

Depois disso, cada ajuste é `scripts/publicar.sh "o que mudou"`.

A agenda é lida 3× ao dia. Para ler agora: GitHub → Actions → *agenda* → *Run workflow*. Para mudar a frequência, editar o `cron` em `.github/workflows/agenda.yml` (horários em UTC; Brasília = UTC−3).

## Caixa do dia — protocolo da rodada das 8h

- Cards abertos em `📝 CAIXA DO DIA` são anotações pendentes. Nome: `[dd/mm hh:mm] Categoria — texto`; descrição com o texto completo, `Processo:` e `Origem: site do painel`.
- Aplicar = agir no **card do processo**: laudo entregue → card vai para FINANÇAS `🧾 ENTREGUE — AINDA SEM COBRANCA` com `[ENTREGUE dd/mm/aaaa]` no título; peticionei → card do PJE/EPROC vai para `✅ RESPONDIDO`; perícia feita → card sai de PROCESSOS para PAINEL LAUDOS `🖊️ PERICIA FEITA`; agendei → card sai de ACEITAS para a lista `🗓️` da comarca com `[COMARCA-DD-MM-AA]` no título; pagamento → FINANÇAS `✅ PAGO NO MES`; prazo novo → due do card.
- Depois de aplicar, a rodada escreve no card do processo um comentário com o que fez (e a data) e **arquiva** o recado da Caixa.
- O que não der para aplicar com segurança fica em `📝 CAIXA DO DIA`, com comentário explicando a dúvida, e reaparece no site. A lista `✅ CAIXA — APLICADAS` existe só como opção; o padrão é arquivar.
