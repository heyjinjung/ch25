$base = "http://localhost:8000"
$artifactDir = "C:\Users\JAVIS\ch\ch25\docs\v2_specs\00_sot_meta\artifacts\20260124\api"

# 1. Login
$adminPayload = @{ external_id = "admin"; password = "2026" } | ConvertTo-Json
$adminAuth = Invoke-RestMethod -Method Post -Uri "$base/api/auth/token" -ContentType "application/json" -Body $adminPayload
$adminHeaders = @{ Authorization = "Bearer $($adminAuth.access_token)" }

# 2. Get Lottery Config
try {
    $configs = Invoke-RestMethod -Method Get -Uri "$base/api/v2/admin/game/lottery/configs" -Headers $adminHeaders
    $config = $configs[0]
    $configId = $config.id
    
    if ($config.prizes.Count -eq 0) {
        Write-Error "No prizes found in config $configId"
        exit 1
    }
    $prize = $config.prizes[0]
    $prizeId = $prize.id
    Write-Host "Target Config: $($config.name) (ID: $configId), Prize: $($prize.label) (ID: $prizeId)"
}
catch {
    Write-Error "Get/Parse Config Failed: $($_.Exception.Message)"
    exit 1
}

# 3. Update Prize (Toggle weight +1)
$newWeight = $prize.weight + 1
$updatePayload = @{
    label         = $prize.label
    weight        = $newWeight
    stock         = $prize.stock
    reward_type   = $prize.rewardType
    reward_amount = $prize.rewardAmount
    is_active     = $prize.isActive
} | ConvertTo-Json

try {
    $updateResp = Invoke-RestMethod -Method Put -Uri "$base/api/v2/admin/game/lottery/config/$configId/prize/$prizeId" -ContentType "application/json" -Headers $adminHeaders -Body $updatePayload
    $updateResp | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 "$artifactDir\admin_game_config_update_response_v2.json"
    
    if ($updateResp.weight -eq $newWeight) {
        Write-Host "Game Config Update Success: Weight changed to $newWeight"
    }
    else {
        Write-Error "Game Config Update Mismatch"
    }
}
catch {
    Write-Error "Game Config Update Failed: $($_.Exception.Message)"
    $_.ErrorDetails.Message | Out-File -Encoding utf8 "$artifactDir\admin_game_config_update_error_v2.json"
    exit 1
}
