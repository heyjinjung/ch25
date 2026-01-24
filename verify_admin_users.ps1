$base = "http://localhost:8000"
$artifactDir = "C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\artifacts\20260124\api"

# 1. Admin Login (Reuse if token available, but safe to re-login)
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

# 2. GET Users List (V2)
try {
    $usersResponse = Invoke-RestMethod -Method Get -Uri "$base/api/v2/admin/users" -Headers $adminHeaders
    $usersResponse | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 "$artifactDir\admin_users_list_response_v2.json"
    Write-Host "Admin Users List Success: Retrieved $($usersResponse.Count) items"
}
catch {
    Write-Error "Admin Users List Failed: $($_.Exception.Message)"
    $_.ErrorDetails.Message | Out-File -Encoding utf8 "$artifactDir\admin_users_list_error_v2.json"
    exit 1
}
