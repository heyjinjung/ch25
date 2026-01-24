$base = "http://localhost:5173" 
# Note: Using 5173 is for Frontend, but for API calls we should hit Backend (8000) directly if bypassing proxy, 
# OR hit 5173 if Vite proxy is reliable. 
# User examples used http://localhost:8000. I will use 8000 for direct backend verification to avoid Vite handling issues.
$base = "http://localhost:8000"

$artifactDir = "C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\artifacts\20260124\api"
if (-not (Test-Path -Path $artifactDir)) { New-Item -ItemType Directory -Path $artifactDir -Force }

# 1. Admin Login
$adminPayload = @{ external_id = "admin"; password = "2026" } | ConvertTo-Json
try {
    $adminAuth = Invoke-RestMethod -Method Post -Uri "$base/api/auth/token" -ContentType "application/json" -Body $adminPayload
    $adminToken = $adminAuth.access_token
    $adminAuth | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 "$artifactDir\admin_login_response.json"
    Write-Host "Admin Login Success"
} catch {
    Write-Error "Admin Login Failed: $($_.Exception.Message)"
    $_.ErrorDetails.Message | Out-File -Encoding utf8 "$artifactDir\admin_login_error.json"
    exit 1
}

$adminHeaders = @{ Authorization = "Bearer $adminToken" }

# 2. POST Marketing Message (V2)
$msgPayload = @{
    title = "API Verification Message"
    content = "Direct PowerShell verification of V2 CRM endpoint"
    target_type = "ALL"
    target_value = $null
    channels = @("INBOX")
} | ConvertTo-Json

try {
    $msgResponse = Invoke-RestMethod -Method Post -Uri "$base/api/v2/admin/marketing/messages" -ContentType "application/json" -Headers $adminHeaders -Body $msgPayload
    $msgResponse | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 "$artifactDir\crm_message_create_response_v2.json"
    Write-Host "CRM Message Create Success: $($msgResponse.id)"
} catch {
    Write-Error "CRM Message Create Failed: $($_.Exception.Message)"
    $_.ErrorDetails.Message | Out-File -Encoding utf8 "$artifactDir\crm_message_create_error_v2.json"
    exit 1
}

# 3. GET Messages List (Verify it appears)
try {
    $listResponse = Invoke-RestMethod -Method Get -Uri "$base/api/v2/admin/marketing/messages" -Headers $adminHeaders
    $listResponse | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 "$artifactDir\crm_message_list_response_v2.json"
    Write-Host "CRM Message List Success"
} catch {
    Write-Error "CRM Message List Failed: $($_.Exception.Message)"
    exit 1
}
