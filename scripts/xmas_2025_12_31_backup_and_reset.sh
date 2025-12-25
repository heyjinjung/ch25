#!/usr/bin/env bash
set -euo pipefail

# Runs:
# 1) DB backup via scripts/backup.sh
# 2) Post-season reset via scripts/reset_post_season.sql (TRUNCATE)
#
# Safety:
# - Requires explicit confirmation token.
# - Supports --dry-run.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DRY_RUN="0"
CONFIRM_TOKEN=""

usage() {
  cat <<'EOF'
Usage:
  scripts/xmas_2025_12_31_backup_and_reset.sh --confirm RESET_POST_SEASON
  scripts/xmas_2025_12_31_backup_and_reset.sh --dry-run

Options:
  --confirm <TOKEN>   Required. Must be RESET_POST_SEASON.
  --dry-run           Print commands without executing.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="1"
      shift
      ;;
    --confirm)
      CONFIRM_TOKEN="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2
      ;;
  esac
done

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "+ $*"
    return 0
  fi
  eval "$@"
}

cd "$REPO_ROOT"

if [[ "$DRY_RUN" != "1" && "$CONFIRM_TOKEN" != "RESET_POST_SEASON" ]]; then
  echo "ERROR: This script is destructive (TRUNCATE)." >&2
  echo "Re-run with: --confirm RESET_POST_SEASON" >&2
  exit 1
fi

if [[ ! -f "${REPO_ROOT}/scripts/backup.sh" ]]; then
  echo "ERROR: Missing scripts/backup.sh" >&2
  exit 1
fi

if [[ ! -f "${REPO_ROOT}/scripts/reset_post_season.sql" ]]; then
  echo "ERROR: Missing scripts/reset_post_season.sql" >&2
  exit 1
fi

echo "== Step 1/2: Backup database =="
run "bash \"${REPO_ROOT}/scripts/backup.sh\""

echo "== Step 2/2: Reset post-season tables (TRUNCATE) =="
# Note: the SQL file is on the host; we pipe it into the db container.
run "cat \"${REPO_ROOT}/scripts/reset_post_season.sql\" | docker compose exec -T db sh -lc 'export MYSQL_PWD=\"$MYSQL_ROOT_PASSWORD\"; mysql -u root \"$MYSQL_DATABASE\"'"

echo "DONE"
