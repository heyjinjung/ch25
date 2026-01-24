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
        Write-Error "No users found."
        exit 1
    }
    $targetUser = $users.users[0]
    $userId = $targetUser.id
    Write-Host "Target User: $($targetUser.nickname) (ID: $userId)"
}
catch {
    Write-Error "Get Users Failed"
    exit 1
}

# 3. Create Deposit Log
$depositPayload = @{
    user_id  = $userId
    amount   = 50000
    kst_date = (Get-Date -Format "yyyy-MM-dd")
} | ConvertTo-Json

try {
    $depResp = Invoke-RestMethod -Method Post -Uri "$base/api/v2/admin/economy/deposits" -ContentType "application/json" -Headers $adminHeaders -Body $depositPayload
    $depResp | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 "$artifactDir\admin_cc_deposit_create_response_v2.json"
    Write-Host "CC Deposit Log Create Success: $($depResp.amount)"
}
catch {
    Write-Error "CC Deposit Create Failed: $($_.Exception.Message)"
    $_.ErrorDetails.Message | Out-File -Encoding utf8 "$artifactDir\admin_cc_deposit_create_error_v2.json"
    exit 1
}

# 4. List Deposits
try {
    $listResp = Invoke-RestMethod -Method Get -Uri "$base/api/v2/admin/economy/deposits" -Headers $adminHeaders
    $listResp | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 "$artifactDir\admin_cc_deposit_list_response_v2.json"
    Write-Host "CC Deposit List Success: Count $($listResp.Count)"
}
catch {
    Write-Error "CC Deposit List Failed"
    exit 1
}
