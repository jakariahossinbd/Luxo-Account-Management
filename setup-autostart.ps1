# Run this script as Administrator to create a scheduled task for Luxo dev server startup
# Right-click PowerShell and select "Run as administrator" then run this script

param(
    [string]$TaskName = "Luxo-DevServer-Startup",
    [string]$ScriptPath = "c:\laragon\www\Luxo-Account-Management\start-server-background.bat",
    [string]$LogPath = "c:\laragon\www\Luxo-Account-Management\task-setup.log"
)

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Add-Content $LogPath -ErrorAction SilentlyContinue
    Write-Host $Message
}

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Log "ERROR: This script must be run as Administrator"
    Write-Host "ERROR: Please run PowerShell as Administrator and try again"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Log "Setting up scheduled task for Luxo Dev Server Startup..."

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Log "Task '$TaskName' already exists. Removing old task..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create task trigger - Run at system startup with 30 second delay
$taskTrigger = New-ScheduledTaskTrigger -AtStartup -RandomDelay 00:00:30

# Create task action - Run the batch file
$taskAction = New-ScheduledTaskAction -Execute $ScriptPath

# Create task settings - Run with highest privileges, no timeout
$taskSettings = New-ScheduledTaskSettingsSet `
    -RunOnlyIfNetworkAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew

# Get current user
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

# Register the task
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Trigger $taskTrigger `
        -Action $taskAction `
        -Settings $taskSettings `
        -User $currentUser `
        -RunLevel Highest `
        -Force | Out-Null

    Write-Log "SUCCESS: Scheduled task created successfully!"
    Write-Log "Task Name: $TaskName"
    Write-Log "Script: $ScriptPath"
    Write-Log "Trigger: Run at system startup"
    Write-Host "`nThe dev server will now automatically start when Windows boots up."
}
catch {
    Write-Log "ERROR: Failed to create scheduled task: $_"
    Write-Host "ERROR: $($_)"
}

# Verify the task was created
$verifyTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($verifyTask) {
    Write-Log "Task verification: SUCCESS - Task is registered"
    Write-Host "`nScheduled task setup complete!"
    Write-Host "The dev server will automatically start on next Windows restart."
}
else {
    Write-Log "Task verification: FAILED - Could not verify task creation"
    Write-Host "ERROR: Could not verify task creation"
}

Read-Host "`nPress Enter to exit"
