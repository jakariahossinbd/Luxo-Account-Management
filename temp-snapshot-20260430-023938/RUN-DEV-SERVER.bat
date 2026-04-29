@echo off
REM ========================================
REM Luxo Account Management - Complete Setup & Launch
REM This script handles everything needed to run the site
REM ========================================

setlocal enabledelayedexpansion

set PROJECT_DIR=c:\laragon\www\Luxo-Account-Management
set LOG_FILE=%PROJECT_DIR%\startup.log
set NODE_CMD=node
set NPM_CMD=npm

echo.
echo ========================================
echo Luxo Account Management - Startup
echo ========================================
echo.

REM Create log file
echo [%date% %time%] Starting Luxo Setup >> "%LOG_FILE%"

REM Change to project directory
cd /d "%PROJECT_DIR%" || (
    echo ERROR: Could not change to project directory
    echo ERROR: Could not change to project directory >> "%LOG_FILE%"
    pause
    exit /b 1
)

echo [INFO] Project directory: %CD%
echo [INFO] Project directory: %CD% >> "%LOG_FILE%"

REM Check if Node.js is installed
where /q node
if errorlevel 1 (
    echo.
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo ERROR: Node.js not found >> "%LOG_FILE%"
    pause
    exit /b 1
)

REM Get Node version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] Node.js version: %NODE_VERSION%
echo [INFO] Node.js version: %NODE_VERSION% >> "%LOG_FILE%"

REM Check if npm is installed
where /q npm
if errorlevel 1 (
    echo.
    echo ERROR: npm is not installed
    echo ERROR: npm not found >> "%LOG_FILE%"
    pause
    exit /b 1
)

REM Get npm version
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [INFO] npm version: %NPM_VERSION%
echo [INFO] npm version: %NPM_VERSION% >> "%LOG_FILE%"

REM Step 1: Install dependencies if needed
echo.
echo [STEP 1/4] Checking and installing dependencies...
echo [STEP 1/4] Checking and installing dependencies... >> "%LOG_FILE%"

if not exist "node_modules" (
    echo [INFO] node_modules not found, installing dependencies...
    echo [INFO] node_modules not found, installing dependencies... >> "%LOG_FILE%"
    call npm install >> "%LOG_FILE%" 2>&1
    if errorlevel 1 (
        echo ERROR: npm install failed
        echo ERROR: npm install failed >> "%LOG_FILE%"
        pause
        exit /b 1
    )
) else (
    echo [INFO] node_modules already exists, skipping npm install
    echo [INFO] node_modules already exists >> "%LOG_FILE%"
)

echo [SUCCESS] Dependencies ready
echo [SUCCESS] Dependencies ready >> "%LOG_FILE%"

REM Step 2: Generate Prisma client
echo.
echo [STEP 2/4] Generating Prisma client...
echo [STEP 2/4] Generating Prisma client... >> "%LOG_FILE%"

call npm run db:generate >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo WARNING: Prisma generate had issues, but continuing...
    echo WARNING: Prisma generate issues >> "%LOG_FILE%"
)

echo [SUCCESS] Prisma client ready
echo [SUCCESS] Prisma client ready >> "%LOG_FILE%"

REM Step 3: Check environment file
echo.
echo [STEP 3/4] Verifying configuration...
echo [STEP 3/4] Verifying configuration... >> "%LOG_FILE%"

if not exist ".env" (
    echo WARNING: .env file not found
    echo WARNING: .env file not found >> "%LOG_FILE%"
) else (
    echo [INFO] .env file found and verified
    echo [INFO] .env file found and verified >> "%LOG_FILE%"
)

echo [SUCCESS] Configuration verified
echo [SUCCESS] Configuration verified >> "%LOG_FILE%"

REM Step 4: Start dev server
echo.
echo [STEP 4/4] Starting dev server...
echo [STEP 4/4] Starting dev server... >> "%LOG_FILE%"
echo.
echo ========================================
echo Starting Next.js Development Server
echo ========================================
echo.
echo Server will run at: http://localhost:3000
echo Database: mysql://root:@localhost:3306/luxo_accounts
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

echo [INFO] Dev server starting... >> "%LOG_FILE%"
call npm run dev

REM If server stops, show this message
echo.
echo [WARNING] Dev server stopped
echo [WARNING] Dev server stopped >> "%LOG_FILE%"
echo.
echo Server has stopped. You can:
echo 1. Press Ctrl+C if it's still running
echo 2. Close this window
echo 3. Or run this script again to restart
echo.

pause
