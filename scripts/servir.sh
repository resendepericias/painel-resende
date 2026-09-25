#!/bin/zsh
# Sobe o site localmente para testar antes de publicar e abre o navegador.
#   http://localhost:8765/?dev  → dados de teste (pasta dev/)
#   http://localhost:8765/      → Trello ao vivo (usa a chave guardada no navegador)
cd "$(dirname "$0")/.."
PORTA=8765
URL="http://localhost:$PORTA/?dev"
if lsof -nP -iTCP:$PORTA -sTCP:LISTEN >/dev/null 2>&1; then
  echo "O site já está no ar em $URL (abrindo no navegador)."
  open "$URL"
  exit 0
fi
echo "Site em $URL — para parar, aperte Ctrl+C."
( sleep 1; open "$URL" ) &
exec python3 -m http.server $PORTA --bind 127.0.0.1
