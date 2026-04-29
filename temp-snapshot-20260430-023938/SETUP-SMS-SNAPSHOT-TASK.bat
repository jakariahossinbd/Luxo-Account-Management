@echo off
setlocal

set TASK_NAME=%~1
if "%TASK_NAME%"=="" set TASK_NAME=LuxoSmsMonthlySnapshot

set CRON_SECRET=%~2
if "%CRON_SECRET%"=="" (
  echo Usage: SETUP-SMS-SNAPSHOT-TASK.bat [TaskName] [CronSecret] [BaseUrl]
  echo Example: SETUP-SMS-SNAPSHOT-TASK.bat LuxoSmsMonthlySnapshot my-secret http://localhost:3000
  exit /b 1
)

set BASE_URL=%~3
if "%BASE_URL%"=="" set BASE_URL=http://localhost:3000

set PROJECT_ROOT=%~dp0

schtasks /Create /TN "%TASK_NAME%" /SC MONTHLY /D 1 /ST 00:10 /TR "cmd.exe /c cd /d \"%PROJECT_ROOT%\" ^&^& set SMS_SNAPSHOT_BASE_URL=%BASE_URL% ^&^& set SMS_SNAPSHOT_CRON_SECRET=%CRON_SECRET% ^&^& npm run sms:snapshot:monthly" /F

if errorlevel 1 (
  echo Failed to create scheduled task.
  exit /b 1
)

echo Scheduled task "%TASK_NAME%" created successfully.
echo It will run monthly on day 1 at 00:10.
exit /b 0
