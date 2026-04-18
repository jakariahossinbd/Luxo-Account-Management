$port = 3001
$work = "C:\laragon\www\Luxo-Account-Management"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$nextCli = "C:\laragon\www\Luxo-Account-Management\node_modules\next\dist\bin\next"

try {
    $existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existing) {
        exit 0
    }

    if (-not (Test-Path $nodeExe) -or -not (Test-Path $nextCli)) {
        exit 1
    }

    Start-Process -FilePath $nodeExe -ArgumentList @($nextCli, 'dev', '-p', "$port") -WorkingDirectory $work -WindowStyle Hidden | Out-Null
    exit 0
} catch {
    exit 1
}