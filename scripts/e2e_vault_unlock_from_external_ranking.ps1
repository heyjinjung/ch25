param(
  [string]$ApiBase = "http://localhost:8000",
  [int]$UserId = 1,
  [int]$VaultSeedAmount = 10000,
  [int]$DepositBaseline = 0,
  [int]$DepositNew = 50000,
  [string]$MysqlRootPassword = "root",
  [string]$MysqlDatabase = "xmas_event_dev",
  [switch]$SkipDuplicateCheck
)

$ErrorActionPreference = "Stop"

# Make console output UTF-8 friendly (Windows PowerShell/Terminal).
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {
  # Best-effort only.
}

function Exec-MySql([string]$Sql) {
  $cmd = @(
    "docker compose exec -T db mysql",
    "-uroot",
    "-p$MysqlRootPassword",
    "-D $MysqlDatabase",
    "-N -B",
    "-e `"$Sql`""
  ) -join " "

  $out = Invoke-Expression $cmd
  return $out
}

function Post-ExternalRanking([int]$DepositAmount, [string]$Memo) {
  $uri = "$ApiBase/admin/api/external-ranking/"
  $payload = @(
    @{
      user_id = $UserId
      deposit_amount = $DepositAmount
      play_count = 0
      memo = $Memo
    }
  )

  # IMPORTANT: Don't pipe arrays into ConvertTo-Json (pipeline enumerates elements).
  # Use -InputObject to keep the JSON as a list.
  $json = ConvertTo-Json -InputObject $payload -Depth 10
  Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $json | Out-Null
}

Write-Host "[1/6] Resolve target user (user.id=$UserId)" -ForegroundColor Cyan
$userIdProvided = $PSBoundParameters.ContainsKey('UserId')
$exists = Exec-MySql "SELECT COUNT(*) FROM user WHERE id = $UserId;"
if ([int]$exists -lt 1) {
  if ($userIdProvided) {
    throw "No user found with id=$UserId. Re-run with an existing -UserId, or run without -UserId to auto-pick/create a user."
  }

  $picked = Exec-MySql "SELECT id FROM user ORDER BY id LIMIT 1;"
  if ($picked) {
    $UserId = [int]$picked
    Write-Host "Auto-picked user_id: $UserId" -ForegroundColor Yellow
  } else {
    Write-Host "No users found; creating an E2E user." -ForegroundColor Yellow
    $externalId = "e2e_" + [Guid]::NewGuid().ToString("N")
    Exec-MySql "INSERT INTO user (external_id, nickname, status, vault_locked_balance, vault_balance, cash_balance, created_at, updated_at) VALUES ('$externalId', 'E2E', 'ACTIVE', 0, 0, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP());" | Out-Null
    $newId = Exec-MySql "SELECT LAST_INSERT_ID();"
    if (-not $newId) {
      throw "Failed to create E2E user."
    }
    $UserId = [int]$newId
    Write-Host "Created E2E user: user_id=$UserId external_id=$externalId" -ForegroundColor Yellow
  }
}

Write-Host "Target user resolved: user_id=$UserId" -ForegroundColor Cyan

Write-Host "[2/6] Ensure eligibility (new_member_dice_eligibility upsert)" -ForegroundColor Cyan
Exec-MySql @"
INSERT INTO new_member_dice_eligibility (user_id, is_eligible, revoked_at, expires_at, created_at, updated_at)
VALUES ($UserId, 1, NULL, NULL, UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE
  is_eligible = 1,
  revoked_at = NULL,
  expires_at = NULL,
  updated_at = UTC_TIMESTAMP();
"@ | Out-Null

Write-Host "[3/6] Seed vault + reset cash + clear prior VAULT_UNLOCK ledger" -ForegroundColor Cyan
# Phase 1: vault_locked_balance is source of truth; vault_balance is legacy mirror.
Exec-MySql "UPDATE user SET vault_locked_balance = $VaultSeedAmount, vault_balance = $VaultSeedAmount, cash_balance = 0 WHERE id = $UserId;" | Out-Null
Exec-MySql "DELETE FROM user_cash_ledger WHERE user_id = $UserId AND reason = 'VAULT_UNLOCK';" | Out-Null

Write-Host "[4/6] Set external-ranking baseline (deposit_amount=$DepositBaseline)" -ForegroundColor Cyan
Post-ExternalRanking -DepositAmount $DepositBaseline -Memo "E2E baseline"

Write-Host "[5/6] Upsert deposit increase (deposit_amount=$DepositNew)" -ForegroundColor Cyan
Post-ExternalRanking -DepositAmount $DepositNew -Memo "E2E deposit increase"

Write-Host "[6/6] Verify in DB (vault->cash, 1 ledger row)" -ForegroundColor Cyan
$balances = Exec-MySql "SELECT vault_locked_balance, vault_balance, cash_balance FROM user WHERE id = $UserId;"
$ledgerCnt = Exec-MySql "SELECT COUNT(*) FROM user_cash_ledger WHERE user_id = $UserId AND reason = 'VAULT_UNLOCK';"
$ledgerLast = Exec-MySql "SELECT delta, balance_after, created_at FROM user_cash_ledger WHERE user_id = $UserId AND reason = 'VAULT_UNLOCK' ORDER BY id DESC LIMIT 1;"

"user balances: vault_locked_balance, vault_balance(mirror), cash_balance = $balances" | Write-Host
"ledger count (reason=VAULT_UNLOCK) = $ledgerCnt" | Write-Host
"ledger last: delta, balance_after, created_at = $ledgerLast" | Write-Host

$lockedBal = [int]($balances -split "\t")[0]
$mirrorBal = [int]($balances -split "\t")[1]
$cashBal = [int]($balances -split "\t")[2]

# Phase 1 tier logic (must match VaultService):
# - Tier A: deposit_delta >= 10,000 => unlock 5,000
# - Tier B: deposit_delta >= 50,000 => unlock 10,000
$depositDelta = [int]$DepositNew - [int]$DepositBaseline
$unlockTarget = 0
if ($depositDelta -ge 50000) {
  $unlockTarget = 10000
} elseif ($depositDelta -ge 10000) {
  $unlockTarget = 5000
}

if ($unlockTarget -le 0) {
  throw "Deposit delta is too small to trigger unlock. (deposit_delta=$depositDelta)"
}

$expectedUnlock = [Math]::Min([int]$VaultSeedAmount, [int]$unlockTarget)
$expectedLockedAfter = [int]$VaultSeedAmount - [int]$expectedUnlock

if ($lockedBal -ne $expectedLockedAfter) {
  throw "Verification failed: vault_locked_balance mismatch. (vault_locked_balance=$lockedBal, expected=$expectedLockedAfter)"
}
if ($mirrorBal -ne $expectedLockedAfter) {
  throw "Verification failed: vault_balance(mirror) mismatch. (vault_balance=$mirrorBal, expected=$expectedLockedAfter)"
}
if ($cashBal -lt $expectedUnlock) {
  throw "Verification failed: cash_balance is smaller than expected. (cash_balance=$cashBal, expected >= $expectedUnlock)"
}
if ([int]$ledgerCnt -ne 1) {
  throw "Verification failed: VAULT_UNLOCK ledger row count is not 1. (count=$ledgerCnt)"
}

if (-not $SkipDuplicateCheck) {
  Write-Host "Extra check: re-upsert with same deposit_amount (=$DepositNew) should not unlock again" -ForegroundColor Cyan
  Post-ExternalRanking -DepositAmount $DepositNew -Memo "E2E duplicate prevention"
  $ledgerCnt2 = Exec-MySql "SELECT COUNT(*) FROM user_cash_ledger WHERE user_id = $UserId AND reason = 'VAULT_UNLOCK';"
  "ledger count after duplicate upsert = $ledgerCnt2" | Write-Host
  if ([int]$ledgerCnt2 -ne 1) {
    throw "Duplicate prevention failed: ledger row count increased. (count=$ledgerCnt2)"
  }
}

Write-Host "OK: deposit increase triggered vault->cash unlock and created a ledger row" -ForegroundColor Green
