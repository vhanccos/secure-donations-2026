#!/usr/bin/env bash
# ==============================================================================
# Global Automated Test Runner — Plataforma de Donaciones Seguras
# NIST SP 800-207 Zero Trust & Acceptance Scenarios T01 to T14
# Fundación AQP-SOLIDARIA
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Active Configuration Defaults
export API_BASE_URL="${API_BASE_URL:-https://evft7i355m.execute-api.us-east-2.amazonaws.com/academic}"
export COGNITO_USER_POOL_ID="${COGNITO_USER_POOL_ID:-us-east-2_jSTLexY2N}"
export COGNITO_CLIENT_ID="${COGNITO_CLIENT_ID:-6qc17dq9iqpoqq8e4sk5doqpnn}"
export AWS_REGION="${AWS_REGION:-us-east-2}"

echo "=============================================================================="
echo "    Iniciando Suite Automatizada de Pruebas E2E (Tiers 1-4, T01-T14)"
echo "    Plataforma de Donaciones Seguras («Fundación AQP-SOLIDARIA»)"
echo "=============================================================================="
echo " Target API:     ${API_BASE_URL}"
echo " User Pool ID:   ${COGNITO_USER_POOL_ID}"
echo " App Client ID:  ${COGNITO_CLIENT_ID}"
echo " AWS Region:     ${AWS_REGION}"
echo " Directoria:     ${SCRIPT_DIR}"
echo "=============================================================================="
echo ""

# Verify prerequisites
if ! command -v node >/dev/null 2>&1; then
  echo "[-] ERROR: Node.js is required to execute the test harness." >&2
  exit 1
fi

NODE_VERSION=$(node -v)
echo "[+] Node.js detectado: ${NODE_VERSION}"

# Execute master runner
cd "${SCRIPT_DIR}"
node runner.js

EXIT_CODE=$?

if [ ${EXIT_CODE} -eq 0 ]; then
  echo "[+] Verificación exitosa: 100% de los casos T01 a T14 aprobados."
  exit 0
else
  echo "[-] Fallo en la suite de pruebas: exit code ${EXIT_CODE}."
  exit ${EXIT_CODE}
fi
