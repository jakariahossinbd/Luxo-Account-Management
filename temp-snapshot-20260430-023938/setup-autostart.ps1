$runKeyPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$entryName = "Luxo-DevServer"
$command = 'wscript.exe //B //NoLogo "c:\laragon\www\Luxo-Account-Management\hidden-run.vbs"'

$existing = Get-ItemProperty -Path $runKeyPath -Name $entryName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Autostart already configured for Luxo Dev Server"
    exit 0
}

New-Item -Path $runKeyPath -Force | Out-Null
Set-ItemProperty -Path $runKeyPath -Name $entryName -Value $command

Write-Host "SUCCESS: Dev server will auto start on Windows login (port 3000, hidden mode)"