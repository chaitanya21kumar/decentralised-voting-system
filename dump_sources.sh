#!/usr/bin/env bash
OUT="src_snapshot_$(date +%Y%m%d_%H%M%S).txt"
echo "Writing $OUT …"

append () {
  local f="$1"
  printf "\n\n============ FILE: %s ============\n" "$f" >> "$OUT"
  cat "$f" >> "$OUT"
}

# Solidity + migrations
for f in contracts/**/*.sol migrations/**/*.js truffle-config.js; do
  [ -f "$f" ] && append "$f"
done

# React / API source
find app pages components lib models utils \
  -type f \( -name '*.js' -o -name '*.ts' -o -name '*.tsx' \) \
  | while read -r f; do append "$f"; done

# Key project configs
for f in middleware.ts next.config.js tailwind.config.js tsconfig.json package.json; do
  [ -f "$f" ] && append "$f"
done

echo "Done → $OUT"
