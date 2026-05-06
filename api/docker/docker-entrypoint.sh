#!/bin/sh
set -eu

PORT="${PORT:-4000}"
NODE_ENV="${NODE_ENV:-development}"

if [ "$NODE_ENV" = "production" ]; then
  echo "NODE_ENV=production: running build and start"
  pnpm build
  exec node dist/index.js
fi

echo "NODE_ENV=development: running dev mode"
exec pnpm dev
