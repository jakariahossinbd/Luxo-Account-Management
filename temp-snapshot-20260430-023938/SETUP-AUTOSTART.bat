@echo off
REM ========================================
REM Quick Start - Setup Autostart on Sign-In
REM This creates a user-level Run entry to auto-start the server
REM ========================================

echo.
echo ========================================
echo Luxo Account Management - Autostart Setup
echo ========================================
echo.
echo This will setup automatic server startup when you sign in to Windows.
echo.

REM Run the setup script directly; no admin elevation is required
powershell -ExecutionPolicy Bypass -File "c:\laragon\www\Luxo-Account-Management\setup-autostart.ps1"

pause
