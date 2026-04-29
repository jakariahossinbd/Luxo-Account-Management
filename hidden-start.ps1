$ErrorActionPreference = "SilentlyContinue"
$ProjectPath = "c:\laragon\www\Luxo-Account-Management"
$LogFile = "$ProjectPath\server.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Add-Content $LogFile
}

$Port = 3000

function Test-ServerRunning {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$Port" -TimeoutSec 2 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

if (Test-ServerRunning) {
    Write-Log "Server already running on port $Port"
    exit 0
}

Write-Log "Starting Luxo Dev Server on port $Port..."
Set-Location $ProjectPath
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory $ProjectPath -WindowStyle Hidden
Write-Log "Server started"