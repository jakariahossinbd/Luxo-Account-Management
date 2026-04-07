@echo off
REM ========================================
REM Quick Start - Setup Autostart on Boot
REM This creates a Windows Task to auto-start the server
REM ========================================

echo.
echo ========================================
echo Luxo Account Management - Autostart Setup
echo ========================================
echo.
echo This will setup automatic server startup when Windows boots.
echo.

REM Create a PowerShell script to handle admin elevation
powershell -Command ^
"$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator'); ^
if (-not $isAdmin) { ^
    Write-Host 'INFO: Requesting administrator privileges...'; ^
    Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -NoExit -Command \"cd c:\laragon\www\Luxo-Account-Management; powershell -ExecutionPolicy Bypass -File setup-autostart.ps1\"' -Verb RunAs; ^
    exit; ^
} ^
Write-Host 'Running as Administrator...'; ^
powershell -ExecutionPolicy Bypass -File 'c:\laragon\www\Luxo-Account-Management\setup-autostart.ps1'"

pause
