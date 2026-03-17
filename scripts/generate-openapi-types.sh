#!/usr/bin/env bash

set -euo pipefail

mkdir -p src/types/generated

generate_type() {
  local endpoint="$1"
  local fallback="$2"
  local output="$3"

  if [[ "${STRICT_OPENAPI_ENDPOINTS:-false}" == "true" ]]; then
    npx --yes openapi-typescript "${endpoint}/openapi" --output "${output}"
    return
  fi

  npx --yes openapi-typescript "${endpoint}/openapi" --output "${output}" || \
    npx --yes openapi-typescript "${fallback}/openapi" --output "${output}"
}

generate_type "${MATCHMAKING_ENDPOINT}" "https://text-vector-embeddings-mai.deno.dev" "src/types/generated/matchmaking.ts"
generate_type "${START_STOP_ENDPOINT}" "https://command-start-stop-main.deno.dev" "src/types/generated/start-stop.ts"
