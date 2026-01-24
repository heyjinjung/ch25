$base = "http://localhost:8000"
$artifactDir = "C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\artifacts\20260124\api"

# 1. Login
$adminPayload = @{ external_id = "admin"; password = "2026" } | ConvertTo-Json
$adminAuth = Invoke-RestMethod -Method Post -Uri "$base/api/auth/token" -ContentType "application/json" -Body $adminPayload
$adminHeaders = @{ Authorization = "Bearer $($adminAuth.access_token)" }

# 2. Get User
$users = Invoke-RestMethod -Method Get -Uri "$base/api/v2/admin/users" -Headers $adminHeaders
$userId = $users.users[0].id

# 3. Grant Ticket
$grantPayload = @{
    user_id     = $userId
    ticket_type = "ROULETTE_TICKET"
    amount      = 5
    reason      = "API Verification Script"
} | ConvertTo-Json

try {
    $grantResp = Invoke-RestMethod -Method Post -Uri "$base/api/v2/admin/inventory/tickets" -ContentType "application/json" -Headers $adminHeaders -Body $grantPayload
    $grantResp | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 "$artifactDir\admin_inv_grant_response_v2.json"
    Write-Host "Inventory Grant Success: Granted 5 ROULETTE_TICKET"
}
catch {
    Write-Error "Inventory Grant Failed: $($_.Exception.Message)"
    $_.ErrorDetails.Message | Out-File -Encoding utf8 "$artifactDir\admin_inv_grant_error_v2.json"
    exit 1
}
