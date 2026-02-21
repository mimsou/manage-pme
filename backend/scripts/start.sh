#!/bin/sh
set -e
if [ -z "$DATABASE_URL" ]; then
  echo "=============================================="
  echo "ERROR: DATABASE_URL is not set."
  echo ""
  echo "On Render:"
  echo "  1. Open Dashboard > manage-pme (Web Service) > Environment"
  echo "  2. Add: DATABASE_URL = (copy 'Internal Database URL' from manage-pme-db)"
  echo "  3. Save and redeploy"
  echo "=============================================="
  exit 1
fi
npx prisma migrate deploy

# Nest peut sortir main.js à la racine de dist/ ou dans dist/src/
if [ -f dist/main.js ]; then
  exec node dist/main.js
elif [ -f dist/src/main.js ]; then
  exec node dist/src/main.js
else
  echo "ERROR: No main.js found in dist. Contents of dist/:"
  ls -la dist/ 2>/dev/null || true
  exit 1
fi
