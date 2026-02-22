#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# validate-oss.sh — Validate UIC against any OSS repository
#
# Usage:
#   ./scripts/validate-oss.sh <repo-url> <framework>
#
# Example:
#   ./scripts/validate-oss.sh https://github.com/calcom/cal.com react
# ---------------------------------------------------------------------------

# ---- Usage ----------------------------------------------------------------

usage() {
  cat >&2 <<'EOF'
Usage: validate-oss.sh <repo-url> <framework>

Shallow-clones an OSS repository, runs `uic scan` and `uic name` against it,
and prints a summary report.

Arguments:
  repo-url    Git URL of the repository to validate (HTTPS or SSH)
  framework   Framework name passed to --framework (e.g. react, vue)

Examples:
  ./scripts/validate-oss.sh https://github.com/calcom/cal.com react
  ./scripts/validate-oss.sh https://github.com/nuxt/ui vue
  ./scripts/validate-oss.sh https://github.com/shadcn-ui/ui react
EOF
  exit 1
}

# ---- Argument validation --------------------------------------------------

if [[ $# -lt 2 ]]; then
  echo "Error: Missing required arguments." >&2
  echo "" >&2
  usage
fi

REPO_URL="$1"
FRAMEWORK="$2"

# ---- Resolve UIC binary ---------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UIC_BIN="$PROJECT_ROOT/packages/cli/dist/bin/uic.js"

if [[ ! -f "$UIC_BIN" ]]; then
  echo "Error: UIC binary not found at $UIC_BIN" >&2
  echo "" >&2
  echo "Build UIC first:" >&2
  echo "  cd $PROJECT_ROOT && pnpm build" >&2
  exit 1
fi

# ---- Create temp directory ------------------------------------------------

TMPDIR_BASE="$(mktemp -d)"
CLONE_DIR="$TMPDIR_BASE/repo"
MANIFEST="$TMPDIR_BASE/manifest.json"
NAMED="$TMPDIR_BASE/named-manifest.json"
SCAN_STDERR="$TMPDIR_BASE/scan-stderr.txt"

cleanup() {
  rm -rf "$TMPDIR_BASE"
}
trap cleanup EXIT

# ---- Shallow clone --------------------------------------------------------

echo "Cloning $REPO_URL (shallow)..."
if ! git clone --depth 1 "$REPO_URL" "$CLONE_DIR" 2>&1; then
  echo "Error: Failed to clone $REPO_URL" >&2
  exit 1
fi

REPO_NAME="$(basename "$REPO_URL" .git)"
echo "Cloned $REPO_NAME into $CLONE_DIR"
echo ""

# ---- Run scan -------------------------------------------------------------

echo "Running: uic scan --framework $FRAMEWORK ..."

START_TIME="$(date +%s)"
SCAN_EXIT=0
node "$UIC_BIN" scan "$CLONE_DIR" --framework "$FRAMEWORK" -o "$MANIFEST" 2>"$SCAN_STDERR" || SCAN_EXIT=$?
END_TIME="$(date +%s)"

DURATION=$(( END_TIME - START_TIME ))

# Count warnings from stderr
WARNING_COUNT=0
if [[ -f "$SCAN_STDERR" ]]; then
  WARNING_COUNT="$(grep -ci "warn" "$SCAN_STDERR" 2>/dev/null || true)"
fi

# If scan failed, print stderr and exit
if [[ "$SCAN_EXIT" -ne 0 ]]; then
  echo "" >&2
  echo "Scan FAILED (exit code $SCAN_EXIT)" >&2
  echo "--- stderr ---" >&2
  cat "$SCAN_STDERR" >&2
  echo "--- end stderr ---" >&2
  exit 1
fi

# ---- Extract manifest stats ----------------------------------------------

ELEMENT_COUNT="$(node -e "
  const fs = require('fs');
  const m = JSON.parse(fs.readFileSync('$MANIFEST', 'utf-8'));
  console.log(m.elements ? m.elements.length : 0);
")"

FILES_SCANNED="$(node -e "
  const fs = require('fs');
  const m = JSON.parse(fs.readFileSync('$MANIFEST', 'utf-8'));
  console.log(m.metadata && m.metadata.filesScanned ? m.metadata.filesScanned : 0);
")"

# ---- Run name -------------------------------------------------------------

echo "Running: uic name ..."

NAME_EXIT=0
node "$UIC_BIN" name "$MANIFEST" -o "$NAMED" 2>&1 || NAME_EXIT=$?

DUPLICATE_COUNT=0
if [[ "$NAME_EXIT" -eq 0 ]] && [[ -f "$NAMED" ]]; then
  DUPLICATE_COUNT="$(node -e "
    const fs = require('fs');
    const m = JSON.parse(fs.readFileSync('$NAMED', 'utf-8'));
    const ids = (m.elements || []).map(e => e.agentId);
    const seen = new Set();
    let dupes = 0;
    for (const id of ids) {
      if (seen.has(id)) dupes++;
      seen.add(id);
    }
    console.log(dupes);
  ")"
fi

# ---- Summary report -------------------------------------------------------

echo ""
echo "============================================"
echo "  UIC OSS Validation Report"
echo "============================================"
echo ""
echo "  Repository:       $REPO_URL"
echo "  Framework:        $FRAMEWORK"
echo "  Scan duration:    ${DURATION}s"
echo "  Files scanned:    $FILES_SCANNED"
echo "  Elements found:   $ELEMENT_COUNT"
echo "  Warnings:         $WARNING_COUNT"
echo ""
echo "  Naming exit code: $NAME_EXIT"
echo "  Duplicate IDs:    $DUPLICATE_COUNT"
echo ""

if [[ "$NAME_EXIT" -ne 0 ]]; then
  echo "  Status: NAMING FAILED"
elif [[ "$DUPLICATE_COUNT" -gt 0 ]]; then
  echo "  Status: PASS (with $DUPLICATE_COUNT duplicate IDs)"
else
  echo "  Status: PASS"
fi

echo ""
echo "  Manifest:         $MANIFEST"
echo "  Named manifest:   $NAMED"
echo "============================================"
