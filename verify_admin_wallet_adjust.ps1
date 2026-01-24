$base = "http://localhost:8000"
$artifactDir = "C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\artifacts\20260124\api"

# 1. Login
$adminPayload = @{ external_id = "admin"; password = "2026" } | ConvertTo-Json
try {
    $adminAuth = Invoke-RestMethod -Method Post -Uri "$base/api/auth/token" -ContentType "application/json" -Body $adminPayload
    $adminToken = $adminAuth.access_token
    Write-Host "Admin Login Success"
}
catch {
    Write-Error "Admin Login Failed"
    exit 1
}
$adminHeaders = @{ Authorization = "Bearer $adminToken" }

# 2. Get User ID (Dynamic)
try {
    $users = Invoke-RestMethod -Method Get -Uri "$base/api/v2/admin/users" -Headers $adminHeaders
    if ($users.users.Count -eq 0) {
        Write-Error "No users found to adjust."
        exit 1
    }
    $targetUser = $users.users[0]
    $userId = $targetUser.id
    Write-Host "Target User: $($targetUser.nickname) (ID: $userId)"
}
catch {
    Write-Error "Get Users Failed: $($_.Exception.Message)"
    exit 1
}

# 3. Adjust Wallet
$adjustPayload = @{
    token_type = "VAULT"
    amount     = 500
    reason     = "API Verification Script"
} | ConvertTo-Json

try {
    $adjResp = Invoke-RestMethod -Method Post -Uri "$base/api/v2/admin/users/$userId/wallet/adjust" -ContentType "application/json" -Headers $adminHeaders -Body $adjustPayload
    $adjResp | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 "$artifactDir\admin_wallet_adjust_response_v2.json"
    Write-Host "Wallet Adjustment Success: $($adjResp.message)"
}
catch {
    Write-Error "Wallet Adjustment Failed: $($_.Exception.Message)"
    $_.ErrorDetails.Message | Out-File -Encoding utf8 "$artifactDir\admin_wallet_adjust_error_v2.json"
    exit 1
}
