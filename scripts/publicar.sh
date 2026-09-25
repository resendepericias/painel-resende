#!/bin/zsh
# Publica o site: guarda a versão no git e sobe para o GitHub (o GitHub Pages publica sozinho em ~1 min).
# Uso: scripts/publicar.sh "o que mudou"
set -e
cd "$(dirname "$0")/.."
MSG="${1:-ajuste}"
git add -A
git commit -m "$MSG" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" || echo "nada novo para guardar"
git push origin main
echo "publicado. Em ~1 minuto o site atualiza."
