@echo off
REM Start Luxo Account Management Dev Server
REM This script starts the Next.js dev server and keeps it running

cd /d "c:\laragon\www\Luxo-Account-Management"

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Start the dev server and keep the window open
echo Starting Luxo Account Management Dev Server...
echo Server will run at http://localhost:3000
call npm run dev

REM If server shuts down unexpectedly, keep window open
pause
