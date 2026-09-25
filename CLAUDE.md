# Painel Resende — orientações para o Claude Code

- Site estático, sem build: HTML + CSS + ES modules. Não introduzir bundler, framework nem dependência de npm. O site precisa continuar abrindo sem internet (service worker) e sem o Claude.
- Idioma: português do Brasil em tudo (código comentado em pt-BR, textos de tela sem anglicismo).
- Identidade visual obrigatória (`assets/css/app.css`): dourado `#D6C399` para marca, títulos e destaque; fundo `#141A29` / `#163950`; texto `#ECE9E9`; ciano `#00C5CC` só para alerta/ação (vence hoje, botão). Vermelho fica reservado a atrasado/não efetivado. Ícones: usar a iconografia própria em `assets/brand/icones/` (função `ico()` em `util.js`), nunca biblioteca genérica.
- Regras de negócio ficam em `assets/js/regras.js` e `assets/js/parse.js`. Antes de mudar uma regra, ler o comentário dela: cada uma veio de uma rodada com a Priscila. Nada do que o painel antigo fazia pode se perder (lista no README).
- Modo apresentação: todo texto que possa conter nome de periciado ou número de processo passa por `T()` (`apresentacao.js`) antes de ir para a tela.
- Testar antes de publicar: `scripts/servir.sh` e abrir `http://localhost:8765/?dev` (dados de teste em `dev/`, fora do git). Sem `?dev`, o site usa a chave do Trello guardada no navegador.
- Publicar: `scripts/publicar.sh "mensagem"` (commit + push; o GitHub Pages atualiza sozinho). Ao mudar arquivos do shell, subir a versão em `sw.js` (`const V`) e em `config.js` (`APP.versao`).
- `dev/` e qualquer arquivo com nome de periciado ou número de processo nunca entram no git.
- Modelo: desenho, arquitetura e visual com o modelo mais forte; ajuste repetitivo (cor, texto, detalhe) pode usar modelo mais barato.
