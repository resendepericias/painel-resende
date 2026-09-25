#!/bin/zsh
# Sobe o site localmente para testar antes de publicar: http://localhost:8765/?dev  (dados de teste)  ou  http://localhost:8765/  (Trello ao vivo)
cd "$(dirname "$0")/.."
exec python3 -m http.server 8765 --bind 127.0.0.1
