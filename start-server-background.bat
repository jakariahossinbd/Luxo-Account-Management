@echo off
REM Luxo Account Management - Server Startup Script
REM This script runs in the background and automatically restarts the dev server if needed

setlocal enabledelayedexpansion

REM Run PowerShell script silently in background
powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "c:\laragon\www\Luxo-Account-Management\start-server-monitor.ps1"

endlocal
