#!/usr/bin/env bash
set -euo pipefail

PREVIEW_URL="${PLAYWRIGHT_PREVIEW_URL:-https://8328-iyv3ygj9c1u47s4jkrv7c-d8ae796f.us3.manus.computer/}"
SESSION="enterprise-file-permissions"
TMP_DIR="${TMPDIR:-/tmp}/enterprise-file-permissions-${$}"
mkdir -p "$TMP_DIR"
cleanup() {
  playwright-cli -s="$SESSION" close >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

run() {
  playwright-cli -s="$SESSION" "$@" >/dev/null
}

snapshot() {
  local name="$1"
  playwright-cli -s="$SESSION" --raw snapshot > "$TMP_DIR/$name.yml"
}

assert_present() {
  local needle="$1"
  local file="$2"
  grep -Fq "$needle" "$TMP_DIR/$file" || {
    echo "FAIL: attendu dans $file : $needle" >&2
    exit 1
  }
}

assert_absent() {
  local needle="$1"
  local file="$2"
  if grep -Fq "$needle" "$TMP_DIR/$file"; then
    echo "FAIL: non attendu dans $file : $needle" >&2
    exit 1
  fi
}

run open --browser=chrome "$PREVIEW_URL"
run click "getByRole('button', { name: 'Refuser' })"
run click "getByRole('button', { name: 'Connexion' })"
run click "getByRole('button', { name: 'Lancer la session Démo &' })"
run click "getByRole('button', { name: 'Passer la visite' })"

# Contexte membre simple : Money Life depuis l’espace Communauté.
run click "getByRole('button', { name: 'Espace Personnel' })"
run click "getByRole('button', { name: 'Communauté' })"
snapshot member
assert_present "heading \"Money Life\"" member.yml
assert_present "button \"Assistance\"" member.yml
assert_absent "button \"Fichiers\"" member.yml
assert_absent "button \"Ajouter une application\"" member.yml
assert_absent "Prêt au téléchargement" member.yml

# Contexte administrateur : Cadre financier depuis le sélecteur d’entreprise.
run click "getByRole('button', { name: 'CA', exact: true })"
snapshot admin
assert_present "heading \"Cadre financier\"" admin.yml
assert_present "button \"Fichiers\"" admin.yml
assert_present "button \"Ajouter une application\"" admin.yml

# Vérifie que l’onglet d’administration des fichiers est réellement accessible.
run click "getByRole('button', { name: 'Fichiers' })"
snapshot admin-files
assert_present "E-books & Guides Inclus" admin-files.yml
assert_present "button \"Télécharger\"" admin-files.yml

printf '%s\n' "PASS: le membre ne voit pas les fichiers sensibles et l’administrateur peut ouvrir l’espace Fichiers."
