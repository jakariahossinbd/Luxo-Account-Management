param(
    [string]$ProjectPath = "c:\laragon\www\Luxo-Account-Management",
    [int]$Port = 3000,
    [string]$LogFile = "$ProjectPath\server.log"
)

# Function to write log
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Add-Content $LogFile
    Write-Host "$timestamp - $Message"
}

# Initialize log
Write-Log "Starting Luxo Dev Server Monitor"
Write-Log "Project Path: $ProjectPath"

# Navigate to project
Set-Location $ProjectPath

# Check and install dependencies if needed
if (!(Test-Path "node_modules")) {
    Write-Log "Installing dependencies..."
    npm install
    Write-Log "Dependencies installed successfully"
}

# Function to check if server is running
function Test-ServerRunning {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port" -TimeoutSec 2 -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# Main monitoring loop
$serverProcess = $null
$restartCount = 0
$maxRestarts = 10
$restartWindow = 3600 # 1 hour in seconds

while ($true) {
    # Check if server process still exists
    if ($serverProcess) {
        if ($serverProcess.HasExited) {
            Write-Log "Server process exited unexpectedly. Restarting..."
            $restartCount++
            $serverProcess.Dispose()
            $serverProcess = $null
        }
    }

    # Start server if not running
    if (!$serverProcess) {
        if ($restartCount -ge $maxRestarts) {
            Write-Log "ERROR: Maximum restart attempts ($maxRestarts) exceeded. Please check the application."
            break
        }

        if ($restartCount -gt 0) {
            Write-Log "Restart attempt $restartCount of $maxRestarts"
            Start-Sleep -Seconds 5
        }

        Write-Log "Starting dev server..."
        try {
            $serverProcess = Start-Process -FilePath "npm" -ArgumentList "run dev" -PassThru -NoNewWindow -RedirectStandardOutput "$ProjectPath\npm.log"
            Write-Log "Server started with PID: $($serverProcess.Id)"
            Start-Sleep -Seconds 10
        }
        catch {
            Write-Log "ERROR: Failed to start server: $_"
            $serverProcess = $null
        }
    }

    # Periodic health check
    if (!(Test-ServerRunning)) {
        Write-Log "WARNING: Server health check failed. Server may be unresponsive."
    }

    Start-Sleep -Seconds 30
}
