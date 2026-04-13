$exe = "C:\Program Files\nodejs\node.exe"
$arg = 'C:\laragon\www\Luxo-Account-Management\node_modules\next\dist\bin\next dev'
$work = "C:\laragon\www\Luxo-Account-Management"

$proc = Start-Process $exe -ArgumentList $arg -WorkingDirectory $work -WindowStyle Hidden -PassThru
Start-Sleep 3
if ($proc.HasExited) {
    Write-Host "Process exited with code: $($proc.ExitCode)"
} else {
    Write-Host "Process started with PID: $($proc.Id)"
}