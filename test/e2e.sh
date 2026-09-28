#!/usr/bin/env bash
# FitnessPlan AI end-to-end tests — exercise core logic through realistic user flows via node.
set -euo pipefail
cd "$(dirname "$0")/.."
node test/run-e2e.js
