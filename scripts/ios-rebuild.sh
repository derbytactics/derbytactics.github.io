#!/usr/bin/env bash
# Recompila la app en el iPhone con la última versión de la rama, de principio a fin.
# Uso (en el Mac, en la carpeta del proyecto, con el iPhone conectado):  npm run ios:rebuild
set -euo pipefail
cd "$(dirname "$0")/.."
BRANCH=claude/football-card-game-repo-q6v9z2

echo "▶ Carpeta: $(pwd)"
# Lo que cambia solo al compilar no debe impedir traer la versión nueva.
git checkout -- package.json package-lock.json 2>/dev/null || true
# app.json puede quedar retocado al compilar: se aparta (recuperable con «git stash pop»), no se pierde.
if ! git diff --quiet -- app.json; then
  git stash push -m "app.json antes de ios:rebuild" -- app.json
  echo "▶ Tus cambios en app.json quedan apartados (git stash list)."
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✖ Hay cambios sin guardar en esta carpeta (git status). Guárdalos o descártalos y vuelve a probar."
  git status --short
  exit 1
fi
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git merge --ff-only "origin/$BRANCH"
LOCAL=$(git rev-parse --short HEAD)
REMOTE=$(git rev-parse --short "origin/$BRANCH")
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "✖ La carpeta no ha quedado en la última versión ($LOCAL en vez de $REMOTE)."
  exit 1
fi
echo "▶ Versión del código: $(git log --oneline -1)"

npm install
rm -rf ios
npx expo prebuild --clean -p ios --no-install
npx expo run:ios --device --configuration Release

echo "✔ Hecho. En el menú lateral de la app debe poner: Versión $(node -p "require('./package.json').version") · $LOCAL"
